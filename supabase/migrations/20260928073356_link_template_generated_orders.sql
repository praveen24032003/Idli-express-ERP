alter table public.orders
  add column order_template_id uuid
  references public.order_templates (id) on delete set null;

with unique_customer_templates as (
  select customer_id, (array_agg(id))[1] as template_id
  from public.order_templates
  group by customer_id
  having count(*) = 1
)
update public.orders as orders
set order_template_id = templates.template_id
from unique_customer_templates as templates
where orders.customer_id = templates.customer_id
  and orders.order_template_id is null
  and orders.remarks = 'Auto-generated from recurring template'
  and orders.delivery_date >= current_date;

alter table public.orders
  add constraint orders_template_delivery_session_key
  unique (order_template_id, delivery_date, session);

create index orders_template_idx on public.orders (order_template_id);