-- Varelia: permisos profesionales de inventario.
-- Ejecutar en Supabase SQL Editor después de supabase/schema.sql.
-- Regla: owner/admin edita productos manualmente; vendedores solo cambian stock
-- mediante operaciones autorizadas de venta/devolución registradas en auditoría.

create or replace function public.varelia_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.business_id = public.varelia_business_id()
      and p.role = 'owner'
  )
$$;

-- Categorías y productos: lectura para miembros del negocio, escritura manual solo owner.
drop policy if exists "varelia_categories_insert" on public.varelia_categories;
drop policy if exists "varelia_categories_update" on public.varelia_categories;
drop policy if exists "varelia_categories_delete" on public.varelia_categories;
create policy "varelia_categories_insert" on public.varelia_categories for insert
  with check (business_id = public.varelia_business_id() and public.varelia_is_owner());
create policy "varelia_categories_update" on public.varelia_categories for update
  using (business_id = public.varelia_business_id() and public.varelia_is_owner())
  with check (business_id = public.varelia_business_id() and public.varelia_is_owner());
create policy "varelia_categories_delete" on public.varelia_categories for delete
  using (business_id = public.varelia_business_id() and public.varelia_is_owner());

drop policy if exists "varelia_products_insert" on public.varelia_products;
drop policy if exists "varelia_products_update" on public.varelia_products;
drop policy if exists "varelia_products_delete" on public.varelia_products;
create policy "varelia_products_insert" on public.varelia_products for insert
  with check (business_id = public.varelia_business_id() and public.varelia_is_owner());
create policy "varelia_products_update" on public.varelia_products for update
  using (business_id = public.varelia_business_id() and public.varelia_is_owner())
  with check (business_id = public.varelia_business_id() and public.varelia_is_owner());
create policy "varelia_products_delete" on public.varelia_products for delete
  using (business_id = public.varelia_business_id() and public.varelia_is_owner());

-- Ajustes manuales de inventario: solo owner. Los movimientos sale/return se crean
-- exclusivamente desde la función segura de abajo.
drop policy if exists "varelia_inventory_movements_insert" on public.varelia_inventory_movements;
create policy "varelia_inventory_movements_insert" on public.varelia_inventory_movements for insert
  with check (
    business_id = public.varelia_business_id()
    and public.varelia_is_owner()
    and type in ('add','subtract','purchase')
  );

-- El esquema anterior no contemplaba devolución.
alter table public.varelia_inventory_movements drop constraint if exists varelia_inventory_movements_type_check;
alter table public.varelia_inventory_movements
  add constraint varelia_inventory_movements_type_check
  check (type in ('add','subtract','sale','purchase','return'));

-- RPC atómica y auditada. SECURITY DEFINER permite actualizar stock sin dar al vendedor
-- permiso UPDATE directo sobre varelia_products.
create or replace function public.varelia_apply_stock_event(
  p_product_id uuid,
  p_qty numeric,
  p_event text,
  p_source text default null
)
returns table(product_id uuid, stock_before numeric, stock_after numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business uuid := public.varelia_business_id();
  v_product public.varelia_products%rowtype;
  v_before numeric;
  v_after numeric;
  v_delta numeric;
begin
  if auth.uid() is null or v_business is null then
    raise exception 'Sesión no autorizada';
  end if;
  if p_qty is null or p_qty <= 0 then
    raise exception 'La cantidad debe ser mayor a cero';
  end if;
  if p_event not in ('sale','return') then
    raise exception 'Evento de stock no permitido';
  end if;

  select * into v_product
  from public.varelia_products
  where id = p_product_id and business_id = v_business
  for update;
  if not found then raise exception 'Producto no encontrado'; end if;

  v_before := v_product.stock;
  v_delta := case when p_event='sale' then -p_qty else p_qty end;
  v_after := v_before + v_delta;
  if v_after < 0 then raise exception 'Stock insuficiente'; end if;

  update public.varelia_products
    set stock = v_after
    where id = p_product_id and business_id = v_business;

  insert into public.varelia_inventory_movements(
    business_id, product_id, product_name, category, unit, type, qty,
    stock_before, stock_after, source, created_by
  ) values (
    v_business, v_product.id, v_product.name, null, v_product.unit, p_event, p_qty,
    v_before, v_after, coalesce(p_source,p_event), auth.uid()
  );

  return query select v_product.id, v_before, v_after;
end;
$$;

revoke all on function public.varelia_apply_stock_event(uuid,numeric,text,text) from public;
grant execute on function public.varelia_apply_stock_event(uuid,numeric,text,text) to authenticated;
