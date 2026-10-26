# LA COSECHA · entrega SOA

Tienda en español con Next.js, MySQL y 13 servicios HTTP independientes en Node.js, Python y C#. Esta carpeta continúa el proyecto recuperado; no contiene otra copia de V1/V2 ni implementaciones paralelas de identidad, inventario o pago.

**Estado:** código implementado, compilación y verificaciones locales detalladas en [VERIFICACIONES](docs/VERIFICACIONES.md). La validación integral con los 13 servicios, MySQL en ejecución y proveedores externos sigue pendiente. No hay pagos, correos, existencias ni reseñas simuladas en la aplicación. Las pruebas que usan dobles están identificadas.

## Instalación en Windows con Git Bash

Prerrequisitos: Node.js 22 o 24, Python 3.12, SDK .NET 10, MySQL **8.0** y Git Bash. El script crea un entorno Python propio y restaura los paquetes C# bloqueados. No usar MariaDB/XAMPP como sustituto de MySQL 8. Los archivos `package-lock.json`, `requirements.lock.txt` y `packages.lock.json` fijan las dependencias de esta entrega.

Extrae el ZIP. Abre Git Bash en la carpeta que contiene este README y `package.json`. Si usas la ruta anterior:

```bash
cd '/d/online store/la-cosecha'
npm ci
npm run configure
npm run setup
```

`configure` genera claves locales nuevas y nunca sobrescribe `.env`. Si `python` no está en PATH, coloca su ruta en `PYTHON_EXECUTABLE` de `.env`; usa barras `/`, por ejemplo `C:/ruta/Python312/python.exe`. `DOTNET_EXECUTABLE` admite lo mismo. No copies credenciales al chat ni al repositorio.

1. Prepara en MySQL una **base nueva y vacía** llamada `la_cosecha_soa` y un usuario con permisos limitados a esa base; consulta [MYSQL](docs/MYSQL.md).
2. Completa `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD` en `.env`.
3. Configura Turnstile y SMTP según [CONFIGURACION](docs/CONFIGURACION.md). Son necesarios para el acceso protegido y la verificación de correo. Stripe puede permanecer deshabilitado mientras configuras la tienda.
4. Ejecuta:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Abre **http://localhost:3000**. Mantén la terminal abierta. `dev` arranca los 13 servicios, el trabajador de comprobantes y Next; `Ctrl+C` los detiene. El catálogo inicial contiene los 15 productos de referencia con stock **cero**. Registra existencias mediante una recepción o un ajuste justificado. El seed no inventa proveedores, costos, usuarios ni ventas y no sobrescribe los productos ya importados.

En otra terminal, dentro de esta misma carpeta:

```bash
npm run diagnose
```

Un `/live` correcto sólo demuestra que el proceso está activo. `/health` comprueba dependencias; alertas puede requerir una sesión para acceder al inventario. Un `401` de `auth/me` sin iniciar sesión es normal. Un `503` indica una dependencia pendiente y no se reemplaza con datos de demostración.

## Primera cuenta administrativa

Después de migrar, crea una cuenta interna mediante variables de tu terminal. El comando no modifica ni reemplaza usuarios existentes. La contraseña debe tener al menos 12 caracteres y no exceder 72 bytes.

```bash
read -r -p 'Nombre del administrador: ' ADMIN_NAME
read -r -p 'Correo del administrador: ' ADMIN_EMAIL
read -r -s -p 'Contraseña nueva: ' ADMIN_PASSWORD
export ADMIN_NAME ADMIN_EMAIL ADMIN_PASSWORD
npm run admin:create
unset ADMIN_NAME ADMIN_EMAIL ADMIN_PASSWORD
```

Estos comandos son de **Git Bash**, no de PowerShell. No hay cuenta ni contraseña administrativa predeterminada. El alta interna no sustituye el login con Turnstile. Para comprar, registra una cuenta CLIENTE y confirma su correo; un administrador no utiliza el carrito de clientes.

## Comandos principales

| Comando | Propósito |
|---|---|
| `npm run dev:web` / `npm run dev:services` | Separar interfaz y servicios al diagnosticar. |
| `npm run build` | Compilación de producción de Next. |
| `npm run build:services` | Compilación Release de ambos servicios .NET, después de `setup`. |
| `npm start` | Ejecutar producción local tras ambas compilaciones. |
| `npm run lint` / `npm run typecheck` | Revisión de JavaScript/TypeScript. |
| `npm test` | Pruebas Node de reglas, seguridad, HTTP y contratos con dobles. |
| `.venv/Scripts/python.exe -m unittest discover -s tests/python` | Pruebas Python en Windows. En Linux usa `.venv/bin/python`. |
| `npm run payments:reconcile` | Consultar en Stripe pagos pendientes con referencia y aplicar el resultado verificado. |
| `npm run receipts:deliver` | Intentar entregar la cola de comprobantes; SMTP debe estar configurado. |
| `npm run package` | Crear `../entrega-soa/la-cosecha.zip` sin dependencias, secretos ni temporales. |

## Documentación para la entrega

- [Matriz de 31 requisitos](docs/MATRIZ-31.md): archivo, endpoint, tabla, prueba, resultado y pendiente por requisito.
- [Arquitectura SOA](docs/ARQUITECTURA.md) y [servicios/autores](docs/SERVICIOS.md).
- [Contratos HTTP](docs/API.md), [MySQL](docs/MYSQL.md) y [configuración de proveedores](docs/CONFIGURACION.md).
- [Guion de demostración](docs/DEMO-SOA.md) y [verificaciones y pendientes](docs/VERIFICACIONES.md).
- [Procedencia y recursos descartados](docs/PROCEDENCIA.md); la auditoría original está en `docs/auditoria/`.
- [Punto de continuación](PROGRESO.md) para recuperar el trabajo después de una interrupción.

## Problemas frecuentes

| Síntoma | Acción |
|---|---|
| `ER_NO_SUCH_TABLE` o tabla `products` inexistente | Esta entrega utiliza `productos`. Comprueba `DB_NAME`, ejecuta **migrate antes de seed** y no mezcles scripts de otra versión. |
| «La base contiene tablas ajenas» | Conserva esa base; selecciona otra nueva y vacía. No borres tablas para forzar la migración. |
| `ECONNREFUSED` / `ER_ACCESS_DENIED_ERROR` | Inicia MySQL y revisa host, puerto, usuario y privilegios. |
| Next está listo pero el catálogo falla | Ejecuta `diagnose`; Next y los servicios son procesos diferentes. |
| `EADDRINUSE` | Detén el proceso anterior o cambia puerto **y URL** del servicio en `.env`. |
| Verificación de seguridad no disponible | Configura las dos claves de Turnstile y el hostname exacto; reinicia Next. No existe un bypass de login. |
| Pago no disponible | Configura Stripe test y su webhook; después activa `PAYMENTS_ENABLED=true`. |
| Correo aceptado pero no visible | Revisa SMTP, el remitente y spam; aceptación SMTP no acredita entrega al buzón. |
| Sesión rechazada después de cambiar un rol | Es revocación intencional: vuelve a iniciar sesión. |

No se incluyen cargos de envío, condiciones de garantía o información fiscal no confirmada. El comprobante no es CFDI. La aprobación de los flujos externos y la revisión visual completa se deben cerrar antes de presentar la tienda como operativa.
