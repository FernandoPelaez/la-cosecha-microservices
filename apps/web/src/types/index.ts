export interface User {
  id: number;
  nombre: string;
  correo: string;
  telefono?: string;
  rol: string;
  clienteId: number | null;
  correo_verificado: boolean;
}
export interface Product {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: string;
  precio_final: string;
  imagen: string | null;
  rating?: number;
  review_count?: number;
  stock_actual: number;
  stock_minimo: number;
  stock_maximo: number;
  categoria: string | null;
}
export interface CartLine {
  id_producto: number;
  cantidad: number;
  nombre: string;
  precio: string;
  precio_final: string;
  stock_actual: number;
  imagen: string | null;
}
export interface Cart {
  id: number;
  items: CartLine[];
}
export interface Address {
  id: number;
  calle_numero: string;
  colonia: string;
  ciudad: string;
  codigo_postal: string;
  referencias: string | null;
}
export type RecordData = Record<string, unknown>;
