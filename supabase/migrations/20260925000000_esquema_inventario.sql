-- Esquema del POC Inventario SAEB (bodega CDP).
-- El stock nunca se guarda a mano: se deriva de stock_inicial + movimientos (vista v_stock).

create extension if not exists pgcrypto;

create type rol_usuario as enum ('voluntario', 'encargada', 'admin');
create type tipo_movimiento as enum ('ingreso', 'salida', 'ajuste');
create type estado_solicitud as enum ('por_comprar', 'comprado', 'recibido');
create type origen_solicitud as enum ('alerta', 'manual');

create table perfiles (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  rol rol_usuario not null default 'voluntario',
  creado_en timestamptz not null default now()
);

create table almacenes (
  id serial primary key,
  nombre text not null unique
);

create table unidades_medida (
  id serial primary key,
  codigo text not null unique,
  descripcion text,
  contenido_unidades numeric
);

create table proveedores (
  id serial primary key,
  nombre text not null unique,
  url_portal text
);

create table productos (
  sku integer primary key,
  nombre text not null,
  descripcion_proveedor text,
  um_id integer not null references unidades_medida(id),
  especial boolean not null default false,
  stock_minimo numeric,
  almacen_id integer not null references almacenes(id),
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create unique index productos_nombre_unico on productos (lower(nombre));

create table producto_proveedor (
  sku integer not null references productos(sku) on delete cascade,
  proveedor_id integer not null references proveedores(id),
  codigo_proveedor text,
  observacion text,
  preferido boolean not null default false,
  primary key (sku, proveedor_id)
);

create table periodos (
  anio integer primary key,
  fecha_inicio date not null,
  cerrado boolean not null default false
);

create table stock_inicial (
  anio integer not null references periodos(anio),
  sku integer not null references productos(sku),
  cantidad numeric not null default 0,
  primary key (anio, sku)
);

create table solicitudes_compra (
  id uuid primary key default gen_random_uuid(),
  sku integer references productos(sku),
  producto_texto text,
  cantidad numeric not null check (cantidad > 0),
  um_id integer references unidades_medida(id),
  proveedor_id integer references proveedores(id),
  codigo_proveedor text,
  enlace text,
  estado estado_solicitud not null default 'por_comprar',
  origen origen_solicitud not null default 'manual',
  asignado_a text,
  fecha_solicitud timestamptz default now(),
  fecha_compra timestamptz,
  fecha_recepcion timestamptz,
  observacion text,
  creado_en timestamptz not null default now(),
  check (sku is not null or producto_texto is not null)
);

create table movimientos (
  id uuid primary key default gen_random_uuid(),
  folio text not null unique,
  fecha timestamptz not null default now(),
  sku integer not null references productos(sku),
  tipo tipo_movimiento not null,
  cantidad numeric not null,
  valor_unitario numeric,
  observacion text,
  responsable_id uuid references perfiles(id),
  responsable_nombre text not null,
  solicitud_compra_id uuid references solicitudes_compra(id),
  creado_en timestamptz not null default now(),
  constraint cantidad_con_signo check (
    (tipo = 'ajuste' and cantidad <> 0) or (tipo <> 'ajuste' and cantidad > 0)
  )
);
create index movimientos_sku_idx on movimientos (sku);
create index movimientos_fecha_idx on movimientos (fecha desc);

-- Folio correlativo por día (equivale al "yyyymmdd-0001" del Excel).
create or replace function asignar_folio() returns trigger
language plpgsql as $$
declare
  prefijo text;
  siguiente integer;
begin
  if new.folio is not null and new.folio <> '' then
    return new;
  end if;
  prefijo := to_char(new.fecha at time zone 'America/Santiago', 'YYYYMMDD');
  perform pg_advisory_xact_lock(hashtext('folio-' || prefijo));
  select coalesce(max(split_part(folio, '-', 2)::integer), 0) + 1
    into siguiente
    from movimientos
   where folio like prefijo || '-%';
  new.folio := prefijo || '-' || lpad(siguiente::text, 4, '0');
  return new;
end;
$$;

create trigger movimientos_folio
  before insert on movimientos
  for each row execute function asignar_folio();

-- Stock derivado. Regla de crítico igual al Excel:
-- no especial, existencia >= 0 y existencia <= mínimo (mínimo vacío = 0).
create or replace view v_stock as
with periodo as (
  select anio from periodos where not cerrado order by anio desc limit 1
),
mov as (
  select sku,
         coalesce(sum(cantidad) filter (where tipo = 'ingreso'), 0) as ingresos,
         coalesce(sum(cantidad) filter (where tipo = 'salida'), 0) as salidas,
         coalesce(sum(cantidad) filter (where tipo = 'ajuste'), 0) as ajustes
    from movimientos
   group by sku
),
base as (
  select p.sku, p.nombre, p.descripcion_proveedor, um.codigo as um, p.especial,
         p.stock_minimo, a.nombre as almacen, p.activo,
         coalesce(si.cantidad, 0) as stock_inicial,
         coalesce(m.ingresos, 0) as ingresos,
         coalesce(m.salidas, 0) as salidas,
         coalesce(m.ajustes, 0) as ajustes
    from productos p
    join unidades_medida um on um.id = p.um_id
    join almacenes a on a.id = p.almacen_id
    left join stock_inicial si on si.sku = p.sku and si.anio = (select anio from periodo)
    left join mov m on m.sku = p.sku
)
select base.*,
       stock_inicial + ingresos - salidas + ajustes as existencia,
       case
         when stock_inicial + ingresos - salidas + ajustes < 0 then 'negativo'
         when not especial and stock_inicial + ingresos - salidas + ajustes <= coalesce(stock_minimo, 0) then 'critico'
         else 'ok'
       end as estado
  from base;

create or replace view v_producto_proveedor as
select pp.sku, pv.nombre as proveedor, pv.url_portal, pp.codigo_proveedor, pp.observacion, pp.preferido
  from producto_proveedor pp
  join proveedores pv on pv.id = pp.proveedor_id;

create or replace view v_movimientos as
select m.id, m.folio, m.fecha, m.sku, p.nombre as producto, a.nombre as almacen, um.codigo as um,
       m.tipo, m.cantidad, m.valor_unitario, m.observacion, m.responsable_nombre as responsable,
       m.solicitud_compra_id
  from movimientos m
  join productos p on p.sku = m.sku
  join almacenes a on a.id = p.almacen_id
  join unidades_medida um on um.id = p.um_id;

create or replace view v_solicitudes as
select s.id, s.sku, coalesce(p.nombre, s.producto_texto) as producto, a.nombre as almacen,
       s.cantidad, um.codigo as um, pv.nombre as proveedor, s.codigo_proveedor, s.enlace,
       s.estado, s.origen, s.asignado_a, s.fecha_solicitud, s.fecha_compra, s.fecha_recepcion,
       s.observacion, s.creado_en
  from solicitudes_compra s
  left join productos p on p.sku = s.sku
  left join almacenes a on a.id = p.almacen_id
  left join unidades_medida um on um.id = s.um_id
  left join proveedores pv on pv.id = s.proveedor_id;

-- La app accede con la service role key desde el servidor (Server Actions),
-- que aplica los permisos por rol. RLS activo sin políticas: la anon key no ve nada.
alter table perfiles enable row level security;
alter table almacenes enable row level security;
alter table unidades_medida enable row level security;
alter table proveedores enable row level security;
alter table productos enable row level security;
alter table producto_proveedor enable row level security;
alter table periodos enable row level security;
alter table stock_inicial enable row level security;
alter table solicitudes_compra enable row level security;
alter table movimientos enable row level security;

alter view v_stock set (security_invoker = on);
alter view v_producto_proveedor set (security_invoker = on);
alter view v_movimientos set (security_invoker = on);
alter view v_solicitudes set (security_invoker = on);
