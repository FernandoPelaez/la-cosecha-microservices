-- ============================================================================
-- LA COSECHA - Base de datos de tienda en linea de salsas
-- Destino: MySQL Server 8.0.46 (InnoDB / utf8mb4)
-- Origen: 24 tablas de "Tablas y campos(1).docx"
-- Ampliacion: 8 tablas adicionales, incluida EMPAQUETADO (32 tablas en total).
-- Script NO destructivo: no borra bases de datos ni tablas existentes.
-- Ejecutar en MySQL Workbench con conexion al servidor correspondiente.
-- ============================================================================





-- ============================================================================
-- 1. CONTROL DE ACCESO
-- ============================================================================

CREATE TABLE IF NOT EXISTS `roles` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nombre_rol` VARCHAR(60) NOT NULL,
    `descripcion` VARCHAR(255) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_roles_nombre` (`nombre_rol`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `usuarios` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(150) NOT NULL,
    `correo` VARCHAR(254) NOT NULL,
    `telefono` VARCHAR(20) NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `id_rol` INT UNSIGNED NOT NULL,
    `fecha_registro` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `estado` ENUM('activo','bloqueado') NOT NULL DEFAULT 'activo',
    `intentos_fallidos` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `correo_verificado` BOOLEAN NOT NULL DEFAULT FALSE,
    `telefono_verificado` BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_usuarios_correo` (`correo`),
    UNIQUE KEY `uq_usuarios_telefono` (`telefono`),
    KEY `idx_usuarios_rol` (`id_rol`),
    CONSTRAINT `fk_usuarios_roles` FOREIGN KEY (`id_rol`)
        REFERENCES `roles` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `tokens_recuperacion` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_usuario` BIGINT UNSIGNED NOT NULL,
    `token` VARCHAR(255) NOT NULL COMMENT 'Guardar el hash del token, nunca su valor en claro',
    `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `fecha_expiracion` DATETIME NOT NULL,
    `usado` BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_recuperacion_token` (`token`),
    KEY `idx_recuperacion_usuario` (`id_usuario`, `fecha_expiracion`),
    CONSTRAINT `chk_recuperacion_vigencia` CHECK (`fecha_expiracion` > `fecha_creacion`),
    CONSTRAINT `fk_recuperacion_usuario` FOREIGN KEY (`id_usuario`)
        REFERENCES `usuarios` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tabla nueva: registro de verificacion de correo / telefono.
-- La verificacion antibots se ejecuta en los servicios sin tabla dedicada.
CREATE TABLE IF NOT EXISTS `verificaciones_usuario` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_usuario` BIGINT UNSIGNED NOT NULL,
    `canal` ENUM('correo','telefono') NOT NULL,
    `codigo_hash` VARCHAR(255) NOT NULL,
    `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `fecha_expiracion` DATETIME NOT NULL,
    `fecha_uso` DATETIME NULL,
    `intentos` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_verificaciones_usuario` (`id_usuario`, `canal`, `fecha_expiracion`),
    CONSTRAINT `chk_verificaciones_vigencia` CHECK (`fecha_expiracion` > `fecha_creacion`),
    CONSTRAINT `fk_verificaciones_usuario` FOREIGN KEY (`id_usuario`)
        REFERENCES `usuarios` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `clientes` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_usuario` BIGINT UNSIGNED NOT NULL,
    `direccion` TEXT NULL COMMENT 'Campo conservado del documento; entregas usan direcciones',
    `rfc` VARCHAR(13) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_clientes_usuario` (`id_usuario`),
    CONSTRAINT `fk_clientes_usuario` FOREIGN KEY (`id_usuario`)
        REFERENCES `usuarios` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================================
-- 2. CATALOGO / INVENTARIO
-- ============================================================================

CREATE TABLE IF NOT EXISTS `proveedores` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(150) NOT NULL,
    `razon_social` VARCHAR(200) NULL,
    `rfc` VARCHAR(13) NULL,
    `direccion` TEXT NULL,
    `correo` VARCHAR(254) NULL,
    `telefono` VARCHAR(20) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_proveedores_rfc` (`rfc`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `productos` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(160) NOT NULL,
    `descripcion` TEXT NULL,
    `lote` VARCHAR(100) NULL,
    `serie` VARCHAR(100) NULL,
    `caducidad` DATE NULL,
    `id_proveedor` BIGINT UNSIGNED NOT NULL,
    `costo` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `precio` DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_productos_proveedor` (`id_proveedor`),
    KEY `idx_productos_nombre` (`nombre`),
    KEY `idx_productos_caducidad` (`caducidad`),
    CONSTRAINT `chk_productos_costo` CHECK (`costo` >= 0),
    CONSTRAINT `chk_productos_precio` CHECK (`precio` >= 0),
    CONSTRAINT `fk_productos_proveedor` FOREIGN KEY (`id_proveedor`)
        REFERENCES `proveedores` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Tabla nueva: catalogo fotografico de las 10 salsas y futuras presentaciones.
-- Solo se guardan rutas/URLs; los archivos de imagen no se almacenan como BLOB.
CREATE TABLE IF NOT EXISTS `imagenes_producto` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_producto` BIGINT UNSIGNED NOT NULL,
    `url_imagen` VARCHAR(1024) NOT NULL,
    `orden` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `es_principal` BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_imagenes_producto_orden` (`id_producto`, `orden`),
    CONSTRAINT `fk_imagenes_producto` FOREIGN KEY (`id_producto`)
        REFERENCES `productos` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `stock` (
    `id_producto` BIGINT UNSIGNED NOT NULL,
    `stock_actual` INT UNSIGNED NOT NULL DEFAULT 0,
    `stock_minimo` INT UNSIGNED NOT NULL DEFAULT 0,
    `stock_maximo` INT UNSIGNED NOT NULL,
    PRIMARY KEY (`id_producto`),
    CONSTRAINT `chk_stock_limites` CHECK (`stock_maximo` >= `stock_minimo`),
    CONSTRAINT `fk_stock_producto` FOREIGN KEY (`id_producto`)
        REFERENCES `productos` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `resenas` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_producto` BIGINT UNSIGNED NOT NULL,
    `id_cliente` BIGINT UNSIGNED NOT NULL,
    `calificacion` TINYINT UNSIGNED NOT NULL,
    `comentario` TEXT NULL,
    `fecha` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_resenas_producto` (`id_producto`, `fecha`),
    KEY `idx_resenas_cliente` (`id_cliente`),
    CONSTRAINT `chk_resenas_calificacion` CHECK (`calificacion` BETWEEN 1 AND 5),
    CONSTRAINT `fk_resenas_producto` FOREIGN KEY (`id_producto`)
        REFERENCES `productos` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_resenas_cliente` FOREIGN KEY (`id_cliente`)
        REFERENCES `clientes` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Tablas nuevas: ofertas y descuentos activables sobre uno o mas productos.
-- Las alertas de stock minimo/maximo son consultas sobre STOCK.
CREATE TABLE IF NOT EXISTS `promociones` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(150) NOT NULL,
    `descripcion` TEXT NULL,
    `tipo_descuento` ENUM('porcentaje','monto') NOT NULL,
    `valor` DECIMAL(12,2) NOT NULL,
    `fecha_inicio` DATETIME NOT NULL,
    `fecha_fin` DATETIME NOT NULL,
    `activa` BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (`id`),
    KEY `idx_promociones_vigencia` (`activa`, `fecha_inicio`, `fecha_fin`),
    CONSTRAINT `chk_promociones_valor` CHECK (`valor` > 0),
    CONSTRAINT `chk_promociones_porcentaje` CHECK (
        `tipo_descuento` <> 'porcentaje' OR `valor` <= 100
    ),
    CONSTRAINT `chk_promociones_fechas` CHECK (`fecha_fin` >= `fecha_inicio`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `promociones_productos` (
    `id_promocion` BIGINT UNSIGNED NOT NULL,
    `id_producto` BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (`id_promocion`, `id_producto`),
    KEY `idx_promociones_productos_producto` (`id_producto`),
    CONSTRAINT `fk_promociones_productos_promocion` FOREIGN KEY (`id_promocion`)
        REFERENCES `promociones` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT `fk_promociones_productos_producto` FOREIGN KEY (`id_producto`)
        REFERENCES `productos` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================================
-- 3. COMPRAS A PROVEEDORES
-- ============================================================================

CREATE TABLE IF NOT EXISTS `compras` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_proveedor` BIGINT UNSIGNED NOT NULL,
    `id_usuario` BIGINT UNSIGNED NOT NULL,
    `fecha` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `estado` ENUM('borrador','confirmada','recibida','cancelada') NOT NULL DEFAULT 'borrador',
    PRIMARY KEY (`id`),
    KEY `idx_compras_proveedor` (`id_proveedor`, `fecha`),
    KEY `idx_compras_usuario` (`id_usuario`),
    CONSTRAINT `chk_compras_total` CHECK (`total` >= 0),
    CONSTRAINT `fk_compras_proveedor` FOREIGN KEY (`id_proveedor`)
        REFERENCES `proveedores` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_compras_usuario` FOREIGN KEY (`id_usuario`)
        REFERENCES `usuarios` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `detalle_compras` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_compra` BIGINT UNSIGNED NOT NULL,
    `id_producto` BIGINT UNSIGNED NOT NULL,
    `cantidad` INT UNSIGNED NOT NULL,
    `costo_unitario` DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_detalle_compras_producto` (`id_compra`, `id_producto`),
    KEY `idx_detalle_compras_producto` (`id_producto`),
    CONSTRAINT `chk_detalle_compras_cantidad` CHECK (`cantidad` > 0),
    CONSTRAINT `chk_detalle_compras_costo` CHECK (`costo_unitario` >= 0),
    CONSTRAINT `fk_detalle_compras_compra` FOREIGN KEY (`id_compra`)
        REFERENCES `compras` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_detalle_compras_producto` FOREIGN KEY (`id_producto`)
        REFERENCES `productos` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `devoluciones_compra` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_compra` BIGINT UNSIGNED NOT NULL,
    `id_producto` BIGINT UNSIGNED NOT NULL,
    `cantidad` INT UNSIGNED NOT NULL,
    `motivo` TEXT NOT NULL,
    `fecha` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_devol_compra_detalle` (`id_compra`, `id_producto`),
    KEY `idx_devol_compra_fecha` (`fecha`),
    CONSTRAINT `chk_devol_compra_cantidad` CHECK (`cantidad` > 0),
    CONSTRAINT `fk_devol_compra_detalle` FOREIGN KEY (`id_compra`, `id_producto`)
        REFERENCES `detalle_compras` (`id_compra`, `id_producto`)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================================
-- 4. CARRITO, DOMICILIOS Y MEDIOS DE PAGO
-- ============================================================================

CREATE TABLE IF NOT EXISTS `carrito` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_cliente` BIGINT UNSIGNED NOT NULL,
    `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `estado` ENUM('abierto','convertido','abandonado') NOT NULL DEFAULT 'abierto',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_carrito_id_cliente` (`id`, `id_cliente`),
    KEY `idx_carrito_cliente_estado` (`id_cliente`, `estado`),
    CONSTRAINT `fk_carrito_cliente` FOREIGN KEY (`id_cliente`)
        REFERENCES `clientes` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `detalle_carrito` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_carrito` BIGINT UNSIGNED NOT NULL,
    `id_producto` BIGINT UNSIGNED NOT NULL,
    `cantidad` INT UNSIGNED NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_detalle_carrito_producto` (`id_carrito`, `id_producto`),
    KEY `idx_detalle_carrito_producto` (`id_producto`),
    CONSTRAINT `chk_detalle_carrito_cantidad` CHECK (`cantidad` > 0),
    CONSTRAINT `fk_detalle_carrito_carrito` FOREIGN KEY (`id_carrito`)
        REFERENCES `carrito` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT `fk_detalle_carrito_producto` FOREIGN KEY (`id_producto`)
        REFERENCES `productos` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `tipos_pago` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(60) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_tipos_pago_nombre` (`nombre`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `tarjetas` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_cliente` BIGINT UNSIGNED NOT NULL,
    `token_pago` VARCHAR(255) NOT NULL COMMENT 'Token opaco del proveedor; nunca guardar PAN/CVV',
    `ultimos_digitos` CHAR(4) NOT NULL,
    `verificada` BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_tarjetas_token` (`token_pago`),
    UNIQUE KEY `uq_tarjetas_id_cliente` (`id`, `id_cliente`),
    KEY `idx_tarjetas_cliente` (`id_cliente`),
    CONSTRAINT `chk_tarjetas_ultimos_digitos`
        CHECK (`ultimos_digitos` REGEXP '^[0-9]{4}$'),
    CONSTRAINT `fk_tarjetas_cliente` FOREIGN KEY (`id_cliente`)
        REFERENCES `clientes` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `direcciones` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_cliente` BIGINT UNSIGNED NOT NULL,
    `calle_numero` VARCHAR(255) NOT NULL,
    `colonia` VARCHAR(150) NOT NULL,
    `ciudad` VARCHAR(150) NOT NULL,
    `codigo_postal` CHAR(5) NOT NULL,
    `referencias` TEXT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_direcciones_id_cliente` (`id`, `id_cliente`),
    KEY `idx_direcciones_cliente` (`id_cliente`),
    CONSTRAINT `chk_direcciones_codigo_postal`
        CHECK (`codigo_postal` REGEXP '^[0-9]{5}$'),
    CONSTRAINT `fk_direcciones_cliente` FOREIGN KEY (`id_cliente`)
        REFERENCES `clientes` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================================
-- 5. PEDIDOS, PAGOS Y VENTAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS `pedidos` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_carrito` BIGINT UNSIGNED NOT NULL,
    `id_cliente` BIGINT UNSIGNED NOT NULL,
    `id_direccion` BIGINT UNSIGNED NOT NULL,
    `id_tipo_pago` INT UNSIGNED NOT NULL,
    `id_tarjeta` BIGINT UNSIGNED NULL,
    `fecha` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `estado` ENUM('pendiente','confirmado','pagado','preparacion','enviado','entregado','cancelado')
        NOT NULL DEFAULT 'pendiente',
    `total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_pedidos_carrito` (`id_carrito`),
    UNIQUE KEY `uq_pedidos_id_cliente` (`id`, `id_cliente`),
    UNIQUE KEY `uq_pedidos_id_tipo_pago` (`id`, `id_tipo_pago`),
    KEY `idx_pedidos_carrito_cliente` (`id_carrito`, `id_cliente`),
    KEY `idx_pedidos_cliente_fecha` (`id_cliente`, `fecha`),
    KEY `idx_pedidos_direccion_cliente` (`id_direccion`, `id_cliente`),
    KEY `idx_pedidos_tarjeta_cliente` (`id_tarjeta`, `id_cliente`),
    KEY `idx_pedidos_pago` (`id_tipo_pago`),
    CONSTRAINT `chk_pedidos_total` CHECK (`total` >= 0),
    CONSTRAINT `fk_pedidos_carrito_cliente` FOREIGN KEY (`id_carrito`, `id_cliente`)
        REFERENCES `carrito` (`id`, `id_cliente`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_pedidos_direccion_cliente` FOREIGN KEY (`id_direccion`, `id_cliente`)
        REFERENCES `direcciones` (`id`, `id_cliente`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_pedidos_tipo_pago` FOREIGN KEY (`id_tipo_pago`)
        REFERENCES `tipos_pago` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_pedidos_tarjeta_cliente` FOREIGN KEY (`id_tarjeta`, `id_cliente`)
        REFERENCES `tarjetas` (`id`, `id_cliente`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Tabla nueva: fotografia del carrito al confirmar el pedido; preserva
-- precios y descuentos aunque despues cambie el catalogo o una promocion.
CREATE TABLE IF NOT EXISTS `detalle_pedidos` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_pedido` BIGINT UNSIGNED NOT NULL,
    `id_producto` BIGINT UNSIGNED NOT NULL,
    `cantidad` INT UNSIGNED NOT NULL,
    `precio_unitario` DECIMAL(12,2) NOT NULL,
    `descuento_unitario` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_detalle_pedidos_producto` (`id_pedido`, `id_producto`),
    KEY `idx_detalle_pedidos_producto` (`id_producto`),
    CONSTRAINT `chk_detalle_pedidos_cantidad` CHECK (`cantidad` > 0),
    CONSTRAINT `chk_detalle_pedidos_precios` CHECK (
        `precio_unitario` >= 0 AND
        `descuento_unitario` >= 0 AND
        `descuento_unitario` <= `precio_unitario`
    ),
    CONSTRAINT `fk_detalle_pedidos_pedido` FOREIGN KEY (`id_pedido`)
        REFERENCES `pedidos` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_detalle_pedidos_producto` FOREIGN KEY (`id_producto`)
        REFERENCES `productos` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Tabla nueva: intentos/resultados de cobro; SIN numeros de tarjeta ni CVV.
-- El proveedor es quien valida la tarjeta; el sistema guarda solo su respuesta.
CREATE TABLE IF NOT EXISTS `pagos` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_pedido` BIGINT UNSIGNED NOT NULL,
    `id_tipo_pago` INT UNSIGNED NOT NULL,
    `proveedor_pago` VARCHAR(100) NULL,
    `referencia_proveedor` VARCHAR(255) NULL,
    `clave_idempotencia` VARCHAR(100) NULL,
    `monto` DECIMAL(12,2) NOT NULL,
    `estado` ENUM('pendiente','autorizado','capturado','rechazado','reembolsado','cancelado')
        NOT NULL DEFAULT 'pendiente',
    `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_pagos_referencia` (`proveedor_pago`, `referencia_proveedor`),
    UNIQUE KEY `uq_pagos_idempotencia` (`clave_idempotencia`),
    KEY `idx_pagos_pedido_tipo` (`id_pedido`, `id_tipo_pago`),
    CONSTRAINT `chk_pagos_monto` CHECK (`monto` > 0),
    CONSTRAINT `fk_pagos_pedido_tipo` FOREIGN KEY (`id_pedido`, `id_tipo_pago`)
        REFERENCES `pedidos` (`id`, `id_tipo_pago`)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `ventas` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_pedido` BIGINT UNSIGNED NOT NULL,
    `id_cliente` BIGINT UNSIGNED NOT NULL,
    `fecha` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `total` DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_ventas_pedido` (`id_pedido`),
    KEY `idx_ventas_pedido_cliente` (`id_pedido`, `id_cliente`),
    KEY `idx_ventas_cliente_fecha` (`id_cliente`, `fecha`),
    CONSTRAINT `chk_ventas_total` CHECK (`total` >= 0),
    CONSTRAINT `fk_ventas_pedido_cliente` FOREIGN KEY (`id_pedido`, `id_cliente`)
        REFERENCES `pedidos` (`id`, `id_cliente`)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `detalle_ventas` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_venta` BIGINT UNSIGNED NOT NULL,
    `id_producto` BIGINT UNSIGNED NOT NULL,
    `cantidad` INT UNSIGNED NOT NULL,
    `precio_unitario` DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_detalle_ventas_producto` (`id_venta`, `id_producto`),
    KEY `idx_detalle_ventas_producto` (`id_producto`),
    CONSTRAINT `chk_detalle_ventas_cantidad` CHECK (`cantidad` > 0),
    CONSTRAINT `chk_detalle_ventas_precio` CHECK (`precio_unitario` >= 0),
    CONSTRAINT `fk_detalle_ventas_venta` FOREIGN KEY (`id_venta`)
        REFERENCES `ventas` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_detalle_ventas_producto` FOREIGN KEY (`id_producto`)
        REFERENCES `productos` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `comprobantes` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_venta` BIGINT UNSIGNED NOT NULL,
    `folio` VARCHAR(100) NOT NULL,
    `fecha_emision` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `enviado_correo` BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_comprobantes_folio` (`folio`),
    KEY `idx_comprobantes_venta` (`id_venta`),
    CONSTRAINT `fk_comprobantes_venta` FOREIGN KEY (`id_venta`)
        REFERENCES `ventas` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================================
-- 6. LOGISTICA, DEVOLUCIONES Y GARANTIAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS `envios` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_venta` BIGINT UNSIGNED NOT NULL,
    `id_direccion` BIGINT UNSIGNED NOT NULL,
    `paqueteria` VARCHAR(150) NULL,
    `num_guia` VARCHAR(150) NULL,
    `estado` VARCHAR(40) NOT NULL DEFAULT 'pendiente',
    `fecha_envio` DATETIME NULL,
    `fecha_estimada_entrega` DATETIME NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_envios_num_guia` (`num_guia`),
    KEY `idx_envios_venta` (`id_venta`),
    KEY `idx_envios_direccion` (`id_direccion`),
    CONSTRAINT `fk_envios_venta` FOREIGN KEY (`id_venta`)
        REFERENCES `ventas` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_envios_direccion` FOREIGN KEY (`id_direccion`)
        REFERENCES `direcciones` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `validacion_entrega` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_envio` BIGINT UNSIGNED NOT NULL,
    `fecha_entrega_real` DATETIME NULL,
    `firma_evidencia` VARCHAR(1024) NULL COMMENT 'Ruta/URL de la evidencia; no almacenar archivos aqui',
    `estado` ENUM('pendiente','validada','rechazada') NOT NULL DEFAULT 'pendiente',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_validacion_entrega_envio` (`id_envio`),
    CONSTRAINT `fk_validacion_entrega_envio` FOREIGN KEY (`id_envio`)
        REFERENCES `envios` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `devoluciones_venta` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_venta` BIGINT UNSIGNED NOT NULL,
    `id_producto` BIGINT UNSIGNED NOT NULL,
    `cantidad` INT UNSIGNED NOT NULL,
    `motivo` TEXT NOT NULL,
    `fecha` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `estado` ENUM('solicitada','aprobada','rechazada','recibida','reembolsada')
        NOT NULL DEFAULT 'solicitada',
    PRIMARY KEY (`id`),
    KEY `idx_devol_venta_detalle` (`id_venta`, `id_producto`),
    KEY `idx_devol_venta_fecha` (`fecha`),
    CONSTRAINT `chk_devol_venta_cantidad` CHECK (`cantidad` > 0),
    CONSTRAINT `fk_devol_venta_detalle` FOREIGN KEY (`id_venta`, `id_producto`)
        REFERENCES `detalle_ventas` (`id_venta`, `id_producto`)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `garantias` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_venta` BIGINT UNSIGNED NOT NULL,
    `id_producto` BIGINT UNSIGNED NOT NULL,
    `fecha_solicitud` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `motivo` TEXT NOT NULL,
    `estado` ENUM('solicitada','revision','aprobada','rechazada','resuelta')
        NOT NULL DEFAULT 'solicitada',
    `resolucion` TEXT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_garantias_detalle` (`id_venta`, `id_producto`),
    CONSTRAINT `fk_garantias_detalle` FOREIGN KEY (`id_venta`, `id_producto`)
        REFERENCES `detalle_ventas` (`id_venta`, `id_producto`)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================================
-- 7. ENVASADO, ETIQUETADO Y SELLADO - LA COSECHA
-- ============================================================================

CREATE TABLE IF NOT EXISTS `empaquetado` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_producto` BIGINT UNSIGNED NOT NULL,
    `id_usuario` BIGINT UNSIGNED NOT NULL,
    `tipo_envase` VARCHAR(100) NULL,
    `capacidad_ml` INT UNSIGNED NULL COMMENT 'Sin valor predeterminado: confirmar capacidad real',
    `tipo_tapa` VARCHAR(100) NULL,
    `etiqueta_colocada` BOOLEAN NOT NULL DEFAULT FALSE,
    `sello_colocado` BOOLEAN NOT NULL DEFAULT FALSE,
    `cantidad` INT UNSIGNED NOT NULL,
    `fecha_empaquetado` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `estado` ENUM('pendiente','en_proceso','completado') NOT NULL DEFAULT 'pendiente',
    `observaciones` TEXT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_empaquetado_producto_fecha` (`id_producto`, `fecha_empaquetado`),
    KEY `idx_empaquetado_usuario` (`id_usuario`),
    CONSTRAINT `chk_empaquetado_cantidad` CHECK (`cantidad` > 0),
    CONSTRAINT `chk_empaquetado_capacidad` CHECK (
        `capacidad_ml` IS NULL OR `capacidad_ml` > 0
    ),
    CONSTRAINT `fk_empaquetado_producto` FOREIGN KEY (`id_producto`)
        REFERENCES `productos` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_empaquetado_usuario` FOREIGN KEY (`id_usuario`)
        REFERENCES `usuarios` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Tabla nueva: bitacora de entradas, salidas y ajustes de inventario.
-- Los servicios deben modificar STOCK y registrar aqui en UNA transaccion.
CREATE TABLE IF NOT EXISTS `movimientos_inventario` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `id_producto` BIGINT UNSIGNED NOT NULL,
    `id_usuario` BIGINT UNSIGNED NOT NULL,
    `tipo` ENUM('entrada','salida','ajuste_entrada','ajuste_salida') NOT NULL,
    `cantidad` INT UNSIGNED NOT NULL,
    `stock_anterior` INT UNSIGNED NOT NULL,
    `stock_posterior` INT UNSIGNED NOT NULL,
    `id_compra` BIGINT UNSIGNED NULL,
    `id_venta` BIGINT UNSIGNED NULL,
    `id_empaquetado` BIGINT UNSIGNED NULL,
    `motivo` VARCHAR(255) NULL,
    `fecha` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_movimientos_producto_fecha` (`id_producto`, `fecha`),
    KEY `idx_movimientos_usuario` (`id_usuario`),
    KEY `idx_movimientos_compra` (`id_compra`),
    KEY `idx_movimientos_venta` (`id_venta`),
    KEY `idx_movimientos_empaquetado` (`id_empaquetado`),
    CONSTRAINT `chk_movimientos_cantidad` CHECK (`cantidad` > 0),
    CONSTRAINT `chk_movimientos_saldos` CHECK (
        (`tipo` IN ('entrada','ajuste_entrada')
            AND `stock_posterior` = `stock_anterior` + `cantidad`)
        OR
        (`tipo` IN ('salida','ajuste_salida')
            AND `stock_anterior` = `stock_posterior` + `cantidad`)
    ),
    CONSTRAINT `fk_movimientos_producto` FOREIGN KEY (`id_producto`)
        REFERENCES `productos` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_movimientos_usuario` FOREIGN KEY (`id_usuario`)
        REFERENCES `usuarios` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_movimientos_compra` FOREIGN KEY (`id_compra`)
        REFERENCES `compras` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_movimientos_venta` FOREIGN KEY (`id_venta`)
        REFERENCES `ventas` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT `fk_movimientos_empaquetado` FOREIGN KEY (`id_empaquetado`)
        REFERENCES `empaquetado` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================================
-- 8. CONSULTAS DE COMPROBACION / REPORTES
--    No se crean tablas para reportes, alertas, botones, encabezado, pie,
--    menu, fondo o proteccion antibots: se calculan o implementan en la app.
-- ============================================================================

-- Cuantas tablas hay en la base de datos:
SELECT COUNT(*) AS total_tablas
FROM information_schema.tables
WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE';

-- Inventario con alerta de minimo/maximo (consulta, sin tabla nueva):
-- SELECT p.id, p.nombre, s.stock_actual, s.stock_minimo, s.stock_maximo,
--        CASE WHEN s.stock_actual <= s.stock_minimo THEN 'MINIMO'
--             WHEN s.stock_actual >= s.stock_maximo THEN 'MAXIMO'
--             ELSE 'NORMAL' END AS alerta
-- FROM productos AS p
-- INNER JOIN stock AS s ON s.id_producto = p.id;

-- NOTAS DE INTEGRACION PARA LOS MICROSERVICIOS:
-- * Los hash de contrasenas/tokens/codigos se generan y verifican en backend.
-- * No almacenar numero completo de tarjeta, CVV ni credenciales del procesador.
-- * Antes de confirmar venta: validar stock y actualizarlo transaccionalmente.
-- * Los totales de pedido/venta/compra se recalculan en el backend.
-- * Las devoluciones no pueden superar unidades originales menos ya devueltas;
--   comprobar el acumulado desde los servicios con bloqueo transaccional.
-- * Verificar propiedad del cliente en envios y enlaces de pago al atender APIs.
-- * La base nueva no crea registros de salsas ni URLs de imagenes ficticias.
-- * Esta instalacion no elimina ni modifica estructuras previas ya existentes.
