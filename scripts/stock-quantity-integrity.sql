BEGIN;
CREATE OR REPLACE FUNCTION public.varelia_staff_stock_in(p_product_id uuid, p_qty numeric, p_event text DEFAULT 'restock'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_business uuid;
  v_role text;
  v_permissions jsonb;
  v_product public.varelia_products%rowtype;
  v_qty numeric;
  v_before numeric;
  v_after numeric;
  v_type text;
  v_source text;
begin
  if v_uid is null then raise exception 'Sesión no autorizada'; end if;

  select business_id, role, permissions
    into v_business, v_role, v_permissions
  from public.profiles
  where id=v_uid;

  if v_business is null then raise exception 'Cuenta sin negocio'; end if;

  if v_role <> 'owner'
     and coalesce((v_permissions->>'inventory')::boolean,false) is not true
 then
    raise exception 'No tienes permiso para reponer o devolver mercadería';
  end if;

  v_qty := round(coalesce(p_qty,0),3);
  if v_qty <= 0 OR v_qty::text IN ('NaN','Infinity','-Infinity') then raise exception 'La cantidad debe ser mayor a 0'; end if;

  if p_event not in ('restock','return') then
    raise exception 'Movimiento no permitido';
  end if;

  select * into v_product
  from public.varelia_products
  where id=p_product_id and business_id=v_business
  for update;

  if not found then raise exception 'Producto no encontrado'; end if;

  v_before := v_product.stock;
  v_after := v_before + v_qty;
  v_type := case when p_event='return' then 'return' else 'restock' end;
  v_source := case when p_event='return'
                   then 'Devolución de mercadería'
                   else 'Reposición de mercadería'
              end;

  update public.varelia_products
  set stock=v_after
  where id=v_product.id and business_id=v_business;

  insert into public.varelia_inventory_movements(
    business_id,product_id,product_name,category,unit,type,qty,
    stock_before,stock_after,source,created_by
  )
  values(
    v_business,v_product.id,v_product.name,null,v_product.unit,v_type,v_qty,
    v_before,v_after,v_source,v_uid
  );

  return jsonb_build_object(
    'product_id',v_product.id,
    'legacy_id',v_product.legacy_id,
    'event',v_type,
    'qty',v_qty,
    'stock_before',v_before,
    'stock_after',v_after
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.varelia_return_sale_item(p_sale_id uuid, p_sale_item_id uuid, p_qty numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_business uuid;
  v_role text;
  v_permissions jsonb;
  v_item public.varelia_sale_items%rowtype;
  v_product public.varelia_products%rowtype;
  v_qty numeric;
  v_stock_return numeric;
  v_before numeric;
  v_after numeric;
begin
  if v_uid is null then raise exception 'Sesión no autorizada'; end if;
  select business_id,role,permissions into v_business,v_role,v_permissions
  from public.profiles where id=v_uid;
  if v_business is null then raise exception 'Cuenta sin negocio'; end if;
  if v_role <> 'owner' and coalesce((v_permissions->>'sales')::boolean,false) is not true then
    raise exception 'No tienes permiso para registrar devoluciones';
  end if;

  v_qty:=round(coalesce(p_qty,0),3);
  if v_qty<=0 OR v_qty::text IN ('NaN','Infinity','-Infinity') then raise exception 'Cantidad de devolución no válida'; end if;
  if not exists(select 1 from public.varelia_sales where id=p_sale_id and business_id=v_business AND (v_role='owner' OR created_by=v_uid)) then
    raise exception 'Venta no encontrada';
  end if;

  select * into v_item from public.varelia_sale_items
  where id=p_sale_item_id and sale_id=p_sale_id and business_id=v_business
  for update;
  if not found then raise exception 'Producto de la venta no encontrado'; end if;
  if v_qty>(v_item.qty-v_item.returned_qty) then raise exception 'La devolución supera la cantidad vendida'; end if;
  if v_item.product_id is null then raise exception 'Producto no vinculado al inventario'; end if;

  select * into v_product from public.varelia_products
  where id=v_item.product_id and business_id=v_business for update;
  if not found then raise exception 'Producto no encontrado en inventario'; end if;

  v_stock_return:=round(v_qty*coalesce(v_item.stock_qty/nullif(v_item.qty,0),1),3);
  v_before:=v_product.stock;
  v_after:=v_before+v_stock_return;

  update public.varelia_products set stock=v_after
  where id=v_product.id and business_id=v_business;
  update public.varelia_sale_items set returned_qty=returned_qty+v_qty
  where id=v_item.id;

  insert into public.varelia_inventory_movements(
    business_id,product_id,product_name,category,unit,type,qty,stock_before,stock_after,source,created_by
  ) values(
    v_business,v_product.id,v_product.name,null,v_product.unit,'return',v_stock_return,v_before,v_after,
    'Devolución de venta',v_uid
  );

  return jsonb_build_object(
    'sale_id',p_sale_id,'sale_item_id',p_sale_item_id,'product_id',v_product.id,
    'legacy_id',v_product.legacy_id,'stock_after',v_after,
    'returned_qty',v_item.returned_qty+v_qty,'stock_returned',v_stock_return
  );
end;
$function$
;
COMMIT;
