-- Adiciones no destructivas. El esquema original se conserva sin cambios.
ALTER TABLE usuarios ADD COLUMN version_sesion INT UNSIGNED NOT NULL DEFAULT 1;
ALTER TABLE usuarios ADD COLUMN bloqueado_hasta DATETIME NULL;
-- Una categoría configurable, sin atribuir ingredientes o presentaciones no aprobados.
ALTER TABLE productos ADD COLUMN categoria VARCHAR(100) NULL;
ALTER TABLE productos ADD COLUMN activo BOOLEAN NOT NULL DEFAULT TRUE;
-- Reserva al crear el pedido: evita vender las mismas unidades durante el pago.
ALTER TABLE pedidos ADD COLUMN vence_reserva DATETIME NULL;
ALTER TABLE pedidos ADD COLUMN clave_idempotencia VARCHAR(100) NULL;
CREATE UNIQUE INDEX uq_pedido_idempotencia ON pedidos(clave_idempotencia);
CREATE TABLE paquetes_logisticos (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 id_envio BIGINT UNSIGNED NOT NULL UNIQUE,
 peso_kg DECIMAL(10,3) NOT NULL,
 largo_cm DECIMAL(10,2) NOT NULL,
 ancho_cm DECIMAL(10,2) NOT NULL,
 alto_cm DECIMAL(10,2) NOT NULL,
 tipo_empaque VARCHAR(100) NOT NULL,
 tamano ENUM('chico','mediano','grande') NOT NULL,
 estado ENUM('pendiente','listo') NOT NULL DEFAULT 'pendiente',
 FOREIGN KEY (id_envio) REFERENCES envios(id) ON DELETE RESTRICT,
 CHECK(peso_kg>0 AND largo_cm>0 AND ancho_cm>0 AND alto_cm>0)
) ENGINE=InnoDB;
CREATE TABLE eventos_pago (
 id_evento VARCHAR(255) PRIMARY KEY,
 fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
