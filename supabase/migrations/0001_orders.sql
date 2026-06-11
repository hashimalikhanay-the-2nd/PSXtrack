-- Orders table for PSX portfolio tracker
-- (created to match app data model)

create table if not exists public.orders (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users null,
  symbol text not null,
  quantity numeric(12,2) not null,
  price numeric(10,2) not null,
  order_date date not null,
  notes text null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_orders_set_updated_at on public.orders;
create trigger trg_orders_set_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

