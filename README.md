# Inventario SAEB · Bodega CDP

Prueba de concepto (POC) del sistema digital de inventario de la bodega CDP del Salón de Asambleas El Belloto.
Reemplaza la hoja en papel, las fórmulas del Excel *SAEB 2027 Inventario CDP* y la doble hoja COMPRAR / STOCK CRÍTICO.

**Stack:** Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · shadcn/ui · Supabase (Postgres) · Vercel.

## Qué incluye

| # | Capacidad | Dónde |
|---|-----------|-------|
| 1 | Importación del Excel (162 productos, 6 almacenes, 25 movimientos, 4 compras) | `scripts/import-excel.ts` → `data/seed.json` y `supabase/seed.sql` |
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
cp .env.example .env.local   # opcional: sin Supabase funciona en modo demo local
npm run dev                  # http://localhost:4317
```

Ingresa con cualquiera de los 3 perfiles. En desarrollo, si no defines `DEMO_PASSWORD`, la clave es `saeb2027`.

### Modo demo local (sin Supabase)

Si no están las variables de Supabase, la app carga `data/seed.json` (los datos reales del Excel) y guarda los cambios en `.data/demo-db.json`.
En Vercel sin Supabase, los cambios viven en la memoria de la función y se pierden cuando se recicla: sirve para mostrar, no para operar.
El administrador puede volver al estado del Excel con **Administración → Reiniciar datos de la demo**.

### Scripts

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo en el puerto 4317 |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm run lint` | ESLint |
| `npm run import:excel -- "ruta/al/archivo.xlsx"` | Regenera `data/seed.json` y `supabase/seed.sql` desde el Excel |
| `npm run verificar` | Comprueba que los indicadores cuadren con el Excel (usa Supabase si está configurado) |
| `npm run verificar -- --escribir` | Además registra movimientos y solicitudes de prueba (no usar sobre datos reales) |

## Desplegar en Vercel + Supabase

### 1. Crear la base en Supabase

1. En [supabase.com/dashboard](https://supabase.com/dashboard) crea un proyecto (región recomendada: *South America (São Paulo)*). Guarda la contraseña de la base.
2. Abre **SQL Editor → New query**, pega el contenido de `supabase/migrations/20260925000000_esquema_inventario.sql` y ejecútalo.
3. En otra query, pega el contenido de `supabase/seed.sql` y ejecútalo. Carga los datos del Excel (se puede volver a ejecutar para reiniciar).
4. En **Project Settings → API Keys** copia la **Project URL** y la clave **service_role** (o una *secret key* `sb_secret_…`). Esta clave es solo para el servidor: no la publiques.

> Alternativa con la CLI: `npx supabase link --project-ref <ref>`, `npx supabase db push` y luego ejecuta `supabase/seed.sql` con `psql "<connection string>" -f supabase/seed.sql`.

### 2. Crear el proyecto en Vercel

1. En [vercel.com/new](https://vercel.com/new) importa este repositorio. Vercel detecta Next.js; no hay que cambiar el build.
2. En **Environment Variables** agrega:

   | Variable | Valor |
   |----------|-------|
   | `DEMO_PASSWORD` | Clave de acceso que compartirás con quienes prueben la demo |
   | `AUTH_SECRET` | Texto aleatorio largo (`openssl rand -base64 32`) |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL de Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | Clave service_role o secret key de Supabase |
   | `APP_URL` (opcional) | Dominio final, p. ej. `https://inventario.saeb.cl`, para que las etiquetas QR apunten ahí |

   Si prefieres, la integración **Supabase** de Vercel Marketplace crea `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` automáticamente; en ese caso ejecuta la migración y el seed en el proyecto que cree.
3. Pulsa **Deploy**. En el menú de usuario de la app debe aparecer "Datos: Supabase".
4. (Opcional) En **Settings → Domains** agrega `inventario.saeb.cl` y crea el registro CNAME que indica Vercel.

### 3. Proteger el acceso

- La app exige iniciar sesión en todas las rutas (incluida la exportación CSV). La clave es `DEMO_PASSWORD`.
- Con **Settings → Deployment Protection → Vercel Authentication** también quedan protegidas las URLs de *preview*.
- Todas las tablas tienen Row Level Security activo sin políticas públicas: la clave anónima de Supabase no puede leer nada. La app accede solo desde el servidor.

## Estructura

```
data/seed.json                 Datos del Excel normalizados (modo demo local)
scripts/import-excel.ts        Importador Excel → seed.json + seed.sql
scripts/verificar.ts           Verificación de indicadores y flujo
supabase/migrations/           Esquema Postgres, vistas y RLS
supabase/seed.sql              Carga de datos para Supabase
src/lib/data/                  Repositorio: local.ts (demo) y supabase.ts
src/lib/stock.ts               Reglas de stock (misma lógica que la vista v_stock)
src/app/acciones.ts            Server Actions con validación y permisos por rol
src/app/(app)/                 Páginas: dashboard, catálogo, registrar, compras, historial, etiquetas, roles, admin
docs/guion-demo.md             Guion de demo de 10 minutos
```

## Limitaciones conocidas del POC

- Los perfiles son de demostración con una clave compartida; el MVP usará Supabase Auth con usuarios reales.
- Sin operación offline (PWA con cola de sincronización queda para el MVP).
- Los 25 movimientos del Excel no tienen fecha: se importaron con fecha 18-sep-2026 y la observación "Importado del Excel (sin fecha original)".
- La cámara del navegador requiere HTTPS (en Vercel funciona; en local solo en `localhost`).
