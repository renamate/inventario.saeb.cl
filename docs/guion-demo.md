# Guion de demo (10 minutos)

Objetivo: mostrar con los datos reales del Excel que el sistema reemplaza el papel, las fórmulas y la doble hoja COMPRAR / STOCK CRÍTICO.
Antes de empezar, como administrador: **Administración → Reiniciar datos de la demo** (modo local) o vuelve a ejecutar `supabase/seed.sql`.

| Min. | Perfil | Qué mostrar | Qué decir |
|------|--------|-------------|-----------|
| 0–1 | — | Pantalla de ingreso con los 3 perfiles | Cada perfil ve y puede hacer cosas distintas; se valida en el servidor. |
| 1–2 | Encargada | **Inicio**: 162 productos activos, 15 críticos, 3 negativos, 4 por comprar | Cuadra con el DASHBOARD del Excel. El stock se calcula solo, sin fórmulas que se rompan. |
| 2–3 | Encargada | Tabla por almacén y "Requieren atención" | Los 6 almacenes son la base del presupuesto anual. Los negativos (SKU 278, 279, 357) vienen del stock inicial. |
| 3–4 | Encargada | **Catálogo**: buscar "249" y luego "higienico" | SKU 249 "Papel higiénico hoja simple 50 mt": stock inicial 1.218, existencia 1.122. Se busca por SKU, nombre o código de proveedor. |
| 4–6 | Voluntario (en el teléfono) | **Escanear** la etiqueta de "Bolsa basura 80x110" (SKU 180) → salida de 2 → Guardar | Menos de 30 segundos. Fecha, hora y UM automáticas. El voluntario solo puede registrar salidas. Stock 54 → 52. |
| 6–7 | Voluntario | Intentar escribir un SKU inexistente (p. ej. 999) | No deja registrar productos que no están en el maestro. |
| 7–9 | Encargada | **Compras**: alertas automáticas en *Por comprar* → "Comprado" → "Recibido" con ingreso a bodega | Una alerta crítica se convierte en compra sin volver a digitar proveedor ni código. Al recibir, el stock sube solo. Mostrar "Limpia tapiz karcher" con enlace a Easy. |
| 9–10 | Encargada | **Historial**: filtrar por hoy y tipo Salida → Exportar CSV. **Etiquetas QR**: imprimir las 10 de alta rotación | Cada movimiento queda con folio, responsable, fecha y hora. El CSV se abre directo en Excel. |

Cierre: próximos pasos del MVP (usuarios reales, PWA offline, gestión del maestro, reporte por almacén).
