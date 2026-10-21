import asyncio
import unittest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient

from main import app, is_ip_safe, DomainInput


class TestDomainValidationAndSSRF(unittest.TestCase):

    def test_ip_ssrf_validation(self):
        # Private, loopback, multicast, link-local, CGNAT IPs must be blocked
        self.assertFalse(is_ip_safe("127.0.0.1"))
        self.assertFalse(is_ip_safe("10.0.0.1"))
        self.assertFalse(is_ip_safe("172.16.0.1"))
        self.assertFalse(is_ip_safe("192.168.1.1"))
        self.assertFalse(is_ip_safe("169.254.169.254"))
        self.assertFalse(is_ip_safe("100.64.1.1"))  # CGNAT
        self.assertFalse(is_ip_safe("0.0.0.0"))
        self.assertFalse(is_ip_safe("2130706433"))  # 127.0.0.1 as int
        self.assertFalse(is_ip_safe("0x7f000001"))  # 127.0.0.1 as hex
        self.assertFalse(is_ip_safe("::1"))
        self.assertFalse(is_ip_safe("fc00::1"))
        self.assertFalse(is_ip_safe("224.0.0.1"))

        # Public IPs must be allowed
        self.assertTrue(is_ip_safe("8.8.8.8"))
        self.assertTrue(is_ip_safe("1.1.1.1"))
        self.assertTrue(is_ip_safe("104.21.14.88"))
        self.assertTrue(is_ip_safe("2606:4700:4700::1111"))

    def test_domain_input_validation(self):
        # Valid domain names
        self.toEqualDomain("example.com", "example.com")
        self.toEqualDomain("SUB.DOMAIN.CO.UK", "sub.domain.co.uk")
        self.toEqualDomain("test-domain.org.", "test-domain.org")

        # Invalid URL schemes / path inputs / IP literals
        self.assertInvalidDomain("http://example.com")
        self.assertInvalidDomain("https://example.com/path")
        self.assertInvalidDomain("example.com:8080")
        self.assertInvalidDomain("user:pass@example.com")
        self.assertInvalidDomain("127.0.0.1")
        self.assertInvalidDomain("0x7f000001")
        self.assertInvalidDomain("2130706433")
        self.assertInvalidDomain("192.168.0.1")
        self.assertInvalidDomain("invalid_domain")

    def toEqualDomain(self, raw, expected):
        inp = DomainInput(domain=raw)
        self.assertEqual(inp.domain, expected)

    def assertInvalidDomain(self, raw):
        with self.assertRaises(ValueError):
            DomainInput(domain=raw)


class TestDomainEndpoint(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)

    @patch("main.fetch_doh_records")
    @patch("main.fetch_tls_cert")
    @patch("main.fetch_rdap_info")
    def test_domain_check_partial_source_failure(self, mock_rdap, mock_tls, mock_doh):
        # Test partial failure: RDAP and TLS fail/timeout, DNS succeeds
        async def doh_side_effect(domain, record_type):
            if record_type == "A":
                return "ok", [{"name": domain, "type": "A", "TTL": 300, "data": "93.184.216.34"}], None
            return "ok", [], None

        mock_doh.side_effect = doh_side_effect
        mock_tls.return_value = ("timeout", None, "Таймаут подключения по TLS (443)")
        mock_rdap.return_value = ("error", None, "RDAP сервер вернул код 500")

        response = self.client.post("/cybersentry/domain", json={"domain": "partial-fail.com"})
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(data["domain"], "partial-fail.com")
        self.assertEqual(data["dns"]["status"], "ok")
        self.assertEqual(data["tls"]["status"], "timeout")
        self.assertEqual(data["rdap"]["status"], "error")
        # Risk score increased due to failed TLS
        self.assertGreaterEqual(data["riskScore"], 20)

    @patch("main.fetch_doh_records")
    @patch("main.fetch_tls_cert")
    @patch("main.fetch_rdap_info")
    def test_domain_check_success(self, mock_rdap, mock_tls, mock_doh):
        # Mock DoH responses for A, AAAA, MX, NS, TXT, DMARC
        async def doh_side_effect(domain, record_type):
            if record_type == "A":
                return "ok", [{"name": domain, "type": "A", "TTL": 300, "data": "93.184.216.34"}], None
            if record_type == "TXT" and "_dmarc" in domain:
                return "ok", [{"name": domain, "type": "TXT", "TTL": 300, "data": "v=DMARC1; p=reject;"}], None
            if record_type == "TXT":
                return "ok", [{"name": domain, "type": "TXT", "TTL": 300, "data": "v=spf1 include:_spf.example.com ~all"}], None
            return "ok", [], None

        mock_doh.side_effect = doh_side_effect
        mock_tls.return_value = ("ok", {"subject": "example.com", "issuer": "DigiCert"}, None)
        mock_rdap.return_value = ("ok", {"registrar": "Example Registrar", "registrationDate": "2020-01-01"}, None)

        response = self.client.post("/cybersentry/domain", json={"domain": "example.com"})
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(data["domain"], "example.com")
        self.assertEqual(data["riskLabel"], "safe")
        self.assertEqual(data["dns"]["status"], "ok")
        self.assertEqual(data["spf"]["status"], "ok")
        self.assertEqual(data["dmarc"]["status"], "ok")
        self.assertEqual(data["tls"]["status"], "ok")
        self.assertEqual(data["rdap"]["status"], "ok")

    @patch("main.fetch_doh_records")
    def test_domain_check_blocked_ssrf(self, mock_doh):
        async def doh_side_effect(domain, record_type):
            if record_type == "A":
                return "blocked", [], "Заблокирован недопустимый или внутренний IP-адрес: 127.0.0.1"
            return "ok", [], None

        mock_doh.side_effect = doh_side_effect

        response = self.client.post("/cybersentry/domain", json={"domain": "internal.local"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("Заблокирован", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()
