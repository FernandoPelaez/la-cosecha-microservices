"""Historial de Aranzazu adaptado a pedidos reales y a la identidad compartida."""
import hmac
import json
import os
import time
import requests
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from mysql.connector import Error
from database import database
from security import current_user, correlation_context, request_identity

app = FastAPI(title="LA COSECHA — Historial de compras", docs_url=None, redoc_url=None)

@app.middleware("http")
async def trace(request: Request, call_next):
    correlation = request_identity(request.headers.get("X-Correlation-Id"))
    token = correlation_context.set(correlation)
    started = time.monotonic()
    try:
        response = await call_next(request)
        response.headers["X-Correlation-Id"] = correlation
        print(json.dumps({"service": "history", "correlationId": correlation, "status": response.status_code,
                          "durationMs": round((time.monotonic() - started) * 1000)}), flush=True)
        return response
    finally:
        correlation_context.reset(token)

@app.exception_handler(HTTPException)
async def http_error(_request, error):
    return JSONResponse({"error": {"message": str(error.detail)}}, status_code=error.status_code)

@app.exception_handler(Error)
async def database_error(_request, _error):
    return JSONResponse({"error": {"message": "Historial temporalmente no disponible"}}, status_code=503)

@app.get("/live")
def live():
    return {"data": {"service": "history", "status": "running"}}

@app.get("/health")
def health():
    with database() as (_, cur):
        cur.execute("SELECT 1")
        cur.fetchone()
    return {"data": {"service": "history", "status": "ok"}}

@app.get("/history")
def obtener_historial_compras(authorization: str = Header(default=""), x_service_key: str = Header(default="")):
    secret = os.getenv("SERVICE_KEY", "")
    if len(secret) < 48 or not hmac.compare_digest(secret.encode(), x_service_key.encode()):
        raise HTTPException(401, "Servicio no autorizado")
    try:
        user = current_user(authorization)
    except PermissionError:
        raise HTTPException(401, "La sesión no está disponible") from None
    except (requests.RequestException, ValueError, KeyError):
        raise HTTPException(503, "Servicio de autenticación temporalmente no disponible") from None
    if user.get("rol") != "CLIENTE" or not user.get("clienteId"):
        raise HTTPException(403, "Se requiere una cuenta de cliente")
    with database() as (_, cur):
        cur.execute("""SELECT p.id AS id_pedido,p.fecha,p.total,p.estado,p.cliente_snapshot,p.domicilio_snapshot,
            v.id AS id_venta,e.id AS id_envio,e.num_guia,e.paqueteria,e.estado AS estado_envio,
            e.fecha_envio,c.folio,pg.estado AS estado_pago,ve.fecha_entrega_real,
            (SELECT COALESCE(SUM(dv.cantidad * d.precio_unitario),0) FROM devoluciones_venta dv
             JOIN detalle_ventas d ON d.id_venta=dv.id_venta AND d.id_producto=dv.id_producto
             WHERE dv.id_venta=v.id AND dv.estado='reembolsada') AS total_reembolsado
            FROM pedidos p LEFT JOIN ventas v ON v.id_pedido=p.id
            LEFT JOIN envios e ON e.id_venta=v.id LEFT JOIN comprobantes c ON c.id_venta=v.id
            LEFT JOIN pagos pg ON pg.id_pedido=p.id LEFT JOIN validacion_entrega ve ON ve.id_envio=e.id
            WHERE p.id_cliente=%s ORDER BY p.id DESC LIMIT 200""", (user["clienteId"],))
        orders = cur.fetchall()
        for order in orders:
            for field in ("cliente_snapshot", "domicilio_snapshot"):
                if isinstance(order[field], str):
                    order[field] = json.loads(order[field])
            cur.execute("""SELECT d.id_producto,COALESCE(d.nombre_snapshot,p.nombre) AS nombre,
                d.imagen_snapshot AS imagen,d.cantidad,d.precio_unitario,d.descuento_unitario
                FROM detalle_pedidos d JOIN productos p ON p.id=d.id_producto WHERE d.id_pedido=%s""", (order["id_pedido"],))
            order["items"] = cur.fetchall()
    return {"data": orders}
