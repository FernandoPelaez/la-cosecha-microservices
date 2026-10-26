import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { query } from "../../packages/core/db.mjs";
import { ensure } from "../../packages/core/errors.mjs";
import { cents, decimal } from "../../packages/core/money.mjs";
import { sendMail } from "../../packages/core/mail.mjs";

// Configuración visual del comprobante A4.
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const MARGIN = 48;
const ROW_HEIGHT = 78;
const MAX_CONTENT_Y = 732;
const TOTAL_CLEARANCE = 90;

const COLORS = {
  primary: "#83110E",
  brown: "#4B3029",
  text: "#302622",
  muted: "#756A63",
  line: "#E3DAD3",
};

const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function money(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    throw new Error("El comprobante contiene un importe no válido.");
  }

  return currency.format(amount);
}

function formatDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(value);
  }

  return String(value ?? "");
}

// Dibuja texto sin permitir que los campos extensos invadan otros bloques.
function text(doc, value, x, y, width, options = {}) {
  const config = {
    width,
    align: options.align ?? "left",
  };

  if (options.height !== undefined) {
    config.height = options.height;
    config.ellipsis = true;
  }

  doc
    .font(options.bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(options.size ?? 10)
    .fillColor(options.color ?? COLORS.text)
    .text(String(value ?? ""), x, y, config);
}

function rule(doc, y, color = COLORS.line, thickness = 0.75) {
  doc
    .moveTo(MARGIN, y)
    .lineTo(doc.page.width - MARGIN, y)
    .strokeColor(color)
    .lineWidth(thickness)
    .stroke();
}

function findPublicDirectory() {
  for (const origin of [process.cwd(), MODULE_DIR]) {
    let current = path.resolve(origin);

    while (true) {
      const directory = path.join(current, "apps", "web", "public");
      const logo = path.join(directory, "logo", "la-cosecha.png");

      if (fs.existsSync(logo)) {
        return directory;
      }

      const parent = path.dirname(current);

      if (parent === current) {
        break;
      }

      current = parent;
    }
  }

  throw new Error("No se encontró apps/web/public/logo/la-cosecha.png.");
}

function productImageFile(publicDirectory, imageUrl) {
  if (typeof imageUrl !== "string") {
    return null;
  }

  const relativeUrl = imageUrl.split(/[?#]/, 1)[0];

  if (!relativeUrl.startsWith("/images/")) {
    return null;
  }

  const imagesDirectory = path.resolve(publicDirectory, "images");
  const file = path.resolve(publicDirectory, `.${relativeUrl}`);

  // Bloquea rutas externas al directorio público de imágenes, incluidos enlaces simbólicos.
  if (!file.startsWith(`${imagesDirectory}${path.sep}`)) {
    return null;
  }

  try {
    if (!fs.statSync(file).isFile()) {
      return null;
    }

    const realImagesDirectory = fs.realpathSync(imagesDirectory);
    const realFile = fs.realpathSync(file);

    return realFile.startsWith(`${realImagesDirectory}${path.sep}`)
      ? realFile
      : null;
  } catch {
    return null;
  }
}

// Encabezado sin la línea decorativa superior señalada en el comprobante anterior.
function drawHeader(doc, logoFile, folio, continuation = false) {
  if (continuation) {
    doc.image(logoFile, MARGIN, 52, { fit: [49, 49] });

    text(doc, "LA COSECHA", 112, 55, 285, {
      size: 18,
      bold: true,
      color: COLORS.primary,
      height: 26,
    });

    text(doc, `Comprobante de compra · ${folio}`, 112, 82, 425, {
      size: 9,
      color: COLORS.muted,
      height: 17,
    });

    rule(doc, 121, COLORS.line, 1);
    return;
  }

  doc.image(logoFile, MARGIN, 53, { fit: [78, 78] });

  text(doc, "LA COSECHA", 146, 58, 393, {
    size: 25,
    bold: true,
    color: COLORS.primary,
    height: 34,
  });

  text(doc, "De nuestra tierra a tu mesa", 146, 94, 391, {
    size: 10.5,
    color: COLORS.brown,
    height: 18,
  });

  text(doc, "COMPROBANTE DE COMPRA", 146, 118, 391, {
    size: 8.5,
    bold: true,
    color: COLORS.muted,
    height: 17,
  });

  rule(doc, 153, COLORS.primary, 1.15);
}

// Datos del pedido en una retícula de dos columnas, sin tarjetas ni recuadros.
function drawDetails(doc, data) {
  const rightColumnX = 325;
  const rightColumnWidth = doc.page.width - MARGIN - rightColumnX;

  text(doc, "FOLIO", MARGIN, 176, 245, {
    size: 8,
    bold: true,
    color: COLORS.muted,
  });

  text(doc, data.folio, MARGIN, 195, 248, {
    size: 16,
    bold: true,
    color: COLORS.primary,
    height: 25,
  });

  text(doc, "FECHA DE COMPRA", rightColumnX, 176, rightColumnWidth, {
    size: 8,
    bold: true,
    color: COLORS.muted,
  });

  text(doc, formatDate(data.fecha), rightColumnX, 197, rightColumnWidth, {
    size: 10,
    height: 30,
  });

  text(doc, "CLIENTE", MARGIN, 245, 245, {
    size: 8,
    bold: true,
    color: COLORS.muted,
  });

  text(doc, data.nombre, MARGIN, 263, 253, {
    size: 11,
    height: 34,
  });

  if (data.correo) {
    text(doc, "CORREO ELECTRÓNICO", rightColumnX, 245, rightColumnWidth, {
      size: 8,
      bold: true,
      color: COLORS.muted,
    });

    text(doc, data.correo, rightColumnX, 263, rightColumnWidth, {
      size: 9,
      height: 34,
    });
  }

  text(
    doc,
    `Pedido #${data.id_pedido ?? "—"} · Estado: ${data.estado_pedido ?? "pagado"} · Pago: ${data.estado_pago ?? "capturado"}`,
    MARGIN,
    300,
    499,
    { size: 8, height: 12 },
  );
  rule(doc, 320);
}

function drawTableHeading(doc, y) {
  text(doc, "PRODUCTO", 126, y, 177, {
    size: 8,
    bold: true,
    color: COLORS.muted,
  });

  text(doc, "CANT.", 315, y, 44, {
    size: 8,
    bold: true,
    align: "center",
    color: COLORS.muted,
  });

  text(doc, "P. UNITARIO", 371, y, 85, {
    size: 8,
    bold: true,
    align: "right",
    color: COLORS.muted,
  });

  text(doc, "IMPORTE", 464, y, 83, {
    size: 8,
    bold: true,
    align: "right",
    color: COLORS.muted,
  });

  rule(doc, y + 23, COLORS.brown, 0.85);
  return y + 30;
}

function drawImage(doc, imageFile, y) {
  if (imageFile) {
    try {
      doc.image(imageFile, MARGIN + 7, y + 11, {
        fit: [55, 55],
        align: "center",
        valign: "center",
      });
      return;
    } catch {
      // Una imagen dañada no debe impedir la entrega del comprobante.
    }
  }

  text(doc, "Sin imagen", MARGIN + 2, y + 29, 67, {
    size: 7,
    align: "center",
    color: COLORS.muted,
    height: 12,
  });
}

function drawProduct(doc, item, imageFile, y) {
  drawImage(doc, imageFile, y);

  text(doc, item.nombre, 126, y + 16, 180, {
    size: 10,
    bold: true,
    height: 46,
  });

  text(doc, item.cantidad, 315, y + 28, 44, {
    size: 10,
    align: "center",
    height: 22,
  });

  text(doc, money(item.precio_unitario), 371, y + 28, 85, {
    size: 10,
    align: "right",
    height: 22,
  });

  const amount = Number(item.cantidad) * Number(item.precio_unitario);

  text(doc, money(amount), 464, y + 28, 83, {
    size: 10,
    bold: true,
    align: "right",
    color: COLORS.primary,
    height: 22,
  });

  rule(doc, y + ROW_HEIGHT, COLORS.line, 0.65);
}

function drawTotal(doc, data, y) {
  rule(doc, y, COLORS.primary, 1.55);

  text(doc, "TOTAL DE LA COMPRA", MARGIN, y + 21, 252, {
    size: 11,
    bold: true,
    color: COLORS.brown,
    height: 22,
  });

  text(doc, money(data.total), 328, y + 12, 219, {
    size: 22,
    bold: true,
    align: "right",
    color: COLORS.primary,
    height: 32,
  });

  if (Number(data.descuento_total) > 0)
    text(
      doc,
      `Descuento aplicado: ${money(data.descuento_total)}`,
      MARGIN,
      y + 47,
      499,
      { size: 8, color: COLORS.muted, height: 12 },
    );
  text(
    doc,
    "Todos los importes están expresados en pesos mexicanos (MXN).",
    MARGIN,
    y + 62,
    499,
    { size: 8, color: COLORS.muted, height: 14 },
  );
}

// El pie conserva la aclaración fiscal y muestra la numeración real de páginas.
function drawFooters(doc) {
  const { start, count } = doc.bufferedPageRange();

  for (let i = 0; i < count; i += 1) {
    doc.switchToPage(start + i);
    rule(doc, 758);

    text(doc, "GRACIAS POR TU COMPRA", MARGIN, 773, 300, {
      size: 8.5,
      bold: true,
      color: COLORS.primary,
      height: 15,
    });

    text(
      doc,
      "Comprobante de compra. No es una factura fiscal.",
      MARGIN,
      792,
      385,
      {
        size: 8,
        color: COLORS.muted,
        height: 14,
      },
    );

    text(doc, `Página ${i + 1} de ${count}`, 435, 773, 112, {
      size: 8,
      align: "right",
      color: COLORS.muted,
      height: 15,
    });
  }
}

// Consulta, permisos de acceso y selección de imágenes: lógica original conservada.
export async function receipt(user, id) {
  const [record] = await query(
    `SELECT c.*,v.id_cliente,v.total,v.fecha,v.id_pedido,
      COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p.cliente_snapshot,'$.nombre')),u.nombre) AS nombre,
      COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p.cliente_snapshot,'$.correo')),u.correo) AS correo,
      p.estado AS estado_pedido,pg.estado AS estado_pago
      FROM comprobantes c JOIN ventas v ON v.id=c.id_venta
      JOIN pedidos p ON p.id=v.id_pedido JOIN pagos pg ON pg.id_pedido=p.id
      JOIN clientes cl ON cl.id=v.id_cliente JOIN usuarios u ON u.id=cl.id_usuario
      WHERE c.id_venta=?`,
    [id],
  );
  ensure(
    record &&
      (user.rol === "ADMIN" ||
        (user.rol === "CLIENTE" && record.id_cliente === user.clienteId)),
    404,
    "Comprobante no encontrado",
  );
  const items = await query(
    `SELECT d.*,COALESCE(dp.nombre_snapshot,p.nombre) AS nombre,
      dp.imagen_snapshot AS url_imagen,dp.descuento_unitario
      FROM detalle_ventas d JOIN ventas v ON v.id=d.id_venta
      JOIN detalle_pedidos dp ON dp.id_pedido=v.id_pedido AND dp.id_producto=d.id_producto
      JOIN productos p ON p.id=d.id_producto WHERE d.id_venta=?`,
    [id],
  );
  const discount = items.reduce(
    (total, item) => total + cents(item.descuento_unitario) * item.cantidad,
    0,
  );
  return { ...record, items, descuento_total: decimal(discount) };
}

export async function receiptPDF(data) {
  const publicDirectory = findPublicDirectory();
  const logoFile = path.join(publicDirectory, "logo", "la-cosecha.png");
  const items = Array.isArray(data.items) ? data.items : [];

  const doc = new PDFDocument({
    size: "A4",
    margin: 0,
    bufferPages: true,
    info: {
      Title: `Comprobante de compra ${data.folio}`,
      Author: "LA COSECHA",
      Subject: "Comprobante de compra no fiscal",
    },
  });

  const chunks = [];
  const done = new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  try {
    drawHeader(doc, logoFile, data.folio);
    drawDetails(doc, data);

    text(doc, "DETALLE DE PRODUCTOS", MARGIN, 335, 320, {
      size: 12,
      bold: true,
      color: COLORS.brown,
      height: 20,
    });

    let y = drawTableHeading(doc, 371);

    for (const [index, item] of items.entries()) {
      const isLast = index === items.length - 1;

      // Evita dividir una fila y mantiene el total junto al último producto.
      if (
        y + ROW_HEIGHT > MAX_CONTENT_Y ||
        (isLast && y + ROW_HEIGHT + TOTAL_CLEARANCE > MAX_CONTENT_Y)
      ) {
        doc.addPage();
        drawHeader(doc, logoFile, data.folio, true);
        y = drawTableHeading(doc, 155);
      }

      const imageFile = productImageFile(publicDirectory, item.url_imagen);
      drawProduct(doc, item, imageFile, y);
      y += ROW_HEIGHT;
    }

    // Prevé también pedidos sin productos y otros casos de espacio insuficiente.
    if (y + TOTAL_CLEARANCE > MAX_CONTENT_Y) {
      doc.addPage();
      drawHeader(doc, logoFile, data.folio, true);
      y = 156;
    }

    drawTotal(doc, data, y + 21);
    drawFooters(doc);
    doc.end();
  } catch (error) {
    doc.destroy(error);
  }

  return done;
}

// El envío y las actualizaciones de estado mantienen su comportamiento original.
export async function emailReceipt(user, id) {
  const data = await receipt(user, id);
  const pdf = await receiptPDF(data);

  await sendMail(
    data.correo,
    `Tu compra ${data.folio} — LA COSECHA`,
    `Adjuntamos el comprobante de tu compra ${data.folio}.`,
    [
      {
        filename: `${data.folio}.pdf`,
        content: pdf,
      },
    ],
  );

  await query("UPDATE comprobantes SET enviado_correo=TRUE WHERE id=?", [
    data.id,
  ]);

  await query(
    "UPDATE cola_comprobantes SET estado='enviado',ultimo_error=NULL WHERE id_venta=?",
    [id],
  );

  return {
    sent: true,
    accepted: true,
    message:
      "El servidor de correo aceptó el comprobante; revisa tu bandeja y correo no deseado",
  };
}
