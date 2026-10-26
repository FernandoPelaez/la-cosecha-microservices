/** MySQL guarda UTC; datetime-local necesita la zona del navegador al editar. */
export function localDateTimeInput(value: string): string {
  const normalized = value.replace(" ", "T");
  const date = new Date(
    /[Zz]|[+-]\d\d:\d\d$/.test(normalized) ? normalized : normalized + "Z",
  );
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
