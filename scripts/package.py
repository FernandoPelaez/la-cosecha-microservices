"""Genera una entrega reproducible sin secretos, dependencias ni temporales."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json
import sys

root = Path(__file__).resolve().parents[1]
checkpoint = "--checkpoint" in sys.argv
destination = root.parent / "entrega-soa"
destination.mkdir(exist_ok=True)
output = destination / ("la-cosecha-soa-checkpoint.zip" if checkpoint else "la-cosecha.zip")
excluded = {"node_modules", ".next", ".git", ".venv", "__pycache__", ".pytest_cache", "bin", "obj", "test-results", ".openai"}
temporary = {".pyc", ".log", ".zip", ".tsbuildinfo", ".tmp", ".bak"}
names = []
with ZipFile(output, "w", ZIP_DEFLATED, compresslevel=7) as archive:
    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root)
        if not path.is_file() or path.is_symlink() or excluded.intersection(relative.parts):
            continue
        if path.name.startswith(".env") and not path.name.endswith(".example"):
            continue
        if path.suffix in temporary:
            continue
        if path.suffix in {".pem", ".key", ".pfx"}:
            raise ValueError(f"Archivo privado no permitido: {relative}")
        name = "la-cosecha/" + relative.as_posix()
        archive.write(path, name)
        names.append(name)
with ZipFile(output) as archive:
    if archive.testzip():
        raise ValueError("Falló la comprobación CRC del ZIP")
    required = ["package.json", "package-lock.json", "PROGRESO.md", "database/catalogo.json"]
    if not checkpoint:
        required += ["README.md", ".env.example", "docs/MATRIZ-31.md", "apps/web/src/app/page.tsx", "services/stock-alerts/Program.cs"]
    for name in required:
        if "la-cosecha/" + name not in names:
            raise ValueError(f"Falta un archivo obligatorio: {name}")
    if len(names) != len(set(names)):
        raise ValueError("El ZIP contiene rutas duplicadas")
print(json.dumps({"archivo": str(output), "archivos": len(names), "bytes": output.stat().st_size, "sha256": hashlib.sha256(output.read_bytes()).hexdigest(), "crc": "correcto", "tipo": "checkpoint incompleto" if checkpoint else "entrega"}, ensure_ascii=False))
