"""Identidad única y correlación HTTP compartidas por los servicios Python."""

import hmac
import json
import os
import re
import time
import uuid

from contextvars import ContextVar

import requests
from flask import request, g, jsonify


correlation_context = ContextVar("correlation_id", default="")


def request_identity(value):
    return (
        value
        if re.fullmatch(r"[a-zA-Z0-9\_-]{8,80}", value or "")
        else str(uuid.uuid4())
    )


def current_user(authorization):
    response = requests.get(
        os.getenv("AUTH_URL", "http://127.0.0.1:4001") + "/me",
        headers={
            "Authorization": authorization or "",
            "X-Service-Key": os.getenv("SERVICE_KEY", ""),
            "X-Correlation-Id": correlation_context.get() or str(uuid.uuid4()),
        },
        timeout=8,
    )

    if response.status_code in (401, 403):
        raise PermissionError("Inicia sesión para continuar")

    response.raise_for_status()

    return response.json()["data"]


def install_security(app, roles):
    @app.before_request
    def authorize():
        g.correlation = request_identity(
            request.headers.get("X-Correlation-Id")
        )
        g.context_token = correlation_context.set(g.correlation)
        g.started = time.monotonic()

        if request.path in ("/live", "/health", "/api/health"):
            return None

        secret = os.getenv("SERVICE_KEY", "")

        if len(secret) < 48 or not hmac.compare_digest(
            secret.encode(),
            request.headers.get("X-Service-Key", "").encode(),
        ):
            return jsonify(error={"message": "Servicio no autorizado"}), 401

        try:
            g.user = current_user(request.headers.get("Authorization"))

        except PermissionError:
            return jsonify(error={"message": "Sesión no disponible"}), 401

        except (requests.RequestException, ValueError, KeyError):
            return jsonify(
                error={
                    "message": "Servicio de autenticación temporalmente no disponible"
                }
            ), 503

        if roles and g.user["rol"] not in roles:
            return jsonify(
                error={"message": "No tienes permiso para esta operación"}
            ), 403

        return None

    @app.after_request
    def trace(response):
        response.headers["X-Correlation-Id"] = g.correlation

        print(
            json.dumps(
                {
                    "service": app.name,
                    "correlationId": g.correlation,
                    "route": str(request.url_rule or "unmatched"),
                    "status": response.status_code,
                    "durationMs": round(
                        (time.monotonic() - g.started) * 1000
                    ),
                }
            ),
            flush=True,
        )

        return response

    @app.teardown_request
    def release(_error):
        token = g.pop("context_token", None)

        if token is not None:
            correlation_context.reset(token)

    @app.get("/live")
    def live():
        return jsonify(
            data={
                "service": app.name,
                "status": "running",
            }
        )
    