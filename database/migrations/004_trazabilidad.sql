-- Instantáneas: cambiar catálogo, perfil o domicilio no altera una compra pasada.
ALTER TABLE pedidos ADD COLUMN cliente_snapshot JSON NULL;
ALTER TABLE pedidos ADD COLUMN domicilio_snapshot JSON NULL;
ALTER TABLE detalle_pedidos ADD COLUMN nombre_snapshot VARCHAR(150) NULL;
ALTER TABLE detalle_pedidos ADD COLUMN imagen_snapshot VARCHAR(500) NULL;
ALTER TABLE productos ADD COLUMN referencia_catalogo VARCHAR(80) NULL;
CREATE UNIQUE INDEX uq_producto_catalogo ON productos(referencia_catalogo);
-- El catálogo entregado no acredita costos ni proveedores; no se inventan.
ALTER TABLE productos MODIFY COLUMN costo DECIMAL(12,2) NULL;
ALTER TABLE productos MODIFY COLUMN id_proveedor BIGINT UNSIGNED NULL;
CREATE TABLE IF NOT EXISTS auditoria_roles (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 id_usuario BIGINT UNSIGNED NOT NULL,
 id_actor BIGINT UNSIGNED NOT NULL,
 rol_anterior INT UNSIGNED NOT NULL,
 rol_nuevo INT UNSIGNED NOT NULL,
 fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(id_usuario) REFERENCES usuarios(id),
 FOREIGN KEY(id_actor) REFERENCES usuarios(id),
 FOREIGN KEY(rol_anterior) REFERENCES roles(id),
 FOREIGN KEY(rol_nuevo) REFERENCES roles(id)
) ENGINE=InnoDB;
ALTER TABLE validacion_entrega ADD COLUMN destinatario VARCHAR(150) NULL;
ALTER TABLE validacion_entrega ADD COLUMN id_operador BIGINT UNSIGNED NULL;
ALTER TABLE validacion_entrega ADD CONSTRAINT fk_entrega_operador FOREIGN KEY(id_operador) REFERENCES usuarios(id);
