-- 启用 UUID 生成能力
create extension if not exists "pgcrypto";

-- =========================
-- 店铺表
-- =========================
create table if not exists public.user_shops (
  id uuid primary key default gen_random_uuid(),
  shop_url text not null unique,
  company_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- 商品分类表
-- =========================
create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.user_shops(id) on delete cascade,
  product_name text not null,
  manufacturer text default '',
  model text default '',
  current_price numeric default 0,
  previous_price numeric default 0,
  price_change_percent numeric default 0,
  category_level1 text default '',
  is_monitored boolean default true,
  monitoring_mode text default 'lowest',
  is_deleted boolean default false,
  threshold_type text default 'percentage',
  custom_threshold_value numeric,
  custom_urgent_threshold numeric,
  is_custom_threshold boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- 提醒规则表
-- =========================
create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.user_shops(id) on delete cascade,
  rule_type text not null default 'default',
  title text default '',
  description text default '',
  threshold_type text default 'percentage',
  threshold_value numeric,
  urgent_threshold_value numeric,
  is_enabled boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- 全局应用设置（单例行）
-- =========================
create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  is_alert_enabled boolean default true,
  threshold_type text default 'percentage',
  monitoring_mode text default 'lowest',
  monitoring_rank integer,
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
  monitoring_mode,
  monitoring_rank,
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
  'lowest',
  null,
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

-- =========================
-- 提醒历史表
-- =========================
create table if not exists public.alert_history (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.user_shops(id) on delete cascade,
  product_id uuid references public.product_categories(id) on delete cascade,
  alert_type text not null,
  title text not null,
  message text,
  old_price numeric,
  new_price numeric,
  change_percent numeric,
  is_read boolean default false,
  created_at timestamptz not null default now()
);

-- =========================
-- 索引
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

create index if not exists idx_app_settings_updated_at
  on public.app_settings(updated_at desc);

-- =========================
-- 唯一约束
-- 仅限制未删除商品，避免历史软删除数据冲突
-- =========================
create unique index if not exists idx_product_categories_shop_unique_key
  on public.product_categories (
    shop_id,
    product_name,
    coalesce(manufacturer, ''),
    coalesce(model, '')
  )
  where is_deleted = false;

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
-- updated_at 触发器
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