-- Safe to run now (does NOT touch photos or delete rows; unlike 02_products.sql).
-- Adds the category column and assigns categories by sort_order.

alter table public.candles add column if not exists category text;

update public.candles set category = 'Фігурні'      where sort_order in (1, 2, 3)    and category is null;
update public.candles set category = 'У кашпо'      where sort_order in (4, 6, 7, 8) and category is null;
update public.candles set category = 'Чайні свічки' where sort_order = 5             and category is null;
