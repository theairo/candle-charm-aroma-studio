-- Run once in Supabase Dashboard -> SQL Editor.

create table if not exists public.candles (
  id          bigint generated always as identity primary key,
  name        text    not null,
  description text,
  price       numeric(10,2) not null check (price >= 0),
  image_url   text,
  sort_order  int     not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Row Level Security: public can only READ active products.
alter table public.candles enable row level security;

drop policy if exists "Public can read active candles" on public.candles;
create policy "Public can read active candles"
  on public.candles for select
  to anon, authenticated
  using (is_active);

-- Public image bucket (files are readable by URL; uploads need a logged-in policy later).
insert into storage.buckets (id, name, public)
values ('candle-images', 'candle-images', true)
on conflict (id) do nothing;

-- Seed with the products currently hardcoded on the site.
insert into public.candles (name, description, price, image_url, sort_order) values
  ('Ялинка',              'Біла або рожева · 12 см',          320, 'img/1.jpg', 1),
  ('Сніжинка',            'Аромасаше з візерунком',           180, 'img/2.jpg', 2),
  ('Новорічна куля',      'Із золотим декором · 8 см',        280, 'img/3.jpg', 3),
  ('Подарунковий набір',  'Сніжинка з позолотою в коробці',   250, 'img/4.jpg', 4);
