-- Varelia 2.0: schema inicial aislado. Ejecutar SOLO en un proyecto Supabase NUEVO.
create extension if not exists pgcrypto;

create table public.businesses (
 id uuid primary key default gen_random_uuid(),
 owner_user_id uuid not null references auth.users(id),
 name text not null check (length(trim(name)) > 0),
 created_at timestamptz not null default now()
);
create table public.business_members (
 business_id uuid not null references public.businesses(id) on delete cascade,
 user_id uuid not null references auth.users(id),
 role text not null check (role in ('owner','seller')),
 status text not null default 'active' check (status in ('active','disabled')),
 created_at timestamptz not null default now(),
 primary key (business_id,user_id)
);
create table public.products (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id),
 name text not null,
 sku text,
 stock numeric(14,3) not null default 0,
 price numeric(14,2) not null default 0,
 created_at timestamptz not null default now(),
 unique (business_id,id)
);
create table public.sales (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id),
 seller_user_id uuid not null references auth.users(id),
 total numeric(14,2) not null default 0,
 created_at timestamptz not null default now(),
 unique (business_id,id)
);
create table public.sale_items (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null,
 sale_id uuid not null,
 product_id uuid not null,
 quantity numeric(14,3) not null check (quantity > 0),
 unit_price numeric(14,2) not null check (unit_price >= 0),
 foreign key (business_id,sale_id) references public.sales(business_id,id),
 foreign key (business_id,product_id) references public.products(business_id,id)
);
create table public.receipts (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null,
 sale_id uuid not null,
 receipt_number text not null,
 created_at timestamptz not null default now(),
 foreign key (business_id,sale_id) references public.sales(business_id,id),
 unique (business_id,receipt_number)
);
create index business_members_user_idx on public.business_members(user_id,business_id);
create index products_business_idx on public.products(business_id);
create index sales_business_idx on public.sales(business_id);

create function public.is_business_member(p_business_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
 select exists (
  select 1 from public.business_members m
  where m.business_id = p_business_id
    and m.user_id = (select auth.uid())
    and m.status = 'active'
 );
$$;
create function public.is_business_owner(p_business_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
 select exists (
  select 1 from public.businesses b
  where b.id = p_business_id and b.owner_user_id = (select auth.uid())
 );
$$;
revoke all on function public.is_business_member(uuid) from public;
revoke all on function public.is_business_owner(uuid) from public;
grant execute on function public.is_business_member(uuid), public.is_business_owner(uuid) to authenticated;

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.receipts enable row level security;

create policy businesses_read on public.businesses for select to authenticated
 using (public.is_business_member(id) or owner_user_id = (select auth.uid()));
create policy businesses_create on public.businesses for insert to authenticated
 with check (owner_user_id = (select auth.uid()));
create policy businesses_update on public.businesses for update to authenticated
 using (public.is_business_owner(id)) with check (public.is_business_owner(id));

create policy members_read on public.business_members for select to authenticated
 using (public.is_business_member(business_id) or public.is_business_owner(business_id));
create policy members_manage_insert on public.business_members for insert to authenticated
 with check (public.is_business_owner(business_id) and (role <> 'owner' or user_id = (select auth.uid())));
create policy members_manage_update on public.business_members for update to authenticated
 using (public.is_business_owner(business_id))
 with check (public.is_business_owner(business_id) and (role <> 'owner' or user_id = (select auth.uid())));
create policy members_manage_delete on public.business_members for delete to authenticated
 using (public.is_business_owner(business_id) and role <> 'owner');

create policy products_read on public.products for select to authenticated
 using (public.is_business_member(business_id));
create policy products_insert on public.products for insert to authenticated
 with check (public.is_business_member(business_id));
create policy products_update on public.products for update to authenticated
 using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy products_delete on public.products for delete to authenticated
 using (public.is_business_owner(business_id));

create policy sales_read on public.sales for select to authenticated
 using (public.is_business_member(business_id));
create policy sales_insert on public.sales for insert to authenticated
 with check (public.is_business_member(business_id) and seller_user_id = (select auth.uid()));
create policy items_read on public.sale_items for select to authenticated
 using (public.is_business_member(business_id));
create policy items_insert on public.sale_items for insert to authenticated
 with check (public.is_business_member(business_id));
create policy receipts_read on public.receipts for select to authenticated
 using (public.is_business_member(business_id));
create policy receipts_insert on public.receipts for insert to authenticated
 with check (public.is_business_member(business_id));

-- Owner membership is inserted atomically on creation, with a SECURITY DEFINER trigger.
create function public.add_business_owner_member()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 insert into public.business_members(business_id,user_id,role,status)
 values (new.id,new.owner_user_id,'owner','active');
 return new;
end;
$$;
create trigger trg_business_owner_member
 after insert on public.businesses for each row execute function public.add_business_owner_member();

-- Important: permissions for sellers, stock movements and transactional checkout
-- will be tightened and tested before production use. This is an INITIAL draft.
