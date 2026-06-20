import type { AppSettings, ThresholdType } from '@/lib/app-settings';

export type AlertLevel = 'general' | 'urgent';

export interface ProductSnapshot {
  id: string;
  shop_id: string;
  product_name: string;
  manufacturer?: string | null;
  current_price: number;
  previous_price: number;
  price_change_percent: number;
  is_monitored: boolean;
  threshold_type?: string | null;
  custom_threshold_value?: number | null;
  custom_urgent_threshold?: number | null;
  is_custom_threshold?: boolean | null;
}

export interface GeneratedAlert {
  shop_id: string;
  product_id: string;
  alert_type: AlertLevel;
  title: string;
  message: string;
  old_price: number;
  new_price: number;
  change_percent: number;
}

function parseTimeToMinutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + (minute || 0);
}

export function isInQuietHours(settings: AppSettings, now = new Date()): boolean {
  if (!settings.is_quiet_hours_enabled) {
    return false;
  }

  const current = now.getHours() * 60 + now.getMinutes();
  const start = parseTimeToMinutes(settings.quiet_hours_start);
  const end = parseTimeToMinutes(settings.quiet_hours_end);

  if (start === end) {
    return false;
  }

  if (start > end) {
    return current >= start || current < end;
  }

  return current >= start && current < end;
}

function resolveThresholdType(
  product: ProductSnapshot,
  settings: AppSettings
): ThresholdType {
  if (product.is_custom_threshold && product.threshold_type) {
    return product.threshold_type === 'absolute' ? 'absolute' : 'percentage';
  }
  return settings.threshold_type;
}

function resolveThresholdValues(product: ProductSnapshot, settings: AppSettings) {
  const thresholdType = resolveThresholdType(product, settings);

  if (product.is_custom_threshold) {
    return {
      thresholdType,
      threshold: Number(product.custom_threshold_value ?? settings.threshold_value),
      urgent: Number(product.custom_urgent_threshold ?? settings.urgent_threshold_value),
    };
  }

  return {
    thresholdType,
    threshold: settings.threshold_value,
    urgent: settings.urgent_threshold_value,
  };
}

function getChangeMagnitude(
  product: ProductSnapshot,
  thresholdType: ThresholdType
): number {
  if (thresholdType === 'absolute') {
    return Math.abs(Number(product.current_price) - Number(product.previous_price));
  }
  return Math.abs(Number(product.price_change_percent));
}

export function evaluateProductAlert(
  product: ProductSnapshot,
  settings: AppSettings
): GeneratedAlert | null {
  if (!settings.is_alert_enabled || !product.is_monitored) {
    return null;
  }

  if (Number(product.price_change_percent) === 0) {
    return null;
  }

  const { thresholdType, threshold, urgent } = resolveThresholdValues(product, settings);
  const magnitude = getChangeMagnitude(product, thresholdType);

  if (magnitude < threshold) {
    return null;
  }

  const alertType: AlertLevel = magnitude >= urgent ? 'urgent' : 'general';
  const direction = product.price_change_percent >= 0 ? '上涨' : '下跌';
  const changeLabel =
    thresholdType === 'absolute'
      ? `变动 ¥${magnitude.toLocaleString()} 元/吨`
      : `变动 ${product.price_change_percent.toFixed(2)}%`;

  return {
    shop_id: product.shop_id,
    product_id: product.id,
    alert_type: alertType,
    title: `${product.product_name} 价格${direction}`,
    message: `${product.product_name}${product.manufacturer ? `（${product.manufacturer}）` : ''}：¥${Number(product.previous_price).toLocaleString()} → ¥${Number(product.current_price).toLocaleString()}，${changeLabel}`,
    old_price: Number(product.previous_price),
    new_price: Number(product.current_price),
    change_percent: Number(product.price_change_percent),
  };
}

export function shouldNotifyClient(
  alert: GeneratedAlert,
  settings: AppSettings,
  now = new Date()
): { notify: boolean; playSound: boolean; showDesktop: boolean } {
  if (!settings.is_alert_enabled) {
    return { notify: false, playSound: false, showDesktop: false };
  }

  if (isInQuietHours(settings, now)) {
    return { notify: false, playSound: false, showDesktop: false };
  }

  const isUrgent = alert.alert_type === 'urgent';
  return {
    notify: true,
    playSound: isUrgent,
    showDesktop: isUrgent && settings.is_desktop_notification,
  };
}

export function generateAlertsFromProducts(
  products: ProductSnapshot[],
  settings: AppSettings
): GeneratedAlert[] {
  return products
    .map((product) => evaluateProductAlert(product, settings))
    .filter((alert): alert is GeneratedAlert => alert !== null);
}
