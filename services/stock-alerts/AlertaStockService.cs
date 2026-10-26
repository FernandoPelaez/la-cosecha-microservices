namespace LaCosecha.Alertas;

// Regla inclusiva documentada por Ángel Alexis Ibarra Montoya.
// La interfaz WinForms se adapta a HTTP; inventario conserva la propiedad del stock.
public static class AlertaStockService
{
    public static bool EsStockMinimo(int actual, int minimo) => actual <= minimo;
    public static string Estado(int actual, int minimo, int maximo) =>
        EsStockMinimo(actual, minimo) ? "Mínimo" : actual >= maximo ? "Máximo" : "Normal";
}
