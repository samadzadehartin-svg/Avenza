create table if not exists public.products(
  id bigint generated always as identity primary key,
  name text not null,
  slug text unique,
  description text,
  category text,
  single_price bigint not null default 0,
  wholesale_price bigint,
  image text,
  stock integer not null default 0,
  active boolean not null default true,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.product_variants(
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  color text,
  size text,
  stock integer not null default 0,
  sku text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.orders(
  id bigint generated always as identity primary key,
  name text not null,
  phone text not null,
  address text not null,
  items jsonb not null default '[]'::jsonb,
  order_type text not null default 'retail' check (order_type in ('retail','wholesale')),
  total bigint not null default 0,
  status text not null default 'جدید',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items(
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  product_id bigint not null references public.products(id),
  variant_id bigint references public.product_variants(id),
  product_name text not null,
  color text,
  size text,
  unit_price bigint not null,
  quantity integer not null check (quantity > 0),
  line_total bigint not null,
  created_at timestamptz not null default now()
);

create table if not exists public.wholesale_requests(
  id bigint generated always as identity primary key,
  name text not null,
  shop text,
  phone text not null,
  count integer,
  status text not null default 'جدید',
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users(
  email text primary key,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.admin_users where lower(email)=lower(coalesce(auth.jwt()->>'email','')));
$$;

alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.wholesale_requests enable row level security;
alter table public.admin_users enable row level security;

create policy products_public_read on public.products for select using (active=true or public.is_admin());
create policy products_admin_insert on public.products for insert to authenticated with check (public.is_admin());
create policy products_admin_update on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy products_admin_delete on public.products for delete to authenticated using (public.is_admin());
create policy variants_public_read on public.product_variants for select using (true);
create policy variants_admin_insert on public.product_variants for insert to authenticated with check (public.is_admin());
create policy variants_admin_update on public.product_variants for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy variants_admin_delete on public.product_variants for delete to authenticated using (public.is_admin());
create policy orders_admin_read on public.orders for select to authenticated using (public.is_admin());
create policy orders_admin_update on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy order_items_admin_read on public.order_items for select to authenticated using (public.is_admin());
create policy wholesale_public_insert on public.wholesale_requests for insert with check (true);
create policy wholesale_admin_read on public.wholesale_requests for select to authenticated using (public.is_admin());
create policy wholesale_admin_update on public.wholesale_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_users_admin_read on public.admin_users for select to authenticated using (public.is_admin());

create or replace function public.place_order(p_name text,p_phone text,p_address text,p_order_type text,p_items jsonb)
returns bigint language plpgsql security definer set search_path=public as $$
declare
  v_order_id bigint; v_item jsonb; v_product public.products%rowtype; v_variant public.product_variants%rowtype;
  v_qty integer; v_price bigint; v_total bigint:=0; v_variant_id bigint;
begin
  if coalesce(trim(p_name),'')='' or coalesce(trim(p_phone),'')='' or coalesce(trim(p_address),'')='' then raise exception 'missing_customer_fields'; end if;
  if p_order_type not in ('retail','wholesale') then raise exception 'invalid_order_type'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'empty_order'; end if;
  insert into public.orders(name,phone,address,items,status,order_type,total) values(p_name,p_phone,p_address,p_items,'جدید',p_order_type,0) returning id into v_order_id;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty:=greatest(1,coalesce((v_item->>'quantity')::integer,1));
    v_variant_id:=nullif(v_item->>'variant_id','')::bigint;
    select * into v_product from public.products where id=(v_item->>'product_id')::bigint and active=true;
    if not found then raise exception 'product_not_found'; end if;
    v_variant:=null;
    if v_variant_id is not null then
      select * into v_variant from public.product_variants where id=v_variant_id and product_id=v_product.id;
      if not found then raise exception 'variant_not_found'; end if;
      if v_variant.stock<v_qty then raise exception 'insufficient_stock'; end if;
    end if;
    v_price:=case when p_order_type='wholesale' then coalesce(v_product.wholesale_price,v_product.single_price) else v_product.single_price end;
    insert into public.order_items(order_id,product_id,variant_id,product_name,color,size,unit_price,quantity,line_total)
    values(v_order_id,v_product.id,v_variant_id,v_product.name,v_variant.color,v_variant.size,v_price,v_qty,v_price*v_qty);
    if v_variant_id is not null then update public.product_variants set stock=stock-v_qty where id=v_variant_id; end if;
    v_total:=v_total+(v_price*v_qty);
  end loop;
  update public.orders set total=v_total,updated_at=now() where id=v_order_id;
  return v_order_id;
end; $$;

grant execute on function public.place_order(text,text,text,text,jsonb) to anon,authenticated;

insert into storage.buckets(id,name,public) values('products','products',true) on conflict(id) do update set public=true;
create policy product_images_public_read on storage.objects for select using (bucket_id='products');
create policy product_images_admin_insert on storage.objects for insert to authenticated with check (bucket_id='products' and public.is_admin());
create policy product_images_admin_update on storage.objects for update to authenticated using (bucket_id='products' and public.is_admin()) with check (bucket_id='products' and public.is_admin());
create policy product_images_admin_delete on storage.objects for delete to authenticated using (bucket_id='products' and public.is_admin());
