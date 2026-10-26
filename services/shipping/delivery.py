"""Adaptación de validación de entregas: evidencia real, sin simulador de paquetería."""
from datetime import datetime, timezone
from urllib.parse import urlparse

def determinar_estado(estado_paqueteria, fecha_entrega):
    if estado_paqueteria == "entregado":
        return "validada" if fecha_entrega is not None else "rechazada"
    return "pendiente"

def validate_delivery(cur, shipment, data, operator_id=None):
    if not isinstance(data, dict):
        raise ValueError("El cuerpo debe ser un objeto JSON")
    if shipment["estado"] not in ("enviado", "en_transito"):
        raise ValueError("El envío debe estar en tránsito para validar su entrega")
    evidence = data.get("firma_evidencia", "")
    if not isinstance(evidence, str) or (not evidence.startswith("https://") or not urlparse(evidence).hostname) or len(evidence) > 1024:
        raise ValueError("Registra una URL HTTPS de evidencia de entrega")
    delivered = datetime.fromisoformat(str(data.get("fecha_entrega_real", "")).replace("Z", "+00:00"))
    if delivered.tzinfo is None or delivered > datetime.now(timezone.utc):
        raise ValueError("La fecha debe incluir zona horaria y no puede ser futura")
    if shipment.get("fecha_envio") and delivered.astimezone(timezone.utc).replace(tzinfo=None) < shipment["fecha_envio"]:
        raise ValueError("La entrega no puede ser anterior al envío")
    recipient = data.get("destinatario", "")
    if not isinstance(recipient, str) or not 3 <= len(recipient.strip()) <= 150:
        raise ValueError("Registra el nombre de quien recibió el paquete")
    if not isinstance(operator_id, int) or operator_id <= 0:
        raise ValueError("Falta el operador autenticado de la entrega")
    status = determinar_estado("entregado", delivered)
    cur.execute("INSERT INTO validacion_entrega(id_envio,fecha_entrega_real,firma_evidencia,estado,destinatario,id_operador) VALUES (%s,%s,%s,%s,%s,%s) ON DUPLICATE KEY UPDATE fecha_entrega_real=VALUES(fecha_entrega_real),firma_evidencia=VALUES(firma_evidencia),estado=VALUES(estado),destinatario=VALUES(destinatario),id_operador=VALUES(id_operador)",
        (shipment["id"], delivered.astimezone(timezone.utc).replace(tzinfo=None), evidence, status, recipient.strip(), operator_id))
    cur.execute("UPDATE envios SET estado='entregado' WHERE id=%s", (shipment["id"],))
    cur.execute("UPDATE pedidos p JOIN ventas v ON v.id_pedido=p.id SET p.estado='entregado' WHERE v.id=%s", (shipment["id_venta"],))
