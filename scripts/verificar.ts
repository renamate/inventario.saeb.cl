/**
 * Verifica que los datos cuadren con el Excel y que el flujo básico funcione
 * contra el origen configurado (Neon si hay DATABASE_URL, si no el modo demo local).
 *
 * Uso: npm run verificar            (no modifica datos: solo lectura)
 *      npm run verificar -- --escribir   (además registra una salida y mueve una solicitud de prueba)
 */
import { repo } from "../src/lib/data";
import { indicadores } from "../src/lib/stock";
import seed from "../data/seed.json";

function afirmar(condicion: unknown, mensaje: string) {
  if (!condicion) {
    console.error(`✗ ${mensaje}`);
    process.exitCode = 1;
  } else {
    console.log(`✓ ${mensaje}`);
  }
}

async function main() {
  const r = repo();
  console.log(`Origen de datos: ${r.modo}`);
  const escribir = process.argv.includes("--escribir");

  const [productos, solicitudes, movimientos] = await Promise.all([r.listarStock(), r.listarSolicitudes(), r.listarMovimientos()]);
  const kpi = indicadores(productos, solicitudes);
  const excel = seed.excelIndicadores;
  if (!escribir) {
    afirmar(kpi.productosActivos === excel.productosActivos, `Productos activos ${kpi.productosActivos} = Excel ${excel.productosActivos}`);
    afirmar(kpi.stockCritico === excel.stockCritico, `Stock crítico ${kpi.stockCritico} = Excel ${excel.stockCritico}`);
    afirmar(kpi.stockNegativo === excel.stockNegativo, `Stock negativo ${kpi.stockNegativo} = Excel ${excel.stockNegativo}`);
    afirmar(kpi.porComprar === excel.porComprar, `Por comprar ${kpi.porComprar} = Excel ${excel.porComprar}`);
    afirmar(movimientos.length >= seed.movimientos.length, `Movimientos importados: ${movimientos.length}`);
  }

  const papel = await r.obtenerProducto(249);
  afirmar(papel?.stockInicial === 1218, `SKU 249 stock inicial 1.218 (${papel?.stockInicial})`);

  const filtrados = await r.listarMovimientos({ sku: 180, tipo: "salida" });
  afirmar(filtrados.every((m) => m.sku === 180 && m.tipo === "salida"), `Filtro historial SKU 180 salidas: ${filtrados.length}`);

  if (escribir) {
    const bolsa = (await r.obtenerProducto(180))!;
    const mov = await r.crearMovimiento({ sku: 180, tipo: "salida", cantidad: 2, responsable: "Verificación" }, "00000000-0000-4000-8000-000000000002");
    const despues = (await r.obtenerProducto(180))!;
    afirmar(despues.existencia === bolsa.existencia - 2, `Salida de 2 bolsas: ${bolsa.existencia} → ${despues.existencia} (folio ${mov.folio})`);

    const ajuste = await r.crearMovimiento({ sku: 180, tipo: "ajuste", cantidad: 2, responsable: "Verificación" }, "00000000-0000-4000-8000-000000000002");
    afirmar((await r.obtenerProducto(180))!.existencia === bolsa.existencia, `Ajuste +2 revierte (folio ${ajuste.folio})`);

    const sol = await r.crearSolicitud({ sku: 235, cantidad: 3, origen: "alerta" });
    afirmar(sol.estado === "por_comprar" && sol.producto.length > 0, `Solicitud desde alerta: ${sol.producto}`);
    const comprada = await r.cambiarEstadoSolicitud(sol.id, "comprado");
    afirmar(comprada.estado === "comprado" && comprada.fechaCompra, "Solicitud → Comprado");
    const recibida = await r.cambiarEstadoSolicitud(sol.id, "recibido", { cantidad: 3 });
    afirmar(recibida.estado === "recibido" && recibida.fechaRecepcion, "Solicitud → Recibido");

    try {
      await r.crearMovimiento({ sku: 999999, tipo: "salida", cantidad: 1, responsable: "Verificación" }, "00000000-0000-4000-8000-000000000002");
      afirmar(false, "Rechaza SKU inexistente");
    } catch {
      afirmar(true, "Rechaza SKU inexistente");
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
