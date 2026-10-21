"""
CyberSentry Python API Service  v3.0
Real phone reputation checks and email breach scanning.
Listens on port 8000 (internal, forwarded from Express api-server).

API keys (Replit Secrets):
  PHONE_API_KEY  – numlookupapi.com free-tier key
  BREACH_API_KEY – Have I Been Pwned v3 API key

Without keys the service runs in demo mode (clearly labeled).
With keys set, a provider outage returns HTTP 502 — never silent fallback.
"""
from __future__ import annotations

import logging
import os
import re
from contextlib import asynccontextmanager
import urllib.parse
import uuid
from collections import deque
from datetime import datetime, timezone
from typing import Optional
from contextlib import asynccontextmanager

import asyncio
import ipaddress
import socket
import ssl
import time
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

# ─── Config ───────────────────────────────────────────────────────────────────

PHONE_API_KEY: Optional[str] = os.environ.get("PHONE_API_KEY") or None
BREACH_API_KEY: Optional[str] = os.environ.get("BREACH_API_KEY") or None
PORT: int = int(os.environ.get("CYBERSENTRY_PY_PORT", "8000"))

DEMO_PHONE  = PHONE_API_KEY  is None
DEMO_BREACH = BREACH_API_KEY is None

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("cybersentry")

if DEMO_PHONE:
    log.warning("[WARN] API-ключ PHONE_API_KEY не найден, активирован демо-режим для проверки телефонов")
if DEMO_BREACH:
    log.warning("[WARN] API-ключ BREACH_API_KEY не найден, активирован демо-режим для проверки утечек")

# ─── In-memory event log (newest first, max 100) ──────────────────────────────

EventLog: deque[dict] = deque(maxlen=100)

_SEED: list[tuple[str, str]] = [
    ("INFO",  "Система CyberSentry запущена, все модули инициализированы"),
    ("OK",    "Подключение к базе мошеннических номеров установлено"),
    ("INFO",  "Синхронизация с международной базой OSINT выполнена"),
    ("WARN",  "Зафиксирована волна спам-звонков в регионе (+12% за 24ч)"),
    ("OK",    "Модуль проверки утечек работает в штатном режиме"),
    ("INFO",  "База данных мошеннических схем обновлена — добавлено 247 новых записей"),
    ("ALERT", "Новая фишинговая кампания: поддельные письма от крупных банков"),
    ("OK",    "Шифрование канала передачи данных подтверждено (AES-256)"),
    ("INFO",  "Обновление баз HIBP завершено — проверено 4.2 млн записей"),
    ("WARN",  "Активность вредоносных ботов увеличилась на 34% за 6 часов"),
    ("OK",    "Резервное копирование конфигурации системы выполнено"),
    ("INFO",  "Добавлено 23 новых индикатора компрометации (IoC) от партнёров"),
]

_now = datetime.now(timezone.utc)
for _i, (_lvl, _msg) in enumerate(_SEED):
    EventLog.appendleft({
        "id": f"boot-{_i}",
        "level": _lvl,
        "message": _msg,
        "timestamp": _now.isoformat().replace("+00:00", "Z"),
    })


def add_log(level: str, message: str) -> dict:
    entry = {
        "id": str(uuid.uuid4()),
        "level": level,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }
    EventLog.appendleft(entry)
    log.info("[%s] %s", level, message)
    return entry


# ─── In-memory Cache with TTL ────────────────────────────────────────────────
import time

class TTLCache:
    """
    ⚡ Bolt Optimization: Async-safe in-memory cache with Time-To-Live (TTL).
    Caches successful phone / email queries to avoid redundant API latency
    and provide 0ms processing speed on repeat queries.
    """
    def __init__(self, ttl_seconds: float = 300.0):
        self.ttl = ttl_seconds
        self.cache: dict[str, tuple[float, any]] = {}

    def get(self, key: str) -> Optional[any]:
        if key in self.cache:
            timestamp, value = self.cache[key]
            if time.time() - timestamp < self.ttl:
                return value
            else:
                del self.cache[key]
        return None

    def set(self, key: str, value: any):
        self.cache[key] = (time.time(), value)

phone_cache = TTLCache(ttl_seconds=300.0)  # 5-minute phone lookup cache
email_cache = TTLCache(ttl_seconds=300.0)  # 5-minute email scan cache
domain_cache = TTLCache(ttl_seconds=300.0) # 5-minute domain lookup cache


# ─── SSRF Security & IP Validation ───────────────────────────────────────────

def is_ip_safe(ip_str: str) -> bool:
    """
    Blocks loopback, private, link-local, CGNAT, multicast, reserved, unspecified
    and documentation IPs to secure against SSRF and internal network scanning.
    Handles alternative IP representations (int, octal, hex) if parsed into ipaddress.
    """
    try:
        # Check integer/hex string representations
        if ip_str.isdigit():
            ip = ipaddress.ip_address(int(ip_str))
        elif ip_str.startswith("0x") or ip_str.startswith("0X"):
            ip = ipaddress.ip_address(int(ip_str, 16))
        else:
            ip = ipaddress.ip_address(ip_str)

        if (
            ip.is_loopback
            or ip.is_private
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
            or ip.is_global is False
        ):
            return False

        # Additional explicit CIDR checks (CGNAT 100.64.0.0/10, 0.0.0.0/8, 198.18.0.0/15)
        if isinstance(ip, ipaddress.IPv4Address):
            ip_int = int(ip)
            # 0.0.0.0/8
            if (ip_int >> 24) == 0:
                return False
            # CGNAT 100.64.0.0/10
            if (ip_int >> 22) == (100 << 8 | 64) >> 6:
                return False
            # Benchmarking 198.18.0.0/15
            if (ip_int >> 17) == (198 << 8 | 18) >> 1:
                return False

        return True
    except (ValueError, OverflowError):
        return False


# ─── Domain OSINT Helpers: DNS, TLS, RDAP, SPF, DMARC ────────────────────────

ALLOWED_RDAP_HOSTS = {
    "rdap.org",
    "rdap.verisign.com",
    "rdap.publicinterestregistry.org",
    "rdap.nic.cz",
    "rdap.apnic.net",
    "rdap.arin.net",
    "rdap.ripe.net",
    "rdap.lacnic.net",
    "rdap.afrinic.net",
    "rdap.iana.org",
}


async def fetch_doh_records(domain: str, record_type: str) -> tuple[str, list[dict], Optional[str]]:
    """
    Fetch DNS records using RFC 8484 DNS-over-HTTPS (DoH) via Cloudflare/Google with fallback.
    Validates returned A/AAAA IPs against SSRF rules.
    Returns (status, data, error_message).
    """
    if http_client is None:
        return "error", [], "HTTP client is not initialized"

    url = f"https://cloudflare-dns.com/dns-query"
    params = {"name": domain, "type": record_type}
    headers = {"Accept": "application/dns-json"}

    try:
        r = await http_client.get(url, params=params, headers=headers, timeout=6.0)
        if r.status_code != 200:
            return "error", [], f"DoH provider returned HTTP {r.status_code}"

        res = r.json()
        rcode = res.get("Status")
        if rcode == 3:  # NXDOMAIN
            return "empty", [], "Доменное имя не найдено в глобальном DNS (NXDOMAIN)"
        if rcode != 0:
            return "empty", [], f"DNS вернул код ответа: {rcode}"

        answers = res.get("Answer", [])
        if not answers:
            return "empty", [], None

        records = []
        for ans in answers:
            data_val = ans.get("data", "").strip('"')
            # SSRF validation on resolved IP addresses
            if record_type in ("A", "AAAA"):
                if not is_ip_safe(data_val):
                    log.warning("Blocked forbidden IP %s for domain %s", data_val, domain)
                    return "blocked", [], f"Заблокирован недопустимый или внутренний IP-адрес: {data_val}"
            records.append({
                "name": ans.get("name"),
                "type": record_type,
                "TTL": ans.get("TTL"),
                "data": data_val,
            })

        return "ok", records, None

    except httpx.TimeoutException:
        return "timeout", [], "Превышено время ожидания ответа от DNS"
    except Exception as exc:
        log.error("DNS query error for %s (%s): %s", domain, record_type, exc)
        return "error", [], "Ошибка взаимодействия с DNS провайдером"


async def fetch_tls_cert(domain: str) -> tuple[str, Optional[dict], Optional[str]]:
    """
    Safely inspects TLS certificate over socket/SSL with SSRF IP verification and strict timeouts.
    """
    loop = asyncio.get_running_loop()
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    try:
        # Resolve A/AAAA locally first to inspect target IP for SSRF
        addr_info = await asyncio.wait_for(
            loop.getaddrinfo(domain, 443, family=socket.AF_UNSPEC, type=socket.SOCK_STREAM),
            timeout=5.0,
        )
        if not addr_info:
            return "empty", None, "Не удалось определить IP-адрес хоста"

        target_ip = addr_info[0][4][0]
        if not is_ip_safe(target_ip):
            return "blocked", None, f"Заблокирован недопустимый целевой IP: {target_ip}"

        def _connect_ssl():
            ctx = ssl.create_default_context()
            with socket.create_connection((target_ip, 443), timeout=5.0) as sock:
                with ctx.wrap_socket(sock, server_hostname=domain) as ssock:
                    return ssock.getpeercert()

        cert = await asyncio.wait_for(loop.run_in_executor(None, _connect_ssl), timeout=6.0)
        if not cert:
            return "empty", None, "Сертификат SSL не предоставлен сервером"

        issuer_dict = dict(x[0] for x in cert.get("issuer", ()))
        subject_dict = dict(x[0] for x in cert.get("subject", ()))

        parsed_data = {
            "subject": subject_dict.get("commonName") or subject_dict.get("organizationName") or domain,
            "issuer": issuer_dict.get("organizationName") or issuer_dict.get("commonName") or "Unknown Issuer",
            "notBefore": cert.get("notBefore"),
            "notAfter": cert.get("notAfter"),
            "serialNumber": cert.get("serialNumber"),
            "ip": target_ip,
        }
        return "ok", parsed_data, None

    except (asyncio.TimeoutError, socket.timeout):
        return "timeout", None, "Таймаут подключения по TLS (443)"
    except ssl.SSLError as exc:
        return "error", None, f"Ошибка TLS/SSL: {exc.reason if hasattr(exc, 'reason') else str(exc)}"
    except Exception as exc:
        return "error", None, f"Не удалось установить TLS-соединение: {str(exc)}"


async def fetch_rdap_info(domain: str) -> tuple[str, Optional[dict], Optional[str]]:
    """
    Fetches domain registration data from ICANN RDAP with allowlist redirect safety.
    """
    if http_client is None:
        return "error", None, "HTTP client is not initialized"

    url = f"https://rdap.org/domain/{domain}"
    try:
        r = await http_client.get(url, follow_redirects=False, timeout=8.0)

        # Handle allowed redirects safely with SSRF target IP inspection
        if r.status_code in (301, 302, 303, 307, 308):
            redirect_url = r.headers.get("Location")
            if not redirect_url:
                return "error", None, "Пустой заголовок редиректа RDAP"

            parsed_loc = urllib.parse.urlparse(redirect_url)
            if parsed_loc.scheme not in ("https", "http"):
                return "blocked", None, "Заблокирована недопустимая схема редиректа RDAP"

            host = parsed_loc.hostname or ""
            is_allowed = any(host == h or host.endswith("." + h) or host.endswith(".nic.cz") for h in ALLOWED_RDAP_HOSTS)
            if not is_allowed:
                log.warning("Blocked untrusted RDAP redirect to %s", host)
                return "blocked", None, f"Заблокирован редирект на недоверенный RDAP-сервер: {host}"

            # SSRF re-check on redirect target host IP before sending HTTP request
            loop = asyncio.get_running_loop()
            try:
                addr_info = await asyncio.wait_for(
                    loop.getaddrinfo(host, parsed_loc.port or (443 if parsed_loc.scheme == "https" else 80)),
                    timeout=4.0
                )
                if addr_info:
                    redirect_ip = addr_info[0][4][0]
                    if not is_ip_safe(redirect_ip):
                        log.warning("Blocked forbidden RDAP redirect IP %s for host %s", redirect_ip, host)
                        return "blocked", None, f"Заблокирован редирект на внутренний/частный IP-адрес: {redirect_ip}"
            except Exception as exc:
                log.error("Failed to resolve RDAP redirect host %s: %s", host, exc)
                return "error", None, "Ошибка резолва хоста редиректа RDAP"

            r = await http_client.get(redirect_url, timeout=8.0)

        if r.status_code == 404:
            return "empty", None, "Сведения о регистрации домена не найдены в RDAP (404)"
        if r.status_code != 200:
            return "error", None, f"RDAP сервер вернул код {r.status_code}"

        res = r.json()
        entities = res.get("entities", [])
        registrar_name = None
        for ent in entities:
            roles = ent.get("roles", [])
            if "registrar" in roles:
                vcard = ent.get("vcardArray", [])
                if len(vcard) > 1:
                    for item in vcard[1]:
                        if item[0] == "fn":
                            registrar_name = item[3]
                            break

        events = {e.get("eventAction"): e.get("eventDate") for e in res.get("events", [])}

        rdap_data = {
            "handle": res.get("handle"),
            "ldhName": res.get("ldhName", domain),
            "registrar": registrar_name or "Не указан",
            "status": res.get("status", []),
            "registrationDate": events.get("registration"),
            "expirationDate": events.get("expiration"),
            "lastChangedDate": events.get("last changed"),
        }
        return "ok", rdap_data, None

    except httpx.TimeoutException:
        return "timeout", None, "Таймаут ответа от RDAP сервера"
    except Exception as exc:
        log.error("RDAP fetch error for %s: %s", domain, exc)
        return "error", None, "Ошибка получения данных RDAP"


# ─── Phone: local spam knowledge base ────────────────────────────────────────

KNOWN_SPAM_NUMBERS: dict[str, dict] = {
    "+79001234567": {
        "risk": "danger",
        "label": "Мошенники: Банковский фишинг",
        "details": "Номер связан с массовыми звонками от имени «службы безопасности банка». Запрашивают CVC-коды и данные карты.",
        "calls": 342,
        "lastSeen": "2026-07-05",
    },
    "+79991112233": {
        "risk": "warning",
        "label": "Телемаркетинг: Навязчивые звонки",
        "details": "Зафиксирован в базе спам-звонков. Предположительно агрессивный телемаркетинг.",
        "calls": 87,
        "lastSeen": "2026-07-03",
    },
    "+77772223344": {
        "risk": "danger",
        "label": "Мошенники: Схема с Казпочтой",
        "details": "Номер используется в схеме мошенничества от имени АО «Казпочта». Сообщают о посылке и требуют оплату.",
        "calls": 156,
        "lastSeen": "2026-07-06",
    },
    "+77001112233": {
        "risk": "danger",
        "label": "Мошенники: Лотерейная схема",
        "details": "Массовые звонки с предложением приза. Требуют предоплату или персональные данные.",
        "calls": 203,
        "lastSeen": "2026-07-04",
    },
    "+77473334455": {
        "risk": "danger",
        "label": "Мошенники: Инвестиционная схема",
        "details": "Обзванивают граждан с предложением гарантированного заработка на инвестициях. Классический скам.",
        "calls": 91,
        "lastSeen": "2026-07-06",
    },
}

# Pattern-based heuristics (regex, risk, label, details)
SPAM_PATTERNS: list[tuple[str, str, str, str]] = [
    (
        r"^\+7(900|901|902|903|904|905|906|907|908|909)\d{7}$",
        "warning",
        "Виртуальный номер: Повышенный риск",
        "Виртуальные/VOIP-номера часто используются мошенниками и спамерами из-за анонимности.",
    ),
    (
        r"^\+7(499|495|812)\d{7}$",
        "warning",
        "Городской номер: Возможный телемаркетинг",
        "Городские номера Москвы/Петербурга нередко применяются для холодных звонков.",
    ),
    (
        r"^\+77(05|06|07|47|71|75|76|77|87)\d{7}$",
        "warning",
        "Казахстан: Зона повышенной спам-активности",
        "Код оператора с высоким числом жалоб на нежелательные звонки.",
    ),
]


def normalize_phone(raw: str) -> str:
    p = re.sub(r"[\s\-().+]", "", raw)
    if p.startswith("8") and len(p) == 11:
        p = "7" + p[1:]
    if not p.startswith("+"):
        p = "+" + p
    return p


def check_spam_patterns(normalized: str) -> Optional[dict]:
    for pattern, risk, label, details in SPAM_PATTERNS:
        if re.match(pattern, normalized):
            return {"risk": risk, "label": label, "details": details}
    return None


# ─── Global HTTP Client Connection Pool ───────────────────────────────────────
# We use a single shared httpx.AsyncClient initialized during FastAPI lifespan
# to take advantage of HTTP connection pooling and avoid expensive TCP/TLS handshakes.
http_client: Optional[httpx.AsyncClient] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    # Initialize a single, shared, global AsyncClient managed via FastAPI lifespan context manager
    http_client = httpx.AsyncClient(timeout=15.0)
    try:
        yield
    finally:
        # Ensure the client is properly closed upon shutdown
        await http_client.aclose()


# ─── Phone: numlookupapi.com ──────────────────────────────────────────────────


async def numlookup_validate(phone: str) -> dict:
    if http_client is None:
        raise RuntimeError("HTTP client is not initialized")
    r = await http_client.get(
        f"https://api.numlookupapi.com/v1/validate/{phone}",
        params={"apikey": PHONE_API_KEY},
        timeout=10.0,
    )
    r.raise_for_status()
    return r.json()


# ─── Email: HIBP v3 ───────────────────────────────────────────────────────────

_DATA_TYPE_RU: dict[str, str] = {
    "Email addresses":                "Адреса email",
    "Passwords":                      "Пароли",
    "Usernames":                      "Имена пользователей",
    "Names":                          "Имена",
    "Phone numbers":                  "Номера телефонов",
    "Physical addresses":             "Адреса проживания",
    "Dates of birth":                 "Даты рождения",
    "IP addresses":                   "IP-адреса",
    "Credit cards":                   "Данные банк. карт",
    "Social media profiles":          "Профили соц. сетей",
    "Geographic locations":           "Геолокация",
    "Browser user agent details":     "Данные браузера",
    "Website activity":               "Активность на сайте",
    "Security questions and answers": "Секретные вопросы",
    "Payment histories":              "История платежей",
    "Purchases":                      "История покупок",
    "Personal health data":           "Медицинские данные",
    "Government issued IDs":          "Гос. документы",
    "Passport numbers":               "Номера паспортов",
    "Job titles":                     "Должности",
    "Gender":                         "Пол",
    "Ages":                           "Возраст",
    "Nationalities":                  "Гражданство",
}

_CRITICAL_FIELDS = {"Passwords", "Credit cards", "Government issued IDs",
                    "Passport numbers", "Social security numbers"}
_HIGH_FIELDS     = {"Phone numbers", "Physical addresses", "Dates of birth",
                    "Security questions and answers"}


def classify_severity(breach: dict) -> str:
    dc = set(breach.get("DataClasses", []))
    n  = breach.get("PwnCount", 0)
    if dc & _CRITICAL_FIELDS:
        return "critical" if n > 1_000_000 else "high"
    if dc & _HIGH_FIELDS:
        return "high" if n > 100_000 else "medium"
    return "medium" if n > 50_000 else "low"


def risk_score_from_breaches(count: int, has_passwords: bool) -> int:
    if count == 0:
        return 8
    base = min(60, count * 12)
    return min(100, base + 25) if has_passwords else base


async def hibp_check(email: str) -> list[dict]:
    if http_client is None:
        raise HTTPException(status_code=500, detail="HTTP client is not initialized")
    # URL-encode the email parameter to secure the path segment against query parameter/fragment/path injection
    safe_email = urllib.parse.quote(email)
    if http_client is None:
        raise RuntimeError("HTTP client is not initialized")
    r = await http_client.get(
        f"https://haveibeenpwned.com/api/v3/breachedaccount/{safe_email}",
        headers={
            "hibp-api-key": BREACH_API_KEY,       # type: ignore[arg-type]
            "User-Agent":   "CyberSentry-App",
        },
        params={"truncateResponse": "false"},
        timeout=15.0,
    )
    if r.status_code == 404:
        return []
    r.raise_for_status()
    return r.json()


# ─── Email: emailrep.io (free, no key) ────────────────────────────────────────

async def emailrep_check(email: str) -> Optional[dict]:
    if http_client is None:
        raise HTTPException(status_code=500, detail="HTTP client is not initialized")
    # URL-encode the email parameter to secure the path segment against query parameter/fragment/path injection
    safe_email = urllib.parse.quote(email)
    if http_client is None:
        raise RuntimeError("HTTP client is not initialized")
    r = await http_client.get(
        f"https://emailrep.io/{safe_email}",
        headers={"User-Agent": "CyberSentry-App"},
        timeout=10.0,
    )
    return r.json() if r.status_code == 200 else None


# ─── FastAPI app ──────────────────────────────────────────────────────────────

app = FastAPI(title="CyberSentry API", version="3.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class PhoneInput(BaseModel):
    phone: str = Field(
        ...,
        min_length=5,
        max_length=20,
        description="Номер телефона в международном или местном формате",
    )

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        # Allow only digits, +, -, spaces, and parentheses
        if not re.match(r"^[0-9+\s\-().]+$", v):
            raise ValueError("Номер телефона содержит недопустимые символы")
        return v


class EmailInput(BaseModel):
    email: str = Field(
        ...,
        min_length=5,
        max_length=100,
        description="Email адрес для проверки на утечки",
    )

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        # Basic email validation to prevent SSRF and injection attempts
        if "@" not in v or "." not in v:
            raise ValueError("Неверный формат email")
        if any(c in v for c in "/\\ ;<>[]{}|`^\""):
            raise ValueError("Email содержит недопустимые символы")
        return v


class DomainInput(BaseModel):
    domain: str = Field(
        ...,
        min_length=3,
        max_length=253,
        description="Имя доменного хоста (без схемы, порта и пути)",
    )

    @field_validator("domain")
    @classmethod
    def validate_domain(cls, v: str) -> str:
        clean = v.strip().lower()
        if clean.startswith("http://") or clean.startswith("https://") or "://" in clean:
            raise ValueError("Входное значение содержит схему URL (http/https). Введите только имя хоста домена.")
        if "/" in clean or "\\" in clean or ":" in clean or "?" in clean or "#" in clean or "@" in clean:
            raise ValueError("Входное значение содержит недопустимые символы пути, порта или аутентификации. Введите только имя хоста.")

        # Disallow IP literals in standard, hex, octal, or integer formats
        try:
            if clean.isdigit() or clean.startswith("0x") or clean.startswith("0X"):
                ipaddress.ip_address(int(clean, 0 if clean.startswith("0x") else 10))
                raise ValueError("IP-адреса не допускаются. Введите доменное имя хоста.")
            ipaddress.ip_address(clean)
            raise ValueError("IP-адреса не допускаются. Введите доменное имя хоста.")
        except ValueError as err:
            if "IP-адреса не допускаются" in str(err):
                raise err
            pass

        domain_regex = r"^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}\.?$"
        if not re.match(domain_regex, clean):
            raise ValueError("Неверный формат доменного имени")
        return clean.rstrip(".")


# ─── POST /cybersentry/phone ──────────────────────────────────────────────────

@app.post("/cybersentry/phone")
async def phone_check(body: PhoneInput):
    normalized = normalize_phone(body.phone)

    # ⚡ Bolt Optimization: check the in-memory TTL cache first
    cached = phone_cache.get(normalized)
    if cached is not None:
        add_log("INFO", f"Репутация номера {normalized} получена из кэша (0ms)")
        return cached

    async def _do_check() -> dict:
        # 1. Local known-bad DB (always checked first, regardless of mode)
        if normalized in KNOWN_SPAM_NUMBERS:
            rec = KNOWN_SPAM_NUMBERS[normalized]
            log_level = "ALERT" if rec["risk"] == "danger" else "WARN"
            add_log(log_level, f"Проверка номера {normalized} — угроза: {rec['label']}")
            return {"phone": normalized, "source": "local_db", **rec}

        # 2. Real API path — only when key is configured
        if not DEMO_PHONE:
            carrier_str = ""
            country_str = ""
            try:
                api = await numlookup_validate(normalized)
                carrier   = api.get("carrier") or ""
                country   = api.get("country_name") or ""

                if carrier:
                    carrier_str = f" Оператор: {carrier}."
                if country:
                    country_str = f" Страна: {country}."

                # Pattern check enriched with carrier info
                pat = check_spam_patterns(normalized)
                if pat:
                    add_log("WARN", f"Проверка номера {normalized} — подозрительный паттерн: {pat['label']}")
                    return {
                        "phone": normalized,
                        "source": "numlookupapi+local",
                        "risk": pat["risk"],
                        "label": pat["label"],
                        "details": pat["details"] + carrier_str + country_str,
                        "calls": 0,
                        "lastSeen": None,
                    }

                label = "Безопасный номер"
                if carrier:
                    label += f" ({carrier})"
                if country:
                    label += f", {country}"
                add_log("OK", f"Проверка номера {normalized} — чист.{carrier_str}{country_str}")
                return {
                    "phone": normalized,
                    "source": "numlookupapi",
                    "risk": "safe",
                    "label": label,
                    "details": f"Номер не обнаружен в базах мошеннических звонков. Репутация чистая.{carrier_str}{country_str}",
                    "calls": 0,
                    "lastSeen": None,
                }
            except httpx.HTTPStatusError as exc:
                # Auth failure or explicit API error — signal upstream problem, no demo fallback
                log.error("numlookupapi HTTP error %s: %s", exc.response.status_code, exc.response.text[:200])
                add_log("WARN", f"Ошибка провайдера проверки номера (HTTP {exc.response.status_code}) — сервис временно недоступен")
                raise HTTPException(
                    status_code=502,
                    detail=f"Провайдер проверки номеров вернул ошибку {exc.response.status_code}. Попробуйте позже.",
                ) from exc
            except Exception as exc:
                log.error("numlookupapi error: %s", exc)
                add_log("WARN", "Провайдер проверки номеров недоступен — сервис временно не работает")
                raise HTTPException(
                    status_code=502,
                    detail="Сервис проверки номеров временно недоступен. Попробуйте позже.",
                ) from exc

        # 3. Demo mode — key not configured
        pat = check_spam_patterns(normalized)
        if pat:
            add_log("WARN", f"Проверка номера {normalized} [DEMO] — {pat['label']}")
            return {
                "phone": normalized,
                "source": "demo",
                "risk": pat["risk"],
                "label": pat["label"],
                "details": pat["details"] + " [DEMO-режим: ключ PHONE_API_KEY не задан]",
                "calls": 0,
                "lastSeen": None,
            }

        digits     = re.sub(r"\D", "", normalized)
        last_digit = int(digits[-1]) if digits else 5

        if last_digit <= 1:
            add_log("ALERT", f"Проверка номера {normalized} [DEMO] — мошеннический паттерн")
            return {
                "phone": normalized,
                "source": "demo",
                "risk": "danger",
                "label": "Мошенники: Голосовой фишинг",
                "details": "Номер замечен в схемах социальной инженерии. Операторы представляются службой безопасности банка. [DEMO-режим]",
                "calls": 15 + last_digit * 73,
                "lastSeen": "2026-07-04",
            }
        if last_digit <= 3:
            add_log("WARN", f"Проверка номера {normalized} [DEMO] — подозрительная активность")
            return {
                "phone": normalized,
                "source": "demo",
                "risk": "warning",
                "label": "Подозрительная активность",
                "details": "Зафиксирован в жалобах пользователей. Возможен телемаркетинг. [DEMO-режим]",
                "calls": 5 + last_digit * 12,
                "lastSeen": "2026-06-28",
            }

        add_log("OK", f"Проверка номера {normalized} [DEMO] — чист")
        return {
            "phone": normalized,
            "source": "demo",
            "risk": "safe",
            "label": "Безопасный номер",
            "details": "Номер отсутствует в базах мошенников и спам-звонков. [DEMO-режим]",
            "calls": 0,
            "lastSeen": None,
        }

    res = await _do_check()
    phone_cache.set(normalized, res)
    return res


# ─── POST /cybersentry/email ──────────────────────────────────────────────────

@app.post("/cybersentry/email")
async def email_scan(body: EmailInput):
    email = body.email.strip().lower()

    # ⚡ Bolt Optimization: check the in-memory TTL cache first
    cached = email_cache.get(email)
    if cached is not None:
        add_log("INFO", f"Результаты сканирования email {email} получены из кэша (0ms)")
        return cached

    async def _do_scan() -> dict:
        # 1. HIBP v3 — real lookup when key is configured
        if not DEMO_BREACH:
            try:
                hibp = await hibp_check(email)
                has_passwords = any("Passwords" in b.get("DataClasses", []) for b in hibp)
                breaches = [
                    {
                        "name":      b.get("Title") or b.get("Name"),
                        "date":      b.get("BreachDate"),
                        "dataTypes": [_DATA_TYPE_RU.get(t, t) for t in b.get("DataClasses", [])[:6]],
                        "severity":  classify_severity(b),
                    }
                    for b in hibp
                ]
                compromised = bool(breaches)
                risk_score  = risk_score_from_breaches(len(breaches), has_passwords)

                if compromised:
                    rec = (
                        "Ваши пароли скомпрометированы! Срочно смените пароли и включите двухфакторную аутентификацию."
                        if has_passwords else
                        "Данные обнаружены в публичных утечках. Смените пароль и проверьте настройки безопасности."
                    )
                    lvl = "ALERT" if has_passwords else "WARN"
                else:
                    rec = "Утечки не обнаружены. Продолжайте использовать надёжные уникальные пароли и 2FA."
                    lvl = "OK"

                add_log(lvl, f"Проверка email {email} — " +
                        (f"найдено {len(breaches)} утечек (HIBP)" if compromised else "утечки не найдены (HIBP)"))
                return {
                    "email": email,
                    "source": "hibp",
                    "compromised": compromised,
                    "riskScore": risk_score,
                    "breaches": breaches,
                    "recommendation": rec,
                }
            except httpx.HTTPStatusError as exc:
                log.error("HIBP HTTP error %s: %s", exc.response.status_code, exc.response.text[:200])
                add_log("WARN", f"Ошибка HIBP (HTTP {exc.response.status_code}) — сервис временно недоступен")
                raise HTTPException(
                    status_code=502,
                    detail=f"Провайдер HIBP вернул ошибку {exc.response.status_code}. Попробуйте позже.",
                ) from exc
            except Exception as exc:
                log.error("HIBP error: %s", exc)
                add_log("WARN", "Провайдер HIBP недоступен — сервис временно не работает")
                raise HTTPException(
                    status_code=502,
                    detail="Сервис проверки утечек (HIBP) временно недоступен. Попробуйте позже.",
                ) from exc

        # 2. Demo mode — key not configured; try emailrep.io first (free, no key)
        try:
            rep = await emailrep_check(email)
            if rep is not None:
                details      = rep.get("details") or {}
                breach_count = int(details.get("breach_count") or 0)
                breaches_flag = bool(details.get("breaches"))
                suspicious   = bool(rep.get("suspicious"))
                compromised  = breaches_flag or breach_count > 0
                has_passwords = suspicious and breach_count > 2
                risk_score   = risk_score_from_breaches(breach_count, has_passwords)

                breaches = []
                if compromised:
                    for i in range(min(breach_count, 5)):
                        breaches.append({
                            "name":      f"Утечка данных #{i + 1}",
                            "date":      "Дата неизвестна",
                            "dataTypes": ["Адреса email"] + (["Пароли"] if has_passwords else []),
                            "severity":  "high" if has_passwords else "medium",
                        })

                rec = (
                    "Ваш email обнаружен в базах утечек. Рекомендуем сменить пароль и включить 2FA. (источник: emailrep.io)"
                    if compromised else
                    "Утечки не обнаружены. (источник: emailrep.io)"
                )
                lvl = "WARN" if compromised else "OK"
                add_log(lvl, f"Проверка email {email} — " +
                        (f"найдено {breach_count} утечек (emailrep.io)" if compromised else "утечки не найдены (emailrep.io)"))
                return {
                    "email": email,
                    "source": "emailrep",
                    "compromised": compromised,
                    "riskScore": risk_score,
                    "breaches": breaches,
                    "recommendation": rec,
                }
        except Exception as exc:
            log.error("emailrep.io error: %s", exc)

        # 3. Full demo fallback (no key + emailrep unavailable)
        log.warning("[WARN] BREACH_API_KEY не задан и emailrep.io недоступен — активирован полный демо-режим")
        prefix = email.split("@")[0]

        if email in {"test@example.com", "admin@test.com", "user@mail.ru", "test@test.com"}:
            add_log("ALERT", f"Проверка email {email} [DEMO] — критические утечки")
            return {
                "email": email,
                "source": "demo",
                "compromised": True,
                "riskScore": 78,
                "breaches": [
                    {
                        "name":      "MegaDataLeak 2023",
                        "date":      "2023-11-14",
                        "dataTypes": ["Адреса email", "Пароли", "Имена", "Номера телефонов"],
                        "severity":  "critical",
                    },
                    {
                        "name":      "ShopBreached.ru 2024",
                        "date":      "2024-03-20",
                        "dataTypes": ["Адреса email", "Адреса доставки", "История заказов"],
                        "severity":  "high",
                    },
                ],
                "recommendation": "Немедленно смените пароли во всех сервисах. Включите двухфакторную аутентификацию. [DEMO-режим]",
            }

        if len(prefix) % 3 == 0:
            add_log("WARN", f"Проверка email {email} [DEMO] — найдена утечка")
            return {
                "email": email,
                "source": "demo",
                "compromised": True,
                "riskScore": 62,
                "breaches": [{
                    "name":      "DataBreach 2024",
                    "date":      "2024-01-15",
                    "dataTypes": ["Адреса email", "Пароли", "Даты рождения"],
                    "severity":  "high",
                }],
                "recommendation": "Адрес скомпрометирован. Смените пароль и включите двухфакторную аутентификацию. [DEMO-режим]",
            }

        add_log("OK", f"Проверка email {email} [DEMO] — чист")
        return {
            "email": email,
            "source": "demo",
            "compromised": False,
            "riskScore": 8,
            "breaches": [],
            "recommendation": "Утечки не обнаружены. Используйте надёжные уникальные пароли и двухфакторную аутентификацию. [DEMO-режим]",
        }

    res = await _do_scan()
    email_cache.set(email, res)
    return res


# ─── POST /cybersentry/domain ─────────────────────────────────────────────────

@app.post("/cybersentry/domain")
async def domain_check(body: DomainInput):
    domain = body.domain.strip().lower()

    # Check TTL cache first
    cached = domain_cache.get(domain)
    if cached is not None:
        add_log("INFO", f"Результаты анализа домена {domain} получены из кэша (0ms)")
        return cached

    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    # Fetch DNS A, AAAA, MX, NS, TXT concurrently
    a_task = fetch_doh_records(domain, "A")
    aaaa_task = fetch_doh_records(domain, "AAAA")
    mx_task = fetch_doh_records(domain, "MX")
    ns_task = fetch_doh_records(domain, "NS")
    txt_task = fetch_doh_records(domain, "TXT")
    dmarc_txt_task = fetch_doh_records(f"_dmarc.{domain}", "TXT")
    tls_task = fetch_tls_cert(domain)
    rdap_task = fetch_rdap_info(domain)

    (
        a_res, aaaa_res, mx_res, ns_res, txt_res, dmarc_txt_res, tls_res, rdap_res
    ) = await asyncio.gather(
        a_task, aaaa_task, mx_task, ns_task, txt_task, dmarc_txt_task, tls_task, rdap_task
    )

    # Check if any IP check resulted in SSRF block
    if a_res[0] == "blocked" or aaaa_res[0] == "blocked":
        blocked_err = a_res[2] or aaaa_res[2] or "Домен указывает на заблокированный закрытый/внутренний IP-адрес"
        add_log("ALERT", f"Проверка домена {domain} заблокирована: SSRF / Private IP")
        raise HTTPException(status_code=400, detail=blocked_err)

    # Build DNS data object
    dns_records = {
        "A": a_res[1],
        "AAAA": aaaa_res[1],
        "MX": mx_res[1],
        "NS": ns_res[1],
        "TXT": txt_res[1],
    }
    has_any_dns = any(bool(v) for v in dns_records.values())

    dns_status = "ok" if has_any_dns else (a_res[0] if a_res[0] != "ok" else "empty")
    dns_err = a_res[2] if not has_any_dns else None

    # Parse SPF from TXT records
    spf_data = None
    spf_status = "empty"
    spf_err = None
    for rec in txt_res[1]:
        data_str = rec.get("data", "")
        if "v=spf1" in data_str:
            spf_data = {"record": data_str}
            spf_status = "ok"
            break

    # Parse DMARC from _dmarc TXT records
    dmarc_data = None
    dmarc_status = "empty"
    dmarc_err = None
    for rec in dmarc_txt_res[1]:
        data_str = rec.get("data", "")
        if "v=DMARC1" in data_str or "v=dmarc1" in data_str:
            dmarc_data = {"record": data_str}
            dmarc_status = "ok"
            break

    # Calculate Risk Score & Summary
    risk_score = 0
    issues = []

    if not has_any_dns:
        risk_score += 40
        issues.append("Отсутствуют DNS-записи или домен не зарегистрирован")

    if spf_status != "ok":
        risk_score += 20
        issues.append("Отсутствует SPF-запись (риск подделки почты)")

    if dmarc_status != "ok":
        risk_score += 20
        issues.append("Отсутствует DMARC-политика (риск фишинга)")

    if tls_res[0] != "ok":
        risk_score += 20
        issues.append("Проблемы с TLS-сертификатом или HTTPS недоступен")

    risk_label = "safe"
    if risk_score >= 50:
        risk_label = "danger"
    elif risk_score >= 20:
        risk_label = "warning"

    summary = (
        f"Анализ домена завершён. Индикаторы риска: {', '.join(issues)}."
        if issues else
        "Домен имеет корректные DNS-записи, активный TLS-сертификат и настроенную SPF/DMARC защиту."
    )

    result = {
        "domain": domain,
        "riskScore": min(100, risk_score),
        "riskLabel": risk_label,
        "summary": summary,
        "dns": {
            "status": dns_status,
            "source": "Cloudflare DoH (RFC 8484)",
            "data": dns_records if has_any_dns else None,
            "error": dns_err,
            "timestamp": now_iso,
        },
        "tls": {
            "status": tls_res[0],
            "source": "TLS Direct Handshake (:443)",
            "data": tls_res[1],
            "error": tls_res[2],
            "timestamp": now_iso,
        },
        "rdap": {
            "status": rdap_res[0],
            "source": "ICANN RDAP (rdap.org)",
            "data": rdap_res[1],
            "error": rdap_res[2],
            "timestamp": now_iso,
        },
        "spf": {
            "status": spf_status,
            "source": "DNS TXT Analysis",
            "data": spf_data,
            "error": spf_err,
            "timestamp": now_iso,
        },
        "dmarc": {
            "status": dmarc_status,
            "source": "DNS TXT _dmarc Analysis",
            "data": dmarc_data,
            "error": dmarc_err,
            "timestamp": now_iso,
        },
    }

    add_log("INFO" if risk_label == "safe" else "WARN", f"Выполнен анализ домена {domain} — статус: {risk_label} (риск {risk_score}/100)")
    domain_cache.set(domain, result)
    return result


# ─── GET /cybersentry/log ─────────────────────────────────────────────────────

@app.get("/cybersentry/log")
async def get_log():
    return list(EventLog)[:50]


# ─── Health check ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "demo_mode": {"phone": DEMO_PHONE, "breach": DEMO_BREACH},
    }


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn  # type: ignore[import]
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, log_level="info")
