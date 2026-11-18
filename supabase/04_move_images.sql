-- Run ONCE, AFTER you uploaded the 10 files from img/products/ to the root of the
-- `candle-images` bucket (same file names). Points the products at the bucket URLs.
-- Safe to re-run: only rows still using local paths are changed.

update public.candles
set image_url = 'https://ghixcaazsczgbmfvjpkm.supabase.co/storage/v1/object/public/candle-images/'
                || regexp_replace(image_url, '^img/products/', ''),
    images = array(
      select 'https://ghixcaazsczgbmfvjpkm.supabase.co/storage/v1/object/public/candle-images/'
             || regexp_replace(x, '^img/products/', '')
      from unnest(images) as x
    )
where image_url like 'img/products/%';
