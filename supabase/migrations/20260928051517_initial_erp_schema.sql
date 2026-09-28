create table public.staff_members (
	user_id uuid primary key references auth.users (id) on delete cascade,
	role text not null default 'operator' check (role in ('owner', 'manager', 'operator', 'accountant')),
	active boolean not null default true,
	created_at timestamptz not null default now()
);

create table public.customers (
	id uuid primary key default gen_random_uuid(),
	customer_code text not null unique,
	name text not null,
	phone text not null unique,
	address text,
	area text,
	route text,
	customer_type text not null default 'RETAIL'
		check (customer_type in ('HOTEL', 'RESTAURANT', 'CATERING', 'CORPORATE', 'RETAIL')),
	notes text,
	active boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.products (
	id uuid primary key default gen_random_uuid(),
	name text not null unique,
	category text not null default 'OTHER'
		check (category in ('IDLI', 'CHAPATI', 'IDIYAPPAM', 'SANDHAGAI', 'OTHER')),
	wholesale_price numeric(12, 2) not null check (wholesale_price >= 0),
	retail_price numeric(12, 2) not null check (retail_price >= 0),
	active boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.orders (
	id uuid primary key default gen_random_uuid(),
	customer_id uuid not null references public.customers (id) on delete restrict,
	product_id uuid not null references public.products (id) on delete restrict,
	quantity numeric(12, 2) not null check (quantity > 0),
	price_type text not null default 'WHOLESALE' check (price_type in ('WHOLESALE', 'RETAIL')),
	unit_price numeric(12, 2) not null check (unit_price >= 0),
	total_amount numeric(14, 2) not null default 0,
	session text not null default 'MORNING' check (session in ('MORNING', 'EVENING')),
	delivery_date date not null,
	channel text not null default 'DIRECT' check (channel in ('PHONE', 'DIRECT', 'ONLINE')),
	remarks text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table public.order_templates (
	id uuid primary key default gen_random_uuid(),
	customer_id uuid not null references public.customers (id) on delete cascade,
	product_id uuid not null references public.products (id) on delete restrict,
	active boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (customer_id, product_id)
);

create table public.template_days (
	id uuid primary key default gen_random_uuid(),
	template_id uuid not null references public.order_templates (id) on delete cascade,
	day_of_week smallint not null check (day_of_week between 0 and 6),
	quantity numeric(12, 2) not null check (quantity >= 0),
	unique (template_id, day_of_week)
);

create table public.production (
	id uuid primary key default gen_random_uuid(),
	date date not null,
	product_id uuid not null references public.products (id) on delete restrict,
	session text not null default 'MORNING' check (session in ('MORNING', 'EVENING')),
	required_quantity numeric(12, 2) not null default 0 check (required_quantity >= 0),
	produced_quantity numeric(12, 2) not null default 0 check (produced_quantity >= 0),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (date, product_id, session)
);

create table public.payments (
	id uuid primary key default gen_random_uuid(),
	customer_id uuid not null references public.customers (id) on delete restrict,
	invoice_amount numeric(14, 2) not null check (invoice_amount >= 0),
	paid_amount numeric(14, 2) not null check (paid_amount >= 0),
	balance_amount numeric(14, 2) not null default 0,
	payment_date date not null,
	remarks text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index customers_name_idx on public.customers (name);
create index customers_area_idx on public.customers (area);
create index customers_route_idx on public.customers (route);
create index customers_type_idx on public.customers (customer_type);
create index customers_active_idx on public.customers (active);
create index products_category_idx on public.products (category);
create index products_active_idx on public.products (active);
create index orders_customer_idx on public.orders (customer_id);
create index orders_product_idx on public.orders (product_id);
create index orders_delivery_date_idx on public.orders (delivery_date);
create index orders_session_idx on public.orders (session);
create index orders_date_session_idx on public.orders (delivery_date, session);
create index templates_customer_idx on public.order_templates (customer_id);
create index templates_product_idx on public.order_templates (product_id);
create index templates_active_idx on public.order_templates (active);
create index template_days_template_idx on public.template_days (template_id);
create index production_date_idx on public.production (date);
create index production_product_idx on public.production (product_id);
create index payments_customer_idx on public.payments (customer_id);
create index payments_date_idx on public.payments (payment_date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	new.updated_at := pg_catalog.now();
	return new;
end;
$$;

create or replace function public.calculate_order_total()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	new.total_amount := round(new.quantity * new.unit_price, 2);
	return new;
end;
$$;

create or replace function public.calculate_payment_balance()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	new.balance_amount := new.invoice_amount - new.paid_amount;
	return new;
end;
$$;

create trigger customers_set_updated_at before update on public.customers
	for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
	for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
	for each row execute function public.set_updated_at();
create trigger orders_calculate_total before insert or update of quantity, unit_price on public.orders
	for each row execute function public.calculate_order_total();
create trigger templates_set_updated_at before update on public.order_templates
	for each row execute function public.set_updated_at();
create trigger production_set_updated_at before update on public.production
	for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments
	for each row execute function public.set_updated_at();
create trigger payments_calculate_balance before insert or update of invoice_amount, paid_amount on public.payments
	for each row execute function public.calculate_payment_balance();

create or replace function public.is_active_staff()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
	select exists (
		select 1
		from public.staff_members as staff
		where staff.user_id = (select auth.uid())
			and staff.active
	);
$$;

revoke all on function public.is_active_staff() from public;
grant execute on function public.is_active_staff() to authenticated;

alter table public.staff_members enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_templates enable row level security;
alter table public.template_days enable row level security;
alter table public.production enable row level security;
alter table public.payments enable row level security;

create policy staff_read_self on public.staff_members
	for select to authenticated
	using (user_id = (select auth.uid()));

create policy customers_active_staff on public.customers
	for all to authenticated
	using ((select public.is_active_staff()))
	with check ((select public.is_active_staff()));
create policy products_active_staff on public.products
	for all to authenticated
	using ((select public.is_active_staff()))
	with check ((select public.is_active_staff()));
create policy orders_active_staff on public.orders
	for all to authenticated
	using ((select public.is_active_staff()))
	with check ((select public.is_active_staff()));
create policy templates_active_staff on public.order_templates
	for all to authenticated
	using ((select public.is_active_staff()))
	with check ((select public.is_active_staff()));
create policy template_days_active_staff on public.template_days
	for all to authenticated
	using ((select public.is_active_staff()))
	with check ((select public.is_active_staff()));
create policy production_active_staff on public.production
	for all to authenticated
	using ((select public.is_active_staff()))
	with check ((select public.is_active_staff()));
create policy payments_active_staff on public.payments
	for all to authenticated
	using ((select public.is_active_staff()))
	with check ((select public.is_active_staff()));

grant usage on schema public to authenticated;
grant select on public.staff_members to authenticated;
grant select, insert, update, delete on
	public.customers,
	public.products,
	public.orders,
	public.order_templates,
	public.template_days,
	public.production,
	public.payments
to authenticated;
