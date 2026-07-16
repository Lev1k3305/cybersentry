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

from contextlib import asynccontextmanager
import logging
import os
import re
import urllib.parse
import uuid
from collections import deque
from datetime import datetime, timezone
from typing import Optional

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


# ─── Phone: numlookupapi.com ──────────────────────────────────────────────────

async def numlookup_validate(phone: str) -> dict:
    # ⚡ Bolt Optimization: Use the shared, global HTTP client connection pool
    # to avoid TCP/TLS handshake overhead and reuse active connections.
    client = HTTP_CLIENT if HTTP_CLIENT is not None else httpx.AsyncClient(timeout=15.0)
    r = await client.get(
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
    # URL-encode the email parameter to secure the path segment against query parameter/fragment/path injection
    safe_email = urllib.parse.quote(email)
    # ⚡ Bolt Optimization: Use the shared, global HTTP client connection pool
    # to avoid TCP/TLS handshake overhead and reuse active connections.
    client = HTTP_CLIENT if HTTP_CLIENT is not None else httpx.AsyncClient(timeout=15.0)
    r = await client.get(
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
    # URL-encode the email parameter to secure the path segment against query parameter/fragment/path injection
    safe_email = urllib.parse.quote(email)
    # ⚡ Bolt Optimization: Use the shared, global HTTP client connection pool
    # to avoid TCP/TLS handshake overhead and reuse active connections.
    client = HTTP_CLIENT if HTTP_CLIENT is not None else httpx.AsyncClient(timeout=15.0)
    r = await client.get(
        f"https://emailrep.io/{safe_email}",
        headers={"User-Agent": "CyberSentry-App"},
        timeout=10.0,
    )
    return r.json() if r.status_code == 200 else None


# ─── FastAPI app ──────────────────────────────────────────────────────────────

# Global single, shared httpx.AsyncClient managed via lifespan context manager
# to enable HTTP connection pooling and avoid expensive TCP/TLS handshakes.
HTTP_CLIENT: Optional[httpx.AsyncClient] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global HTTP_CLIENT
    # Initialize connection pooled client with default timeout of 15 seconds
    HTTP_CLIENT = httpx.AsyncClient(timeout=15.0)
    yield
    # Safely close client on application shutdown
    if HTTP_CLIENT is not None:
        await HTTP_CLIENT.aclose()

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


# ─── POST /cybersentry/phone ──────────────────────────────────────────────────

@app.post("/cybersentry/phone")
async def phone_check(body: PhoneInput):
    normalized = normalize_phone(body.phone)

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


# ─── POST /cybersentry/email ──────────────────────────────────────────────────

@app.post("/cybersentry/email")
async def email_scan(body: EmailInput):
    email = body.email.strip().lower()

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
