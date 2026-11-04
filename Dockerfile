# Dependencias de Node.js.
FROM node:22-bookworm AS node-deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json

RUN npm ci


# Dependencias de Python.
FROM python:3.12-slim-bookworm AS python-deps

WORKDIR /app

COPY services/python-common/requirements.lock.txt /tmp/requirements.lock.txt

RUN python -m venv /app/.venv \
    && /app/.venv/bin/pip install \
    --no-cache-dir \
    -r /tmp/requirements.lock.txt


# Entorno de los microservicios.
FROM mcr.microsoft.com/dotnet/sdk:10.0

WORKDIR /app

ENV NODE_ENV=production \
    PYTHON_EXECUTABLE=/app/.venv/bin/python \
    DOTNET_CLI_TELEMETRY_OPTOUT=1

# Incorporar Node.js y sus dependencias.
COPY --from=node-deps /usr/local/bin/node /usr/local/bin/node
COPY --from=node-deps /app/node_modules ./node_modules

# Incorporar Python y sus dependencias.
COPY --from=python-deps /usr/local /usr/local
COPY --from=python-deps /app/.venv /app/.venv

# Incorporar el código del backend.
COPY package.json ./
COPY packages ./packages
COPY services ./services
COPY scripts ./scripts

# Preparar los microservicios .NET.
RUN dotnet restore \
    services/orders/RegistroPedidosService.csproj \
    --locked-mode \
    && dotnet restore \
    services/stock-alerts/StockAlerts.csproj \
    --locked-mode \
    && dotnet build \
    services/orders/RegistroPedidosService.csproj \
    --configuration Release \
    --no-restore \
    && dotnet build \
    services/stock-alerts/StockAlerts.csproj \
    --configuration Release \
    --no-restore

# Iniciar únicamente los servicios del backend.
CMD ["node", "scripts/dev.mjs", "--production", "--services-only"]

