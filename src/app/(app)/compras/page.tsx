import type { Metadata } from "next";

import { Encabezado } from "@/components/encabezado";
import { repo } from "@/lib/data";
import { permisos } from "@/lib/permisos";
import { requerirUsuario } from "@/lib/sesion";
import { alertasSinSolicitud, cantidadSugerida } from "@/lib/stock";

import { TableroCompras, type TarjetaAlerta } from "./tablero-compras";

export const metadata: Metadata = { title: "Compras" };

export default async function ComprasPage() {
  const usuario = await requerirUsuario();
  const r = repo();
  const [productos, solicitudes] = await Promise.all([r.listarStock(), r.listarSolicitudes()]);

  const alertas: TarjetaAlerta[] = alertasSinSolicitud(productos, solicitudes).map((p) => {
    const pref = p.proveedores.find((pp) => pp.preferido) ?? p.proveedores[0];
    return {
      sku: p.sku,
      producto: p.nombre,
      almacen: p.almacen,
      um: p.um,
      existencia: p.existencia,
      stockMinimo: p.stockMinimo,
      estado: p.estado,
      cantidadSugerida: cantidadSugerida(p),
      proveedor: pref?.proveedor ?? null,
      codigoProveedor: pref?.codigoProveedor ?? null,
      urlPortal: pref?.urlPortal ?? null,
    };
  });

  const catalogo = productos.map((p) => ({ sku: p.sku, nombre: p.nombre, um: p.um }));

  return (
    <>
      <Encabezado
        titulo="Tablero de compras"
        descripcion="Stock crítico y plan de compras en una sola lista. Cada alerta se convierte en tarjeta sin volver a digitar datos."
      />
      <TableroCompras
        solicitudes={solicitudes}
        alertas={alertas}
        catalogo={catalogo}
        puedeGestionar={permisos.gestionarCompras(usuario.rol)}
        usuarioNombre={usuario.nombre}
      />
    </>
  );
}
