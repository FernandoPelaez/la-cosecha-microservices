-- Outbox transaccional: una caída del SMTP no pierde el comprobante de una venta.
CREATE TABLE cola_comprobantes (
 id_venta BIGINT UNSIGNED PRIMARY KEY,
 estado ENUM('pendiente','enviando','enviado') NOT NULL DEFAULT 'pendiente',
 intentos INT UNSIGNED NOT NULL DEFAULT 0,
 disponible_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 ultimo_error VARCHAR(100) NULL,
 FOREIGN KEY(id_venta) REFERENCES ventas(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
