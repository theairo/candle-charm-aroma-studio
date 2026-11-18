-- WARNING: this file wipes the table (`delete from public.candles`). Do NOT re-run it
-- once the admin page is in use - it would erase products and reset photos to local paths.
-- Run in Supabase SQL Editor AFTER setup.sql.
-- Adds structured fields and replaces the placeholder seed rows with the real products.

alter table public.candles add column if not exists composition text;
alter table public.candles add column if not exists weight_g    int;
alter table public.candles add column if not exists images      text[] not null default '{}';
alter table public.candles add column if not exists category    text;

-- Remove the 4 placeholder products from setup.sql.
delete from public.candles;

insert into public.candles (name, description, price, weight_g, composition, image_url, images, sort_order) values
  ('Сніжинка',
   'Новорічна свічка у формі сніжинки. Можна замовити в подарунковій коробці.',
   185, 74,
   'Соєвий віск з додаванням бджолиного, аромаолія',
   'img/products/snowflake-1.jpg',
   array['img/products/snowflake-1.jpg','img/products/snowflake-2.jpg'], 1),

  ('Зимовий Янгол',
   'Новорічна свічка у формі ангела у в''язаному одязі.',
   265, 120,
   'Соєвий віск з додаванням бджолиного, аромаолія',
   'img/products/angel-1.jpg',
   array['img/products/angel-1.jpg'], 2),

  ('Гном',
   'Новорічна свічка-гном із зірочкою. Подарункова коробка з бантиком.',
   165, 67,
   'Соєвий віск з додаванням бджолиного, аромаолія',
   'img/products/gnome-1.jpg',
   array['img/products/gnome-1.jpg','img/products/gnome-2.jpg'], 3),

  ('Ялинка',
   'Свічка в дерев''яному кашпо у формі ялинки.',
   500, null,
   'Кашпо з дерева, соєвий віск, аромаолія',
   'img/products/tree-1.jpg',
   array['img/products/tree-1.jpg'], 4),

  ('Карусель (чайна)',
   'Чайна свічка в гіпсовому кашпо у вигляді каруселі.',
   90, null,
   'Соєвий віск, аромаолія. Кашпо з гіпсу',
   'img/products/carousel-tea-1.jpg',
   array['img/products/carousel-tea-1.jpg'], 5),

  ('Карусель (у кашпо)',
   'Свічка в гіпсовому кашпо у вигляді каруселі з кришкою.',
   550, null,
   'Соєвий віск, аромаолія. Кашпо з гіпсу',
   'img/products/carousel-1.jpg',
   array['img/products/carousel-1.jpg'], 6),

  ('Горішок (у кашпо)',
   'Свічка в гіпсовому кашпо у вигляді горіха з кришкою.',
   590, null,
   'Соєвий віск, аромаолія. Кашпо з гіпсу',
   'img/products/walnut-1.jpg',
   array['img/products/walnut-1.jpg'], 7),

  ('Мандаринка (у кашпо)',
   'Свічка в гіпсовому кашпо у вигляді мандарина з кришкою.',
   480, null,
   'Соєвий віск, аромаолія. Кашпо з гіпсу',
   'img/products/tangerine-1.jpg',
   array['img/products/tangerine-1.jpg'], 8);

-- Categories (change names freely; the site builds the filter buttons from this column).
update public.candles set category = 'Фігурні'      where sort_order in (1, 2, 3);
update public.candles set category = 'У кашпо'      where sort_order in (4, 6, 7, 8);
update public.candles set category = 'Чайні свічки' where sort_order = 5;
