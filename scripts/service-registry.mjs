// Registro único de procesos. Los puertos y URLs se pueden cambiar en .env.
export const services = [
  { name: "auth", port: 4001, technology: "node" },
  { name: "inventory", port: 4002, technology: "node" },
  { name: "commerce", port: 4003, technology: "node" },
  { name: "suppliers", port: 4004, technology: "flask", env: "OPERATIONS" },
  { name: "returns", port: 4005, technology: "node" },
  { name: "packaging", port: 4006, technology: "node" },
  { name: "reviews", port: 4007, technology: "node" },
  { name: "reports", port: 4008, technology: "node" },
  {
    name: "orders",
    port: 4009,
    technology: "dotnet",
    project: "RegistroPedidosService.csproj",
  },
  { name: "history", port: 4010, technology: "fastapi" },
  { name: "shipping", port: 4011, technology: "flask" },
  { name: "roles", port: 4012, technology: "node" },
  {
    name: "stock-alerts",
    port: 4013,
    technology: "dotnet",
    env: "ALERTS",
    project: "StockAlerts.csproj",
  },
];
