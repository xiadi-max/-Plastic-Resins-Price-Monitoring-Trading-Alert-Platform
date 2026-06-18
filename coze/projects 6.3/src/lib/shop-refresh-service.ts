import type { SupabaseClient } from '@supabase/supabase-js';
import {
  scrapePlaswayProducts,
  scrapePlaswayMarketPrices,
  type MarketQuote,
} from '@/lib/plasway-scraper';
import { getAppSettings } from '@/lib/app-settings';
import { generateAlertsFromProducts, type ProductSnapshot } from '@/lib/alert-engine';

export interface RefreshShopResult {
  shopId: string;
  success: boolean;
  productCount: number;
  newPriceCount: number;
  alertCount: number;
  error?: string;
}

async function fetchProductsFromPlasway(shopUrl: string) {
  const result = await scrapePlaswayProducts(shopUrl);

  if (!result.success) {
    throw new Error(result.error || '爬取失败');
  }

  const seen = new Set<string>();
  return result.data
    .map((product) => ({
      product_name: product.product_name,
      manufacturer: product.manufacturer,
      model: product.model,
      current_price: product.current_price,
      category_level1: '品名',
    }))
    .filter((product) => {
      const key = `${product.product_name}__${product.manufacturer}__${product.model}`.trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function pickMarketPrice(quotes: MarketQuote[], mode: string): number {
  const sorted = [...quotes]
    .map((item) => Number(item.current_price))
    .filter((price) => Number.isFinite(price) && price > 0)
    .sort((a, b) => a - b);

  if (sorted.length === 0) return 0;

  const nthMatch = mode.match(/^(nth_lowest|nth_highest):(\d+)$/);
  if (nthMatch) {
    const rank = Math.max(1, Number(nthMatch[2]));
    if (nthMatch[1] === 'nth_lowest') {
      return sorted[Math.min(rank - 1, sorted.length - 1)];
    }
    return sorted[Math.max(sorted.length - rank, 0)];
  }

  switch (mode) {
    case 'highest':
      return sorted[sorted.length - 1];
    case 'average':
      return parseFloat((sorted.reduce((sum, price) => sum + price, 0) / sorted.length).toFixed(2));
    case 'second_lowest':
      return sorted[Math.min(1, sorted.length - 1)];
    case 'lowest':
    default:
      return sorted[0];
  }
}

export async function refreshShopById(
  supabase: SupabaseClient,
  shopId: string,
  options: { generateAlerts?: boolean } = {}
): Promise<RefreshShopResult> {
  const generateAlerts = options.generateAlerts !== false;

  const { data: shop, error: shopError } = await supabase
    .from('user_shops')
    .select('*')
    .eq('id', shopId)
    .single();

  if (shopError || !shop) {
    return {
      shopId,
      success: false,
      productCount: 0,
      newPriceCount: 0,
      alertCount: 0,
      error: '店铺不存在',
    };
  }

  const { data: existingProducts } = await supabase
    .from('product_categories')
    .select('*')
    .eq('shop_id', shopId)
    .eq('is_deleted', false);

  const existingMap = new Map<string, Record<string, unknown>>();
  existingProducts?.forEach((product) => {
    const key = `${product.product_name}__${product.manufacturer}__${product.model || ''}`;
    existingMap.set(key, product);
  });

  const newProducts = await fetchProductsFromPlasway(shop.shop_url);

  if (newProducts.length === 0) {
    return {
      shopId,
      success: false,
      productCount: 0,
      newPriceCount: 0,
      alertCount: 0,
      error: '无法获取商品数据',
    };
  }

  await supabase.from('product_categories').update({ is_deleted: true }).eq('shop_id', shopId);

  const productsToInsert = [] as Array<Record<string, unknown>>;
  for (const newProduct of newProducts) {
    const key = `${newProduct.product_name}__${newProduct.manufacturer}__${newProduct.model || ''}`;
    const existing = existingMap.get(key);
    const marketResult = await scrapePlaswayMarketPrices(newProduct);
    const marketPrice = marketResult.success
      ? pickMarketPrice(marketResult.data, (existing?.monitoring_mode as string) || 'lowest')
      : newProduct.current_price;

    let priceChangePercent = 0;
    const previousPrice = Number(existing?.current_price ?? marketPrice);
    if (existing && Number(existing.current_price) > 0) {
      priceChangePercent = parseFloat(
        (
          ((Number(marketPrice) - Number(existing.current_price)) /
            Number(existing.current_price)) *
          100
        ).toFixed(2)
      );
    }

    productsToInsert.push({
      shop_id: shopId,
      product_name: newProduct.product_name,
      manufacturer: newProduct.manufacturer || '',
      model: newProduct.model || '',
      current_price: marketPrice,
      previous_price: previousPrice,
      price_change_percent: priceChangePercent,
      is_monitored: existing?.is_monitored ?? true,
      monitoring_mode: (existing?.monitoring_mode as string) || 'lowest',
      is_deleted: false,
      category_level1: newProduct.category_level1,
      threshold_type: existing?.threshold_type || 'percentage',
      custom_threshold_value: existing?.custom_threshold_value,
      custom_urgent_threshold: existing?.custom_urgent_threshold,
      is_custom_threshold: existing?.is_custom_threshold || false,
    });
  }

  const { error: insertError } = await supabase
    .from('product_categories')
    .insert(productsToInsert);

  if (insertError) {
    return {
      shopId,
      success: false,
      productCount: 0,
      newPriceCount: 0,
      alertCount: 0,
      error: insertError.message,
    };
  }

  await supabase
    .from('user_shops')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', shopId);

  const { data: updatedProducts } = await supabase
    .from('product_categories')
    .select('*')
    .eq('shop_id', shopId)
    .eq('is_deleted', false);

  const newPriceCount =
    updatedProducts?.filter((product) => Number(product.price_change_percent) !== 0).length || 0;

  let alertCount = 0;

  if (generateAlerts && updatedProducts && updatedProducts.length > 0) {
    const settings = await getAppSettings(supabase);
    const snapshots: ProductSnapshot[] = updatedProducts.map((product) => ({
      id: product.id,
      shop_id: product.shop_id,
      product_name: product.product_name,
      manufacturer: product.manufacturer,
      current_price: Number(product.current_price),
      previous_price: Number(product.previous_price),
      price_change_percent: Number(product.price_change_percent),
      is_monitored: product.is_monitored,
      threshold_type: product.threshold_type,
      custom_threshold_value: product.custom_threshold_value,
      custom_urgent_threshold: product.custom_urgent_threshold,
      is_custom_threshold: product.is_custom_threshold,
    }));

    const alerts = generateAlertsFromProducts(snapshots, settings);

    if (alerts.length > 0) {
      const { error: alertError } = await supabase.from('alert_history').insert(
        alerts.map((alert) => ({
          shop_id: alert.shop_id,
          product_id: alert.product_id,
          alert_type: alert.alert_type,
          title: alert.title,
          message: alert.message,
          old_price: alert.old_price,
          new_price: alert.new_price,
          change_percent: alert.change_percent,
          is_read: false,
        }))
      );

      if (alertError) {
        console.error('写入提醒历史失败:', alertError.message);
      } else {
        alertCount = alerts.length;
      }
    }
  }

  return {
    shopId,
    success: true,
    productCount: newProducts.length,
    newPriceCount,
    alertCount,
  };
}

export async function refreshAllShops(
  supabase: SupabaseClient
): Promise<{ results: RefreshShopResult[]; totalAlerts: number }> {
  const { data: shops, error } = await supabase.from('user_shops').select('id');

  if (error || !shops) {
    throw new Error(error?.message || '获取店铺列表失败');
  }

  const results: RefreshShopResult[] = [];

  for (const shop of shops) {
    try {
      const result = await refreshShopById(supabase, shop.id);
      results.push(result);
    } catch (err) {
      results.push({
        shopId: shop.id,
        success: false,
        productCount: 0,
        newPriceCount: 0,
        alertCount: 0,
        error: err instanceof Error ? err.message : '刷新失败',
      });
    }
  }

  const totalAlerts = results.reduce((sum, item) => sum + item.alertCount, 0);
  return { results, totalAlerts };
}
