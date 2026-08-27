-- Varelia · Migración de datos de negocio a Supabase
-- Crea: varelia_categories, varelia_products, varelia_suppliers,
--       varelia_purchases, varelia_purchase_items,
--       varelia_sales, varelia_sale_items,
--       varelia_inventory_movements, varelia_cash_closures,
--       varelia_business_settings
--
-- Requisito previo: ya existen las tablas businesses(id, name, owner_id)
-- y profiles(id, business_id, role, full_name) usadas por supabase-auth.js.
--
-- Nota: se usa el prefijo "varelia_" en todas las tablas nuevas a propósito.
-- En este proyecto de Supabase ya existía una tabla "products" (de otro
-- origen, con columnas distintas a las que necesitamos) y no queremos
-- tocarla ni arriesgarnos a chocar con datos o tipos que no controlamos.
-- Con el prefijo, este script no puede pisar nada existente.
--
-- Cómo aplicar: pegar este archivo completo en Supabase → SQL Editor → Run.
-- Es seguro de re-ejecutar (usa IF NOT EXISTS / OR REPLACE en todo).

create extension if not exists pgcrypto;

-- =========================================================
-- Helper: business_id del usuario autenticado actual
-- =========================================================
create or replace function public.varelia_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id from public.profiles where id = auth.uid()
$$;

create or replace function public.varelia_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- 1) varelia_categories
-- =========================================================
create table if not exists public.varelia_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);

alter table public.varelia_categories enable row level security;

drop policy if exists "varelia_categories_select" on public.varelia_categories;
drop policy if exists "varelia_categories_insert" on public.varelia_categories;
drop policy if exists "varelia_categories_update" on public.varelia_categories;
drop policy if exists "varelia_categories_delete" on public.varelia_categories;

create policy "varelia_categories_select" on public.varelia_categories for select
  using (business_id = public.varelia_business_id());
create policy "varelia_categories_insert" on public.varelia_categories for insert
  with check (business_id = public.varelia_business_id());
create policy "varelia_categories_update" on public.varelia_categories for update
  using (business_id = public.varelia_business_id())
  with check (business_id = public.varelia_business_id());
create policy "varelia_categories_delete" on public.varelia_categories for delete
  using (business_id = public.varelia_business_id());

create index if not exists varelia_categories_business_id_idx on public.varelia_categories(business_id);

-- =========================================================
-- 2) varelia_products
-- =========================================================
create table if not exists public.varelia_products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category_id uuid references public.varelia_categories(id) on delete set null,
  legacy_id text,
  barcode text,
  name text not null,
  description text,
  specifications text,
  buy_price numeric(12,2) not null default 0,
  sell_price numeric(12,2) not null default 0,
  stock numeric(12,2) not null default 0,
  unit text not null default 'Unidad',
  reorder_level numeric(12,2) not null default 5,
  image_data text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.varelia_products enable row level security;

drop policy if exists "varelia_products_select" on public.varelia_products;
drop policy if exists "varelia_products_insert" on public.varelia_products;
drop policy if exists "varelia_products_update" on public.varelia_products;
drop policy if exists "varelia_products_delete" on public.varelia_products;

create policy "varelia_products_select" on public.varelia_products for select
  using (business_id = public.varelia_business_id());
create policy "varelia_products_insert" on public.varelia_products for insert
  with check (business_id = public.varelia_business_id());
create policy "varelia_products_update" on public.varelia_products for update
  using (business_id = public.varelia_business_id())
  with check (business_id = public.varelia_business_id());
create policy "varelia_products_delete" on public.varelia_products for delete
  using (business_id = public.varelia_business_id());

create index if not exists varelia_products_business_id_idx on public.varelia_products(business_id);
create index if not exists varelia_products_category_id_idx on public.varelia_products(category_id);
create unique index if not exists varelia_products_business_legacy_id_idx
  on public.varelia_products(business_id, legacy_id) where legacy_id is not null;
create unique index if not exists varelia_products_business_barcode_idx
  on public.varelia_products(business_id, barcode) where barcode is not null and barcode <> '';

drop trigger if exists varelia_products_set_updated_at on public.varelia_products;
create trigger varelia_products_set_updated_at
  before update on public.varelia_products
  for each row execute function public.varelia_set_updated_at();

-- =========================================================
-- 3) varelia_suppliers
-- =========================================================
create table if not exists public.varelia_suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  legacy_id text,
  name text not null,
  ruc text,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.varelia_suppliers enable row level security;

drop policy if exists "varelia_suppliers_select" on public.varelia_suppliers;
drop policy if exists "varelia_suppliers_insert" on public.varelia_suppliers;
drop policy if exists "varelia_suppliers_update" on public.varelia_suppliers;
drop policy if exists "varelia_suppliers_delete" on public.varelia_suppliers;

create policy "varelia_suppliers_select" on public.varelia_suppliers for select
  using (business_id = public.varelia_business_id());
create policy "varelia_suppliers_insert" on public.varelia_suppliers for insert
  with check (business_id = public.varelia_business_id());
create policy "varelia_suppliers_update" on public.varelia_suppliers for update
  using (business_id = public.varelia_business_id())
  with check (business_id = public.varelia_business_id());
create policy "varelia_suppliers_delete" on public.varelia_suppliers for delete
  using (business_id = public.varelia_business_id());

create index if not exists varelia_suppliers_business_id_idx on public.varelia_suppliers(business_id);
create unique index if not exists varelia_suppliers_business_legacy_id_idx
  on public.varelia_suppliers(business_id, legacy_id) where legacy_id is not null;

-- =========================================================
-- 4) varelia_purchases + varelia_purchase_items  (Ingreso de mercadería)
-- =========================================================
create table if not exists public.varelia_purchases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  supplier_id uuid references public.varelia_suppliers(id) on delete set null,
  supplier_name text not null,
  document_number text,
  total numeric(12,2) not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.varelia_purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.varelia_purchases(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid references public.varelia_products(id) on delete set null,
  product_name text not null,
  unit text,
  qty numeric(12,2) not null,
  unit_cost numeric(12,2) not null default 0
);

alter table public.varelia_purchases enable row level security;
alter table public.varelia_purchase_items enable row level security;

drop policy if exists "varelia_purchases_select" on public.varelia_purchases;
drop policy if exists "varelia_purchases_insert" on public.varelia_purchases;
create policy "varelia_purchases_select" on public.varelia_purchases for select
  using (business_id = public.varelia_business_id());
create policy "varelia_purchases_insert" on public.varelia_purchases for insert
  with check (business_id = public.varelia_business_id());

drop policy if exists "varelia_purchase_items_select" on public.varelia_purchase_items;
drop policy if exists "varelia_purchase_items_insert" on public.varelia_purchase_items;
create policy "varelia_purchase_items_select" on public.varelia_purchase_items for select
  using (business_id = public.varelia_business_id());
create policy "varelia_purchase_items_insert" on public.varelia_purchase_items for insert
  with check (business_id = public.varelia_business_id());

create index if not exists varelia_purchases_business_id_idx on public.varelia_purchases(business_id);
create index if not exists varelia_purchase_items_purchase_id_idx on public.varelia_purchase_items(purchase_id);
create index if not exists varelia_purchase_items_business_id_idx on public.varelia_purchase_items(business_id);
create index if not exists varelia_purchase_items_product_id_idx on public.varelia_purchase_items(product_id);

-- =========================================================
-- 5) varelia_sales + varelia_sale_items  (Ventas)
-- =========================================================
create table if not exists public.varelia_sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  total numeric(12,2) not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.varelia_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.varelia_sales(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid references public.varelia_products(id) on delete set null,
  product_name text not null,
  unit_price numeric(12,2) not null,
  qty numeric(12,2) not null,
  buy_price_at_sale numeric(12,2)
);

alter table public.varelia_sales enable row level security;
alter table public.varelia_sale_items enable row level security;

drop policy if exists "varelia_sales_select" on public.varelia_sales;
drop policy if exists "varelia_sales_insert" on public.varelia_sales;
create policy "varelia_sales_select" on public.varelia_sales for select
  using (business_id = public.varelia_business_id());
create policy "varelia_sales_insert" on public.varelia_sales for insert
  with check (business_id = public.varelia_business_id());

drop policy if exists "varelia_sale_items_select" on public.varelia_sale_items;
drop policy if exists "varelia_sale_items_insert" on public.varelia_sale_items;
create policy "varelia_sale_items_select" on public.varelia_sale_items for select
  using (business_id = public.varelia_business_id());
create policy "varelia_sale_items_insert" on public.varelia_sale_items for insert
  with check (business_id = public.varelia_business_id());

create index if not exists varelia_sales_business_id_idx on public.varelia_sales(business_id);
create index if not exists varelia_sale_items_sale_id_idx on public.varelia_sale_items(sale_id);
create index if not exists varelia_sale_items_business_id_idx on public.varelia_sale_items(business_id);
create index if not exists varelia_sale_items_product_id_idx on public.varelia_sale_items(product_id);

-- =========================================================
-- 6) varelia_inventory_movements
-- =========================================================
create table if not exists public.varelia_inventory_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid references public.varelia_products(id) on delete set null,
  product_name text not null,
  category text,
  unit text,
  type text not null check (type in ('add','subtract','sale','purchase')),
  qty numeric(12,2) not null,
  stock_before numeric(12,2) not null,
  stock_after numeric(12,2) not null,
  source text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.varelia_inventory_movements enable row level security;

drop policy if exists "varelia_inventory_movements_select" on public.varelia_inventory_movements;
drop policy if exists "varelia_inventory_movements_insert" on public.varelia_inventory_movements;
create policy "varelia_inventory_movements_select" on public.varelia_inventory_movements for select
  using (business_id = public.varelia_business_id());
create policy "varelia_inventory_movements_insert" on public.varelia_inventory_movements for insert
  with check (business_id = public.varelia_business_id());

create index if not exists varelia_inventory_movements_business_id_idx on public.varelia_inventory_movements(business_id);
create index if not exists varelia_inventory_movements_product_id_idx on public.varelia_inventory_movements(product_id);

-- =========================================================
-- 7) varelia_cash_closures  (Cierres de caja)
-- =========================================================
create table if not exists public.varelia_cash_closures (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  total numeric(12,2) not null default 0,
  day_key text,
  day_total_at_close numeric(12,2),
  day_sales_count integer,
  day_units numeric(12,2),
  created_by uuid references public.profiles(id),
  closed_at timestamptz not null default now()
);

alter table public.varelia_cash_closures enable row level security;

drop policy if exists "varelia_cash_closures_select" on public.varelia_cash_closures;
drop policy if exists "varelia_cash_closures_insert" on public.varelia_cash_closures;
create policy "varelia_cash_closures_select" on public.varelia_cash_closures for select
  using (business_id = public.varelia_business_id());
create policy "varelia_cash_closures_insert" on public.varelia_cash_closures for insert
  with check (business_id = public.varelia_business_id());

create index if not exists varelia_cash_closures_business_id_idx on public.varelia_cash_closures(business_id);

-- =========================================================
-- 8) varelia_business_settings  (tema + inicio de caja activa)
-- =========================================================
create table if not exists public.varelia_business_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  theme_color text not null default '#be185d',
  theme_dark boolean not null default false,
  cash_start timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.varelia_business_settings enable row level security;

drop policy if exists "varelia_business_settings_select" on public.varelia_business_settings;
drop policy if exists "varelia_business_settings_insert" on public.varelia_business_settings;
drop policy if exists "varelia_business_settings_update" on public.varelia_business_settings;

create policy "varelia_business_settings_select" on public.varelia_business_settings for select
  using (business_id = public.varelia_business_id());
create policy "varelia_business_settings_insert" on public.varelia_business_settings for insert
  with check (business_id = public.varelia_business_id());
create policy "varelia_business_settings_update" on public.varelia_business_settings for update
  using (business_id = public.varelia_business_id())
  with check (business_id = public.varelia_business_id());

drop trigger if exists varelia_business_settings_set_updated_at on public.varelia_business_settings;
create trigger varelia_business_settings_set_updated_at
  before update on public.varelia_business_settings
  for each row execute function public.varelia_set_updated_at();
