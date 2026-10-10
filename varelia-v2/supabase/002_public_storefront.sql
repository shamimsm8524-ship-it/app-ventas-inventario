-- Varelia 2.0: ejecutar despues de 001_initial_schema.sql, SOLO en Supabase NUEVO.
-- API de lectura publica y pedido pendiente. Antes de publicar: CAPTCHA, rate limiting y pruebas.
create table public.storefront_settings (
 business_id uuid primary key references public.businesses(id),
 is_published boolean not null default false,
 public_name text not null,
 phone text,
 theme_color text not null default '#2563eb',
 updated_at timestamptz not null default now()
);
create table public.storefront_products (
 business_id uuid not null,
 product_id uuid not null,
 is_published boolean not null default false,
 primary key (business_id,product_id),
 foreign key (business_id,product_id) references public.products(business_id,id)
);
create table public.public_orders (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id),
 order_number text not null,
 customer_name text not null,
 customer_phone text not null,
 delivery_method text not null check (delivery_method in ('pickup','delivery')),
 payment_preference text not null check (payment_preference in ('cash','yape','plin','transfer','card')),
 notes text not null default '',
 status text not null default 'pending' check (status in ('pending','confirmed','paid','prepared','sent','delivered','cancelled')),
 total numeric(14,2) not null check (total >= 0),
 created_at timestamptz not null default now(),
 unique(business_id,order_number),
 unique(business_id,id)
);
create table public.public_order_items (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null,
 order_id uuid not null,
 product_id uuid not null,
 product_name text not null,
 quantity integer not null check(quantity between 1 and 999),
 unit_price numeric(14,2) not null check(unit_price >= 0),
 line_total numeric(14,2) not null check(line_total >= 0),
 foreign key(business_id,order_id) references public.public_orders(business_id,id),
 foreign key(business_id,product_id) references public.products(business_id,id)
);
alter table public.storefront_settings enable row level security;
alter table public.storefront_products enable row level security;
alter table public.public_orders enable row level security;
alter table public.public_order_items enable row level security;
create policy settings_owner_select on public.storefront_settings for select to authenticated using(public.is_business_owner(business_id));
create policy settings_owner_insert on public.storefront_settings for insert to authenticated with check(public.is_business_owner(business_id));
create policy settings_owner_update on public.storefront_settings for update to authenticated using(public.is_business_owner(business_id)) with check(public.is_business_owner(business_id));
create policy published_owner_select on public.storefront_products for select to authenticated using(public.is_business_owner(business_id));
create policy published_owner_insert on public.storefront_products for insert to authenticated with check(public.is_business_owner(business_id));
create policy published_owner_update on public.storefront_products for update to authenticated using(public.is_business_owner(business_id)) with check(public.is_business_owner(business_id));
create policy published_owner_delete on public.storefront_products for delete to authenticated using(public.is_business_owner(business_id));
create policy orders_members_read on public.public_orders for select to authenticated using(public.is_business_member(business_id));
create policy order_items_members_read on public.public_order_items for select to authenticated using(public.is_business_member(business_id));
-- Sin acceso directo anon a las tablas. Las funciones solo devuelven datos expresamente publicos.
create function public.get_public_storefront(p_business_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare output jsonb;
begin
 select jsonb_build_object(
  'business_id',s.business_id,'name',s.public_name,'phone',s.phone,'theme_color',s.theme_color,
  'products',coalesce((
    select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'sku',p.sku,'price',p.price) order by p.name)
    from public.storefront_products sp join public.products p on p.business_id=sp.business_id and p.id=sp.product_id
    where sp.business_id=s.business_id and sp.is_published=true
  ),'[]'::jsonb))
 into output from public.storefront_settings s
 where s.business_id=p_business_id and s.is_published=true;
 return output;
end;
$$;
create function public.place_public_order(
 p_business_id uuid,p_customer_name text,p_customer_phone text,
 p_delivery_method text,p_payment_preference text,p_notes text,p_items jsonb
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_order uuid; v_number text; v_total numeric(14,2):=0;
 v_item jsonb; v_product record; v_qty integer; v_line numeric(14,2); v_count integer:=0;
begin
 if not exists(select 1 from public.storefront_settings s where s.business_id=p_business_id and s.is_published=true) then raise exception 'Catalogo no disponible'; end if;
 if length(trim(coalesce(p_customer_name,''))) not between 2 and 80 or length(trim(coalesce(p_customer_phone,''))) not between 6 and 25 then raise exception 'Datos del cliente invalidos'; end if;
 if p_delivery_method not in ('pickup','delivery') or p_payment_preference not in ('cash','yape','plin','transfer','card') then raise exception 'Opciones invalidas'; end if;
 if length(coalesce(p_notes,''))>250 then raise exception 'Notas demasiado largas'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 40 then raise exception 'Pedido invalido'; end if;
 v_order:=gen_random_uuid();v_number:='PED-'||upper(substr(replace(v_order::text,'-',''),1,12));
 insert into public.public_orders(id,business_id,order_number,customer_name,customer_phone,delivery_method,payment_preference,notes,total)
 values(v_order,p_business_id,v_number,trim(p_customer_name),trim(p_customer_phone),p_delivery_method,p_payment_preference,coalesce(p_notes,''),0);
 for v_item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(v_item->'quantity')<>'number' or (v_item->>'quantity') !~ '^[0-9]{1,3}$' then raise exception 'Cantidad invalida'; end if;
  v_qty:=(v_item->>'quantity')::integer;
  if v_qty not between 1 and 999 then raise exception 'Cantidad invalida'; end if;
  select p.id,p.name,p.price into v_product
  from public.products p join public.storefront_products sp on sp.business_id=p.business_id and sp.product_id=p.id
  where p.business_id=p_business_id and p.id=(v_item->>'product_id')::uuid and sp.is_published=true;
  if not found then raise exception 'Producto no disponible'; end if;
  v_line:=round(v_product.price*v_qty,2);
  insert into public.public_order_items(business_id,order_id,product_id,product_name,quantity,unit_price,line_total)
  values(p_business_id,v_order,v_product.id,v_product.name,v_qty,v_product.price,v_line);
  v_total:=v_total+v_line;v_count:=v_count+1;
 end loop;
 update public.public_orders set total=v_total where id=v_order;
 return jsonb_build_object('order_number',v_number,'total',v_total,'status','pending');
end;
$$;
revoke all on function public.get_public_storefront(uuid) from public;
revoke all on function public.place_public_order(uuid,text,text,text,text,text,jsonb) from public;
grant execute on function public.get_public_storefront(uuid) to anon,authenticated;
grant execute on function public.place_public_order(uuid,text,text,text,text,text,jsonb) to anon,authenticated;
-- No habilitar en produccion sin rate limiting/CAPTCHA del lado servidor y verificacion de pedidos.
