export interface OrderLine {
  id_producto: number;
  nombre: string;
  imagen?: string | null;
  cantidad: number;
  precio_unitario: string;
  descuento_unitario: string;
}

export interface Order {
  id_pedido: number;
  id_venta: number | null;
  fecha: string;
  total: string;
  estado: string;
  num_guia: string | null;
  paqueteria: string | null;
  estado_envio: string | null;
  folio: string | null;
  items: OrderLine[];
  estado_pago?: string;
  fecha_envio?: string | null;
  fecha_entrega_real?: string | null;
  total_reembolsado?: string;
  domicilio_snapshot?: {
    calle_numero: string;
    colonia: string;
    ciudad: string;
    codigo_postal: string;
  } | null;
}