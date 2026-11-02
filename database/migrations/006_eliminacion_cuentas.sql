-- LA COSECHA
-- Preparación de la estructura para eliminación de cuentas.
-- No elimina usuarios ni modifica registros comerciales.

ALTER TABLE usuarios
MODIFY COLUMN estado
ENUM('activo', 'bloqueado', 'eliminado')
NOT NULL DEFAULT 'activo';

ALTER TABLE usuarios
ADD COLUMN fecha_eliminacion DATETIME NULL;

