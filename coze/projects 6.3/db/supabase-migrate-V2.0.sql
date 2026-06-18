-- 2026-06-11 V2.0 + 清理 product_categories 重复数据并补唯一约束（仅限制未删除商品）

drop index if exists public.idx_product_categories_shop_unique_key;

with ranked as (
  select
    id,
    row_number() over (
      partition by
        shop_id,
        product_name,
        coalesce(manufacturer, ''),
        coalesce(model, '')
      order by created_at desc, id desc
    ) as rn
  from public.product_categories
  where is_deleted = false
)
delete from public.product_categories p
using ranked r
where p.id = r.id
  and r.rn > 1;

create unique index if not exists idx_product_categories_shop_unique_key
  on public.product_categories (
    shop_id,
    product_name,
    coalesce(manufacturer, ''),
    coalesce(model, '')
  )
  where is_deleted = false;
