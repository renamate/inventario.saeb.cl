# Inventario SAEB · Bodega CDP

Prueba de concepto (POC) del sistema digital de inventario de la bodega CDP del Salón de Asambleas El Belloto.
Reemplaza la hoja en papel, las fórmulas del Excel *SAEB 2027 Inventario CDP* y la doble hoja COMPRAR / STOCK CRÍTICO.

**Stack:** Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · shadcn/ui · Neon (Postgres) · Vercel.

## Qué incluye

| # | Capacidad | Dónde |
|---|-----------|-------|
| 1 | Importación del Excel (162 productos, 6 almacenes, 25 movimientos, 4 compras) | `scripts/import-excel.ts` → `data/seed.json` y `db/seed.sql` |
| 2 | Dashboard con los 4 indicadores del Excel (**162 / 15 / 3 / 4**) y desglose por almacén | `/` |
| 3 | Catálogo con búsqueda por SKU, nombre, proveedor o código, y filtros por almacén, especial y estado | `/catalogo`, `/catalogo/[sku]` |
| 4 | Registro de movimientos pensado para el teléfono: autocompletado SKU ↔ nombre solo sobre el catálogo, tipo, cantidad con reglas de signo, UM automática, fecha y hora automáticas, responsable | `/registrar` |
| 5 | Escaneo de QR o código de barra con la cámara y etiquetas QR imprimibles (al escanear se abre el registro con el producto cargado) | botón **Escanear**, `/etiquetas`, `/r/[sku]` |
| 6 | Tablero Kanban de compras: las alertas de stock crítico aparecen como tarjetas en *Por comprar* con proveedor y código precargados; se arrastran a *Comprado* y *Recibido* (opcionalmente registra el ingreso a bodega) | `/compras` |
| 7 | Historial filtrable por fecha, producto, almacén y tipo, con exportación a CSV (compatible con Excel en español) | `/historial` |
| 8 | Roles de demostración: voluntario, encargada y administrador, validados en el servidor | `/login`, `/roles`, `/admin` |

### Reglas de negocio implementadas

- **Existencia** = stock inicial 2027 + ingresos − salidas + ajustes. Nunca se guarda a mano (vista `v_stock`).
- **Stock crítico** (igual al Excel): producto **no especial** con existencia **≥ 0 y ≤ mínimo**. Un mínimo vacío cuenta como 0.
- **Stock negativo**: existencia < 0 (se cuenta aparte, como en el Excel).
- Salidas e ingresos con cantidad positiva; los ajustes llevan signo (+ agrega, − descuenta). La base de datos lo exige con un `CHECK`.
- No se puede registrar un SKU que no existe (llave foránea) ni duplicar nombres de producto (índice único sin distinguir mayúsculas).
- Folio correlativo por día: `yyyymmdd-0001`.

## Ejecutar en local

Requisitos: Node.js 20 o superior.

```bash
npm install
cp .env.example .env.local   # opcional: sin Neon funciona en modo demo local
npm run dev                  # http://localhost:4317
```

Ingresa con cualquiera de los 3 perfiles. En desarrollo, si no defines `DEMO_PASSWORD`, la clave es `saeb2027`.

### Modo demo local (sin Neon)

Si no está `DATABASE_URL`, la app carga `data/seed.json` (los datos reales del Excel) y guarda los cambios en `.data/demo-db.json`.
En Vercel sin Neon, los cambios viven en la memoria de la función y se pierden cuando se recicla: sirve para mostrar, no para operar.
El administrador puede volver al estado del Excel con **Administración → Reiniciar datos de la demo**.

### Scripts

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo en el puerto 4317 |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm run lint` | ESLint |
| `npm run import:excel -- "ruta/al/archivo.xlsx"` | Regenera `data/seed.json` y `db/seed.sql` desde el Excel |
| `npm run verificar` | Comprueba que los indicadores cuadren con el Excel (usa Neon si hay `DATABASE_URL`) |
| `npm run verificar -- --escribir` | Además registra movimientos y solicitudes de prueba (no usar sobre datos reales) |

## Desplegar en Vercel + Neon

### 1. Base de datos en Neon

1. En [console.neon.tech](https://console.neon.tech) crea un proyecto (región recomendada: *AWS South America East 1 — São Paulo*). Guarda el connection string.
2. Aplica el esquema: `psql "$DATABASE_URL" -f db/migrations/20260925000000_esquema_inventario.sql`
3. Carga los datos: `psql "$DATABASE_URL" -f db/seed.sql` (es idempotente; se puede volver a ejecutar para reiniciar).
4. Usa el connection string **pooled** (`…-pooler…`) en Vercel como `DATABASE_URL`.

Proyectos previstos:

| Entorno | Nombre Neon | Uso |
|---------|-------------|-----|
| Producción | `inventario-saeb-prod` | App pública / `inventario.saeb.cl` |
| Pruebas | `inventario-saeb-test` | Demos, reseeds, pruebas |

> **Storage de imágenes:** Neon Object Storage (branchable) aún no está disponible en São Paulo; cuando lo habiliten, crear el bucket `product-images` vía MCP/`create_storage_bucket`.

### 2. Proyecto en Vercel

1. En [vercel.com/new](https://vercel.com/new) importa este repositorio. Vercel detecta Next.js.
2. En **Environment Variables** (Production apuntando a Neon **prod**):

   | Variable | Valor |
   |----------|-------|
   | `DEMO_PASSWORD` | Clave compartida de los 3 perfiles demo |
   | `AUTH_SECRET` | Texto aleatorio largo (`openssl rand -base64 32`) |
   | `DATABASE_URL` | Connection string pooled de Neon prod |
   | `APP_URL` (opcional) | `https://inventario.saeb.cl` |

3. Pulsa **Deploy**. En el menú de usuario debe aparecer «Datos: Neon».
4. (Opcional) Preview/segundo proyecto Vercel con `DATABASE_URL` de `inventario-saeb-test`.
5. Dominio: `inventario.saeb.cl` → Production.

### 3. Acceso demo

- La app exige iniciar sesión. La clave es `DEMO_PASSWORD` (por defecto en desarrollo: `saeb2027`).
- Perfiles: **Voluntario**, **Encargada**, **Administrador** (misma clave).
- Con **Deployment Protection** de Vercel también quedan protegidas las URLs de preview.

## Estructura

```
data/seed.json                 Datos del Excel normalizados (modo demo local)
scripts/import-excel.ts        Importador Excel → seed.json + seed.sql
scripts/verificar.ts           Verificación de indicadores y flujo
db/migrations/                 Esquema Postgres, vistas y RLS
db/seed.sql                    Carga de datos para Neon
src/lib/data/                  Repositorio: local.ts (demo) y neon.ts
src/lib/stock.ts               Reglas de stock (misma lógica que la vista v_stock)
src/app/acciones.ts            Server Actions con validación y permisos por rol
src/app/(app)/                 Páginas: dashboard, catálogo, registrar, compras, historial, etiquetas, roles, admin
docs/guion-demo.md             Guion de demo de 10 minutos
```

## Limitaciones conocidas del POC

- Los perfiles son de demostración con una clave compartida; el MVP usará autenticación real.
- Sin operación offline (PWA con cola de sincronización queda para el MVP).
- Los 25 movimientos del Excel no tienen fecha: se importaron con fecha 18-sep-2026 y la observación "Importado del Excel (sin fecha original)".
- La cámara del navegador requiere HTTPS (en Vercel funciona; en local solo en `localhost`).
