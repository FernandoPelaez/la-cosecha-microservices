"""Servicio de logística recibido en Drive, adaptado a JSON y al esquema oficial."""

import os

from flask import Flask, request, jsonify, g
from mysql.connector import Error

from database import database
from security import install_security
from delivery import validate_delivery


app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 32768

install_security(app, {"ADMIN", "LOGISTICA"})

ALLOWED_STATES = {
    "pendiente": ["preparando"],
    "preparando": ["enviado"],
    "enviado": ["en_transito"],
    "en_transito": [],
    "entregado": [],
}


@app.errorhandler(ValueError)
def validation(error):
    return jsonify(error={"message": str(error)}), 422


@app.errorhandler(Error)
def database_error(_error):
    return jsonify(
        error={"message": "No fue posible completar la operación de logística"}
    ), 409


@app.get("/health")
def health():
    with database() as (_, cur):
        cur.execute("SELECT 1")
        cur.fetchone()

    return jsonify(data={"status": "ok"})


@app.get("/shipping")
def shipments():
    with database() as (_, cur):
        cur.execute(
            "SELECT e.*,d.calle_numero,d.colonia,d.ciudad,d.codigo_postal "
            "FROM envios e "
            "JOIN direcciones d ON d.id=e.id_direccion "
            "ORDER BY e.id DESC LIMIT 500"
        )

        return jsonify(data=cur.fetchall())


@app.patch("/shipping/<int:key>")
def update(key):
    data = request.get_json() or {}

    if not isinstance(data, dict):
        raise ValueError("El cuerpo debe ser un objeto JSON")

    for field in ("num_guia", "paqueteria"):
        if data.get(field) is not None and not isinstance(data[field], str):
            raise ValueError("La guía y paquetería deben ser texto")

        if isinstance(data.get(field), str):
            data[field] = data[field].strip()

    with database() as (_, cur):
        cur.execute(
            "SELECT * FROM envios WHERE id=%s FOR UPDATE",
            (key,),
        )

        shipment = cur.fetchone()

        if not shipment:
            return jsonify(error={"message": "Envío no encontrado"}), 404

        status = data.get("estado")

        if status not in ALLOWED_STATES.get(shipment["estado"], []):
            raise ValueError("Cambio de estado no permitido")

        guide = data.get("num_guia") or shipment["num_guia"]
        carrier = data.get("paqueteria") or shipment["paqueteria"]

        if status == "enviado" and (not guide or not carrier):
            raise ValueError("Registra la paquetería y el número de guía")

        if (guide and len(guide) > 150) or (carrier and len(carrier) > 150):
            raise ValueError("La guía o paquetería es demasiado larga")

        if status == "enviado":
            cur.execute(
                "SELECT estado FROM paquetes_logisticos WHERE id_envio=%s",
                (key,),
            )

            package = cur.fetchone()

            if not package or package["estado"] != "listo":
                raise ValueError(
                    "Completa el paquete logístico antes del envío"
                )

        cur.execute(
            "UPDATE envios "
            "SET estado=%s, "
            "num_guia=%s, "
            "paqueteria=%s, "
            "fecha_envio=IF(%s='enviado',UTC_TIMESTAMP(),fecha_envio) "
            "WHERE id=%s",
            (status, guide, carrier, status, key),
        )

        if status == "enviado":
            cur.execute(
                "UPDATE pedidos p "
                "JOIN ventas v ON v.id_pedido=p.id "
                "SET p.estado='enviado' "
                "WHERE v.id=%s "
                "AND p.estado IN ('pagado','preparacion')",
                (shipment["id_venta"],),
            )

    return jsonify(
        data={
            "id": key,
            "estado": status,
        }
    )


@app.get("/deliveries")
def deliveries():
    with database() as (_, cur):
        cur.execute(
            "SELECT e.id, "
            "e.id AS id_envio, "
            "e.num_guia, "
            "e.estado AS estado_envio, "
            "v.fecha_entrega_real, "
            "v.firma_evidencia, "
            "v.destinatario, "
            "v.id_operador, "
            "COALESCE(v.estado,'pendiente') AS estado "
            "FROM envios e "
            "LEFT JOIN validacion_entrega v ON v.id_envio=e.id "
            "ORDER BY e.id DESC LIMIT 500"
        )

        return jsonify(data=cur.fetchall())


@app.post("/deliveries/<int:key>")
def deliver(key):
    with database() as (_, cur):
        cur.execute(
            "SELECT * FROM envios WHERE id=%s FOR UPDATE",
            (key,),
        )

        shipment = cur.fetchone()

        if not shipment:
            return jsonify(error={"message": "Envío no encontrado"}), 404

        validate_delivery(
            cur,
            shipment,
            request.get_json() or {},
            g.user["id"],
        )

    return jsonify(
        data={
            "id": key,
            "estado": "validada",
        }
    )


if __name__ == "__main__":
    app.run(
        host=os.getenv("SERVICE_HOST", "127.0.0.1"),
        port=4011,
    )
    