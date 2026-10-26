// Adaptado de Paul: se conserva bcrypt y la separación de responsabilidades.
import bcrypt from "bcryptjs";
export const generarHash = (password) => bcrypt.hash(password, 12);
export const verificarPassword = (password, hash) =>
  bcrypt.compare(password, hash);
