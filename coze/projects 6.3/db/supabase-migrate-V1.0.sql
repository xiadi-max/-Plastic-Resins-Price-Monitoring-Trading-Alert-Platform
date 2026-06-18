-- 如果之前没启用 UUID 扩展，也补上
create extension if not exists "pgcrypto";

-- =========================
-- 补充 product_categories 缺失字段
-- =========================
alter table public.product_categories
add column if not exists previous_price numeric default 0,
add column if not exists threshold_type text default 'percentage',
add column if not exists custom_threshold_value numeric,
add column if not exists custom_urgent_threshold numeric,
add column if not exists is_custom_threshold boolean default false;

-- =========================
-- 全局应用设置表
-- =========================
create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  is_alert_enabled boolean default true,
  threshold_type text default 'percentage',
  threshold_value numeric default 3,
  urgent_threshold_value numeric default 5,
  alert_sound text default 'wechat',
  is_desktop_notification boolean default true,
  is_quiet_hours_enabled boolean default true,
  quiet_hours_start text default '22:00',
  quiet_hours_end text default '08:00',
  refresh_interval_minutes integer default 15,
  last_scheduled_refresh_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.app_settings (
  id,
  is_alert_enabled,
  threshold_type,
  threshold_value,
  urgent_threshold_value,
  alert_sound,
  is_desktop_notification,
  is_quiet_hours_enabled,
  quiet_hours_start,
  quiet_hours_end,
  refresh_interval_minutes
)
values (
  '00000000-0000-4000-8000-000000000001',
  true,
  'percentage',
  3,
  5,
  'wechat',
  true,
  true,
  '22:00',
  '08:00',
  15
)
on conflict (id) do nothing;

alter table public.alert_history
add column if not exists old_price numeric,
add column if not exists new_price numeric,
add column if not exists change_percent numeric;

-- =========================
-- 补充 alert_rules 表结构
-- =========================
alter table public.alert_rules
add column if not exists title text default '',
add column if not exists description text default '',
add column if not exists threshold_type text default 'percentage',
add column if not exists threshold_value numeric,
add column if not exists urgent_threshold_value numeric,
add column if not exists is_enabled boolean default true;

-- =========================
-- 补充索引
-- =========================
create index if not exists idx_user_shops_created_at
  on public.user_shops(created_at desc);

create index if not exists idx_product_categories_shop_id
  on public.product_categories(shop_id);

create index if not exists idx_product_categories_monitored
  on public.product_categories(is_monitored);

create index if not exists idx_product_categories_deleted
  on public.product_categories(is_deleted);

create index if not exists idx_alert_rules_shop_id
  on public.alert_rules(shop_id);

create index if not exists idx_alert_history_shop_id
  on public.alert_history(shop_id);

create index if not exists idx_alert_history_created_at
  on public.alert_history(created_at desc);

-- =========================
-- updated_at 自动刷新函数
-- =========================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================
-- 重新挂载触发器
-- =========================
drop trigger if exists trg_user_shops_updated_at on public.user_shops;
create trigger trg_user_shops_updated_at
before update on public.user_shops
for each row
execute function public.set_updated_at();

drop trigger if exists trg_product_categories_updated_at on public.product_categories;
create trigger trg_product_categories_updated_at
before update on public.product_categories
for each row
execute function public.set_updated_at();

drop trigger if exists trg_alert_rules_updated_at on public.alert_rules;
create trigger trg_alert_rules_updated_at
before update on public.alert_rules
for each row
execute function public.set_updated_at();

drop trigger if exists trg_app_settings_updated_at on public.app_settings;
create trigger trg_app_settings_updated_at
before update on public.app_settings
for each row
execute function public.set_updated_at();

-- =========================
-- 开发期 RLS 设置
-- =========================
alter table public.user_shops disable row level security;
alter table public.product_categories disable row level security;
alter table public.alert_rules disable row level security;
alter table public.alert_history disable row level security;
alter table public.app_settings disable row level security;