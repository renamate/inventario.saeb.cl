-- Generado por scripts/import-excel.ts a partir de inv.xlsx
-- Ejecutar DESPUÉS de las migraciones. Es idempotente: limpia y recarga los datos.
begin;
truncate movimientos, solicitudes_compra, stock_inicial, producto_proveedor, productos, proveedores, unidades_medida, almacenes, periodos, perfiles restart identity cascade;

insert into perfiles (id, nombre, rol) values
  ('00000000-0000-4000-8000-000000000001', 'Voluntario demo', 'voluntario'),
  ('00000000-0000-4000-8000-000000000002', 'Encargada demo', 'encargada'),
  ('00000000-0000-4000-8000-000000000003', 'Administrador demo', 'admin'),
  ('00000000-0000-4000-8000-000000000099', 'Importación Excel', 'admin');
insert into periodos (anio, fecha_inicio, cerrado) values (2027, '2027-01-01', false);
insert into almacenes (nombre) values ('Alimento'), ('Elementos Limpieza'), ('Limpieza'), ('Maquillaje'), ('Oficina'), ('Primeros Auxilios');
insert into unidades_medida (codigo, descripcion) values ('Paq 50u', 'Paquete de 50 unidades'), ('Un', 'Unidad'), ('Paq', 'Paquete'), ('Paq 100u', 'Paquete de 100 unidades'), ('Caja', 'Caja'), ('Bidón', 'Bidón'), ('Paq 200u', 'Paquete de 200 unidades');
insert into proveedores (nombre, url_portal) values ('Baden Power', null), ('Easy', 'https://www.easy.cl'), ('Prisa', 'https://www.prisa.cl'), ('San Agustin', null);

-- PLACEHOLDER: full seed content follows in next commit
commit;
