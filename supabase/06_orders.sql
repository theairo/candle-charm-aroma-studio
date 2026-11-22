-- Run in Supabase SQL Editor. Orders table written ONLY by the `place-order` Edge Function.
-- Visitors cannot read or write it through the public key; admins can read and update status.

create table if not exists public.orders (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name       text not null,
  phone      text not null,
  comment    text,
  items      jsonb not null,            -- [{id, name, price, qty}] as priced by the server
  total      numeric(10,2) not null,
  status     text not null default 'new' check (status in ('new', 'done', 'cancelled')),
  emailed    boolean not null default false
);

create index if not exists orders_phone_created_idx on public.orders (phone, created_at desc);

alter table public.orders enable row level security;   -- no anon/authenticated insert policy on purpose

drop policy if exists "Admin can read orders" on public.orders;
create policy "Admin can read orders"
  on public.orders for select to authenticated
  using (public.is_admin());

drop policy if exists "Admin can update orders" on public.orders;
create policy "Admin can update orders"
  on public.orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
