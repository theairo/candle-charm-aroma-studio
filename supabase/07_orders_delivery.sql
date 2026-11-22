-- Run in Supabase SQL Editor BEFORE redeploying the place-order function.
-- Adds delivery details to orders (payment is always cash on delivery).

alter table public.orders
  add column if not exists delivery_carrier text check (delivery_carrier in ('nova', 'ukr')),
  add column if not exists delivery_city    text,
  add column if not exists delivery_branch  text;
