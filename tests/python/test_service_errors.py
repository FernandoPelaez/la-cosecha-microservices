"""Una dependencia caída no debe convertirse en credenciales inválidas."""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch, Mock
import requests
from flask import Flask

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "services/python-common"))
from security import install_security, current_user

class ServiceFailureTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        install_security(self.app, ["ADMIN"])
        self.app.add_url_rule("/protected", view_func=lambda: {"data": "ok"})

    def test_auth_outage_returns_503(self):
        with patch.dict("os.environ", {"SERVICE_KEY": "q" * 48}), patch("security.requests.get", side_effect=requests.ConnectionError):
            self.assertEqual(self.app.test_client().get("/protected", headers={"X-Service-Key": "q" * 48}).status_code, 503)

    def test_invalid_session_returns_401(self):
        response = Mock(status_code=401)
        with patch.dict("os.environ", {"SERVICE_KEY": "q" * 48}), patch("security.requests.get", return_value=response):
            self.assertEqual(self.app.test_client().get("/protected", headers={"X-Service-Key": "q" * 48}).status_code, 401)

    def test_upstream_503_is_not_a_permission_error(self):
        response = Mock(status_code=503)
        response.raise_for_status.side_effect = requests.HTTPError()
        with patch("security.requests.get", return_value=response), self.assertRaises(requests.HTTPError):
            current_user("Bearer fixture")
