import re

def validar_proveedor_seguro(data, parcial=False):
    limits = {"nombre": 150, "razon_social": 200, "rfc": 13, "direccion": 1000, "correo": 254, "telefono": 20}
    if not parcial and not str(data.get("nombre", "")).strip():
        return "El nombre es obligatorio"
    if any(k not in limits for k in data):
        return "Hay campos no permitidos"
    for field, limit in limits.items():
        if field not in data:
            if not parcial:
                data[field] = None
            continue
        value = data[field]
        if value is not None and (not isinstance(value, str) or len(value) > limit):
            return f"El campo {field} no es válido"
        data[field] = value.strip() if isinstance(value, str) else None
        if data[field] == "":
            data[field] = None
    if "nombre" in data and not data["nombre"]:
        return "El nombre es obligatorio"
    if data.get("correo") and not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", data["correo"]):
        return "Correo inválido"
    if data.get("telefono") and not re.fullmatch(r"[+\d ()-]{10,20}", data["telefono"]):
        return "Teléfono inválido"
    if data.get("rfc") and not re.fullmatch(r"[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}", data["rfc"].upper()):
        return "RFC inválido"
    return None
