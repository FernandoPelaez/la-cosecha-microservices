export class AppError extends Error {
  constructor(status, message, code = "VALIDATION") {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export function ensure(value, status, message) {
  if (!value) throw new AppError(status, message);
  return value;
}
