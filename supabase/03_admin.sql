-- Run in Supabase SQL Editor. Gives ONE admin account write access to the catalog and photos.
-- Visitors (anon key) stay read-only.

-- 1) Who is an admin. Nobody can read or edit this table through the public API.
create table if not exists public.admins (
  email text primary key
);
alter table public.admins enable row level security;   -- no policies = no API access

-- 2) Helper used by the policies. SECURITY DEFINER so it can read `admins` despite RLS.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 3) Catalog: admin can see everything (incl. hidden items) and write.
drop policy if exists "Admin can read all candles" on public.candles;
create policy "Admin can read all candles"
  on public.candles for select to authenticated
  using (public.is_admin());

drop policy if exists "Admin can insert candles" on public.candles;
create policy "Admin can insert candles"
  on public.candles for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Admin can update candles" on public.candles;
create policy "Admin can update candles"
  on public.candles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admin can delete candles" on public.candles;
create policy "Admin can delete candles"
  on public.candles for delete to authenticated
  using (public.is_admin());

-- 4) Photos bucket: only the admin can upload / replace / delete. Reading stays public (bucket is public).
drop policy if exists "Admin can upload candle images" on storage.objects;
create policy "Admin can upload candle images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'candle-images' and public.is_admin());

drop policy if exists "Admin can update candle images" on storage.objects;
create policy "Admin can update candle images"
  on storage.objects for update to authenticated
  using (bucket_id = 'candle-images' and public.is_admin());

drop policy if exists "Admin can delete candle images" on storage.objects;
create policy "Admin can delete candle images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'candle-images' and public.is_admin());

-- 5) Register the admin. EDIT THE EMAIL, then run. It must match the user you create in
--    Authentication -> Users. Add more rows the same way for more admins.
insert into public.admins (email) values ('REPLACE_WITH_ADMIN_EMAIL')
on conflict do nothing;
