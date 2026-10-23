BEGIN;
CREATE SCHEMA IF NOT EXISTS private;
ALTER TABLE public.varelia_sale_items ADD COLUMN IF NOT EXISTS variant_values jsonb;
CREATE TABLE IF NOT EXISTS private.varelia_checkout_requests(
 business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 request_id uuid NOT NULL, fingerprint text NOT NULL,response jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(business_id,user_id,request_id));
REVOKE ALL ON private.varelia_checkout_requests FROM PUBLIC,anon,authenticated;
ALTER TABLE private.varelia_checkout_requests ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.varelia_commit_sale(p_items jsonb, p_source text DEFAULT 'Venta'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_variant_values jsonb;
  v_variant_index integer;
  v_variant_stock numeric;
  v_request uuid;
  v_fingerprint text;
  v_previous record;
  v_response jsonb;
  v_uid uuid := auth.uid();
  v_business uuid;
  v_role text;
  v_permissions jsonb;
  v_sale_id uuid;
  v_total numeric := 0;
  v_results jsonb := '[]'::jsonb;
  x jsonb;
  v_product public.varelia_products%rowtype;
  v_qty numeric;
  v_stock_qty numeric;
  v_before numeric;
  v_after numeric;
  v_item_id uuid;
  v_unit text;
  v_product_unit text;
  v_buy_unit text;
  v_price numeric;
  v_cost numeric;
  v_size numeric;
  v_buy_size numeric;
  v_presentation jsonb;
  v_presentation_id text;
  v_pricing_mode text;
  v_advanced jsonb;
  v_min_qty numeric;
  v_promo_type text;
  v_promo_value numeric;
  v_promo_start date;
  v_promo_end date;
  v_units_per_box numeric;
begin
  if v_uid is null then raise exception 'Sesión no autorizada'; end if;

  select business_id,role,permissions into v_business,v_role,v_permissions
  from public.profiles where id=v_uid;
  if v_business is null then raise exception 'Cuenta sin negocio'; end if;
  if v_role <> 'owner' and coalesce((v_permissions->>'sales')::boolean,false) is not true then
    raise exception 'No tienes permiso para vender';
  end if;
  if jsonb_typeof(coalesce(p_items,'[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_items,'[]'::jsonb))=0 then
    raise exception 'La venta no tiene productos';
  end if;

  IF jsonb_array_length(p_items)>1000 THEN RAISE EXCEPTION 'La venta tiene demasiados filas'; END IF;
  v_request:=nullif(p_items->0->>'request_id','')::uuid;
  IF v_request IS NOT NULL THEN
    v_fingerprint:=md5(p_items::text||coalesce(p_source,'Venta'));
    PERFORM pg_advisory_xact_lock(hashtextextended(v_business::text||v_uid::text||v_request::text,0));
    SELECT * INTO v_previous FROM private.varelia_checkout_requests
      WHERE business_id=v_business AND user_id=v_uid AND request_id=v_request;
    IF FOUND THEN
      IF v_previous.fingerprint<>v_fingerprint THEN RAISE EXCEPTION 'El intento de cobro cambió; revisa el carrito'; END IF;
      RETURN v_previous.response;
    END IF;
  END IF;

  insert into public.varelia_sales(business_id,total,created_by)
  values(v_business,0,v_uid) returning id into v_sale_id;

  for x in select value from jsonb_array_elements(p_items) loop
    v_qty := round(coalesce((x->>'qty')::numeric,0),3);
    if v_qty <= 0 OR v_qty::text IN ('NaN','Infinity','-Infinity') then raise exception 'Cantidad de venta no válida'; end if;

    select * into v_product from public.varelia_products
    where id=(x->>'product_id')::uuid and business_id=v_business for update;
    if not found then raise exception 'Producto no encontrado'; end if;

    v_product_unit := lower(translate(coalesce(v_product.unit,'Unidad'),'íÍ','iI'));
    v_unit := lower(translate(coalesce(nullif(x->>'sale_unit',''),v_product.unit),'íÍ','iI'));
    v_buy_unit := lower(translate(coalesce(nullif(v_product.purchase_cost_unit,''),v_product.unit),'íÍ','iI'));
    v_units_per_box := greatest(1,coalesce(v_product.units_per_box,1));
    v_stock_qty := v_qty;
    v_price := v_product.sell_price;
    v_cost := null;
    v_size := 1;
    v_buy_size := null;
    v_presentation := null;
    v_presentation_id := nullif(btrim(coalesce(x->>'presentation_id','')),'');
    v_pricing_mode := lower(btrim(coalesce(x->>'pricing_mode','')));
    v_advanced := coalesce(v_product.advanced_pricing,'{}'::jsonb);

    if v_product.medicine and x ? 'sale_unit' then
      if v_qty <> trunc(v_qty) then raise exception 'La presentación requiere cantidad entera'; end if;
      if coalesce(v_product.units_per_blister,0)<=0 or coalesce(v_product.blisters_per_box,0)<=0 then
        raise exception 'Configura las cantidades de la caja y blíster';
      end if;
      case v_unit
        when 'caja' then v_size:=v_product.units_per_blister*v_product.blisters_per_box; v_price:=v_product.box_price;
        when 'blister' then v_size:=v_product.units_per_blister; v_price:=v_product.blister_price;
        when 'pastilla' then v_size:=1; v_price:=coalesce(nullif(v_product.unit_medicine_price,0),v_product.sell_price);
        when 'unidad' then v_size:=1; v_price:=coalesce(nullif(v_product.unit_medicine_price,0),v_product.sell_price);
        else raise exception 'Presentación no válida';
      end case;
      v_stock_qty:=v_qty*v_size;
      case v_buy_unit
        when 'caja' then v_buy_size:=v_product.units_per_blister*v_product.blisters_per_box;
        when 'blister' then v_buy_size:=v_product.units_per_blister;
        when 'pastilla' then v_buy_size:=1;
        when 'unidad' then v_buy_size:=1;
        else v_buy_size:=null;
      end case;
      if v_buy_size>0 then v_cost:=v_product.buy_price*v_size/v_buy_size; end if;

    elsif v_presentation_id is not null then
      if v_product.medicine then raise exception 'Los medicamentos usan sus presentaciones de medicamento'; end if;
      select e into v_presentation
      from jsonb_array_elements(coalesce(v_product.sale_presentations,'[]'::jsonb)) e
      where e->>'id'=v_presentation_id limit 1;
      if v_presentation is null then raise exception 'Presentación de venta no encontrada'; end if;
      if lower(coalesce(v_presentation->>'active','true'))='false' then raise exception 'La presentación de venta está desactivada'; end if;
      v_size:=round(coalesce((v_presentation->>'units')::numeric,0),3);
      v_price:=round(coalesce((v_presentation->>'price')::numeric,0),2);
      if v_size<=0 then raise exception 'La presentación no tiene una cantidad válida'; end if;
      if v_price<=0 then raise exception 'La presentación no tiene un precio válido'; end if;
      if v_qty<>trunc(v_qty) then raise exception 'La presentación requiere cantidad entera'; end if;
      v_unit:=coalesce(nullif(btrim(v_presentation->>'name'),''),v_product.unit);

      -- For products whose base stock is stored in Cajas, presentation units are
      -- individual pieces inside the box. Convert pieces back to fractional boxes.
      if v_product_unit in ('caja','cajas','box') and v_units_per_box>1 then
        v_stock_qty:=v_qty*v_size/v_units_per_box;
      else
        v_stock_qty:=v_qty*v_size;
      end if;

      if v_product_unit=v_buy_unit then
        if v_product_unit in ('caja','cajas','box') and v_units_per_box>1 then
          v_cost:=v_product.buy_price*v_size/v_units_per_box;
        else
          v_cost:=v_product.buy_price*v_size;
        end if;
      elsif v_product_unit='kg' and v_buy_unit in ('g','gramo','gramos') then
        v_cost:=v_product.buy_price*1000*v_size;
      elsif v_product_unit in ('g','gramo','gramos') and v_buy_unit='kg' then
        v_cost:=v_product.buy_price/1000*v_size;
      end if;

    else
      if x ? 'sale_unit' and v_unit <> v_product_unit then
        if v_product_unit='kg' and v_unit in ('g','gramo','gramos') then
          v_stock_qty:=v_qty/1000;
          v_price:=v_product.sell_price/1000;
        elsif v_pricing_mode <> 'wholesale' then
          raise exception 'La medida no coincide con el producto';
        end if;
      end if;

      if v_product_unit=v_buy_unit then
        if v_product_unit in ('caja','cajas','box') and v_units_per_box>1 and v_pricing_mode='wholesale' then
          v_cost:=v_product.buy_price/v_units_per_box;
        else
          v_cost:=v_product.buy_price;
        end if;
      elsif v_product_unit='kg' and v_buy_unit in ('g','gramo','gramos') then
        v_cost:=v_product.buy_price*1000;
      elsif v_product_unit in ('g','gramo','gramos') and v_buy_unit='kg' then
        v_cost:=v_product.buy_price/1000;
      end if;

      if v_pricing_mode='wholesale' then
        if lower(coalesce(v_advanced->>'wholesaleEnabled','false'))<>'true' then raise exception 'El precio mayorista no está activado'; end if;
        v_min_qty:=greatest(2,coalesce((v_advanced->>'wholesaleMinQty')::numeric,0));
        if v_qty<v_min_qty then raise exception 'El precio mayorista aplica desde % unidades',v_min_qty; end if;
        v_price:=round(coalesce((v_advanced->>'wholesalePrice')::numeric,0),2);
        if v_price<=0 then raise exception 'Configura el precio mayorista'; end if;
        v_unit:='Mayorista';
        if v_product_unit in ('caja','cajas','box') and v_units_per_box>1 then
          v_stock_qty:=v_qty/v_units_per_box;
        end if;
      end if;
    end if;

    -- Independent purchase cost for the selected commercial presentation.
    if v_presentation_id is not null and v_presentation->'buyCost' is not null
       and v_presentation->'buyCost' <> 'null'::jsonb then
      if jsonb_typeof(v_presentation->'buyCost') <> 'number' then
        raise exception 'Costo de compra de la presentación no válido';
      end if;
      v_cost := (v_presentation->>'buyCost')::numeric;
      if v_cost < 0 then raise exception 'Costo de compra de la presentación no válido'; end if;
    end if;

    if lower(coalesce(v_advanced->>'promoEnabled','false'))='true' then
      v_promo_start:=null; v_promo_end:=null;
      if coalesce(v_advanced->>'promoStart','') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then v_promo_start:=(v_advanced->>'promoStart')::date; end if;
      if coalesce(v_advanced->>'promoEnd','') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then v_promo_end:=(v_advanced->>'promoEnd')::date; end if;
      if (v_promo_start is null or current_date>=v_promo_start) and (v_promo_end is null or current_date<=v_promo_end) then
        v_promo_type:=lower(coalesce(v_advanced->>'promoType','percent'));
        v_promo_value:=greatest(0,coalesce((v_advanced->>'promoValue')::numeric,0));
        if v_promo_value>0 then
          if v_promo_type='fixed' then v_price:=round(greatest(0.01,v_price-v_promo_value),2);
          else v_price:=round(greatest(0.01,v_price*(1-least(100,v_promo_value)/100)),2); end if;
        end if;
      end if;
    end if;

    if v_price is null or v_price<0 then raise exception 'Precio no válido'; end if;
    if x ? 'unit_price' and abs((x->>'unit_price')::numeric-v_price)>0.000001 then
      raise exception 'El precio cambió. Actualiza el carrito antes de cobrar.';
    end if;

    v_variant_values:=coalesce(x->'variant_values','[]'::jsonb);
    v_variant_index:=NULL;
    IF jsonb_array_length(coalesce(v_product.variant_combinations,'[]'::jsonb))>0 THEN
      SELECT (ordinality-1)::integer,(value->>'stock')::numeric INTO v_variant_index,v_variant_stock
      FROM jsonb_array_elements(v_product.variant_combinations) WITH ORDINALITY
      WHERE value->'values'=v_variant_values LIMIT 1;
      IF v_variant_index IS NULL THEN RAISE EXCEPTION 'Selecciona la talla o color de %',v_product.name; END IF;
      IF v_variant_stock IS NULL OR v_variant_stock<v_stock_qty THEN RAISE EXCEPTION 'Stock insuficiente para la talla o color de %',v_product.name; END IF;
    END IF;
    v_before:=v_product.stock;
    if v_before is null or v_before<v_stock_qty then raise exception 'Stock insuficiente para %',v_product.name; end if;
    v_after:=v_before-v_stock_qty;
    update public.varelia_products set stock=v_after,
      variant_combinations=CASE WHEN v_variant_index IS NULL THEN variant_combinations ELSE
        jsonb_set(variant_combinations,ARRAY[v_variant_index::text,'stock'],to_jsonb(v_variant_stock-v_stock_qty)) END
    where id=v_product.id and business_id=v_business;

    insert into public.varelia_sale_items(
      sale_id,business_id,product_id,product_name,unit_price,qty,buy_price_at_sale,returned_qty,
      sale_unit,stock_qty,sale_presentation_id,sale_presentation_units,variant_values
    ) values(
      v_sale_id,v_business,v_product.id,v_product.name,v_price,v_qty,v_cost,0,v_unit,v_stock_qty,v_presentation_id,
      case when v_presentation_id is not null then v_size else null end,v_variant_values
    ) returning id into v_item_id;

    insert into public.varelia_inventory_movements(
      business_id,product_id,product_name,category,unit,type,qty,stock_before,stock_after,source,created_by
    ) values(
      v_business,v_product.id,v_product.name,null,v_product.unit,'sale',v_stock_qty,v_before,v_after,
      left(coalesce(p_source,'Venta'),120),v_uid
    );

    v_total:=v_total+round(v_price*v_qty,2);
    v_results:=v_results||jsonb_build_array(jsonb_build_object(
      'sale_item_id',v_item_id,'product_id',v_product.id,'legacy_id',v_product.legacy_id,'name',v_product.name,
      'qty',v_qty,'unit_price',v_price,'buy_price_at_sale',v_cost,'sale_unit',v_unit,'stock_qty',v_stock_qty,
      'presentation_id',v_presentation_id,'presentation_units',case when v_presentation_id is not null then v_size else null end,
      'stock_after',v_after
    ));
  end loop;

  update public.varelia_sales set total=v_total where id=v_sale_id;
  v_response:=jsonb_build_object('sale_id',v_sale_id,'total',v_total,'items',v_results);
  IF v_request IS NOT NULL THEN
    INSERT INTO private.varelia_checkout_requests(business_id,user_id,request_id,fingerprint,response)
    VALUES(v_business,v_uid,v_request,v_fingerprint,v_response);
  END IF;
  RETURN v_response;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.varelia_commit_credit_sale(p_items jsonb, p_customer_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid:=auth.uid();
  v_business uuid;
  v_role text;
  v_customer text:=btrim(coalesce(p_customer_name,''));
  v_sale jsonb;
  v_sale_id uuid;
  v_amount numeric(14,2);
  v_items jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Inicia sesión para registrar fiados'; END IF;
  IF char_length(v_customer)<2 OR char_length(v_customer)>120 THEN
    RAISE EXCEPTION 'Escribe el nombre completo del cliente (2 a 120 caracteres)';
  END IF;
  SELECT business_id, role INTO v_business,v_role FROM public.profiles WHERE id=v_uid;
  IF v_business IS NULL THEN RAISE EXCEPTION 'Cuenta sin negocio'; END IF;
  -- The existing RPC performs all stock locks, permission checks and sale accounting.
  -- If any credit insert fails, the entire sale transaction rolls back.
  v_sale:=public.varelia_commit_sale(p_items, 'Fiado');
  v_sale_id:=(v_sale->>'sale_id')::uuid;
  IF v_sale_id IS NULL THEN RAISE EXCEPTION 'La venta no se pudo registrar'; END IF;
  SELECT round(total,2) INTO v_amount FROM public.varelia_sales
    WHERE id=v_sale_id AND business_id=v_business AND created_by=v_uid;
  IF v_amount IS NULL OR v_amount<=0 THEN RAISE EXCEPTION 'Importe de venta fiada inválido'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'product_id',product_id,'name',product_name,'qty',qty,
    'unit',coalesce(nullif(sale_unit,''),'unidad'),
    'unit_price',unit_price,'subtotal',round(qty*unit_price,2)
  ) ORDER BY id),'[]'::jsonb) INTO v_items
  FROM public.varelia_sale_items WHERE sale_id=v_sale_id AND business_id=v_business;
  INSERT INTO public.varelia_credit_sales
    (sale_id,business_id,cashier_id,customer_name,customer_key,items,total)
  VALUES
    (v_sale_id,v_business,v_uid,v_customer,
      regexp_replace(lower(v_customer),'[[:space:]]+',' ','g'),
      coalesce(v_items,'[]'::jsonb),v_amount) ON CONFLICT(sale_id) DO NOTHING;
  IF EXISTS(SELECT 1 FROM public.varelia_credit_sales WHERE sale_id=v_sale_id AND customer_key<>regexp_replace(lower(v_customer),'[[:space:]]+',' ','g')) THEN RAISE EXCEPTION 'El cliente del fiado cambió; revisa el historial'; END IF;
  RETURN v_sale || jsonb_build_object('credit_sale_id',v_sale_id,'credit_customer',v_customer,'credit_items',v_items);
END $function$
;
COMMIT;
