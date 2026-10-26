-- Conservar la referencia permite consultar un reembolso pendiente sin duplicarlo.
ALTER TABLE devoluciones_venta ADD COLUMN referencia_reembolso VARCHAR(255) NULL;
ALTER TABLE devoluciones_venta ADD COLUMN estado_reembolso VARCHAR(40) NULL;
CREATE UNIQUE INDEX uq_devolucion_reembolso ON devoluciones_venta(referencia_reembolso);
