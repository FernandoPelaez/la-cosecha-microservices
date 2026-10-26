"""Pruebas de reglas; no requieren servidor MySQL ni credenciales externas."""
import sys
import unittest
from pathlib import Path
from datetime import datetime, timezone, timedelta
from unittest.mock import Mock

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "services/suppliers"))
sys.path.insert(0, str(ROOT / "services/shipping"))
from validation import validar_proveedor_seguro
from delivery import validate_delivery

class SupplierTests(unittest.TestCase):
    def test_normalizes_optional_fields(self):
        data = {"nombre": " Proveedor prueba ", "rfc": ""}
        self.assertIsNone(validar_proveedor_seguro(data))
        self.assertEqual(data["nombre"], "Proveedor prueba")
        self.assertIsNone(data["rfc"])

    def test_rejects_invalid_contact(self):
        for key, value in [("correo", "no-correo"), ("telefono", "12"), ("rfc", "incorrecto")]:
            with self.subTest(key=key):
                self.assertIsNotNone(validar_proveedor_seguro({"nombre": "Proveedor", key: value}))

    def test_rejects_missing_name(self):
        self.assertIsNotNone(validar_proveedor_seguro({"nombre": " "}))

class DeliveryTests(unittest.TestCase):
    def setUp(self):
        self.cursor = Mock()
        self.shipment = {"id": 1, "id_venta": 2, "estado": "enviado", "fecha_envio": datetime(2020, 1, 1, 18)}

    def test_converts_timezone_before_comparing_with_shipment(self):
        validate_delivery(self.cursor, self.shipment, {"fecha_entrega_real": "2020-01-01T12:00:00-07:00", "firma_evidencia": "https://example.test/evidence/1", "destinatario": "Persona de prueba"}, operator_id=7)
        self.assertEqual(self.cursor.execute.call_count, 3)
        self.assertEqual(self.cursor.execute.call_args_list[0].args[1][1], datetime(2020, 1, 1, 19))

    def test_future_date_is_rejected_without_writes(self):
        with self.assertRaises(ValueError):
            validate_delivery(self.cursor, self.shipment, {"fecha_entrega_real": (datetime.now(timezone.utc)+timedelta(days=1)).isoformat(), "firma_evidencia": "https://example.test/evidence"})
        self.cursor.execute.assert_not_called()

    def test_evidence_requires_https_hostname(self):
        for url in ["http://example.test/x", "https://", "javascript:alert(1)"]:
            with self.subTest(url=url), self.assertRaises(ValueError):
                validate_delivery(self.cursor, self.shipment, {"fecha_entrega_real": "2020-01-02T12:00:00Z", "firma_evidencia": url})

    def test_already_delivered_cannot_be_rewritten(self):
        with self.assertRaises(ValueError):
            validate_delivery(self.cursor, {**self.shipment, "estado": "entregado"}, {})

if __name__ == "__main__":
    unittest.main()
