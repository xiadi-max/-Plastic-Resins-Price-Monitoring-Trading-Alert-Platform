import type { SupabaseClient } from '@supabase/supabase-js';

export type ThresholdType = 'percentage' | 'absolute';
export type MonitoringMode = 'lowest' | 'nth_lowest' | 'nth_highest' | 'average';

export interface AppSettings {
  id?: string;
  is_alert_enabled: boolean;
  threshold_type: ThresholdType;
  monitoring_mode: MonitoringMode;
  monitoring_rank: number | null;
  threshold_value: number;
  urgent_threshold_value: number;
  alert_sound: string;
  is_desktop_notification: boolean;
  is_quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  refresh_interval_minutes: number;
  last_scheduled_refresh_at: string | null;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  is_alert_enabled: true,
  threshold_type: 'percentage',
  monitoring_mode: 'lowest',
  monitoring_rank: null,
  threshold_value: 3,
  urgent_threshold_value: 5,
  alert_sound: 'wechat',
  is_desktop_notification: true,
  is_quiet_hours_enabled: true,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
  refresh_interval_minutes: 15,
  last_scheduled_refresh_at: null,
};

export const SETTINGS_ROW_ID = '00000000-0000-4000-8000-000000000001';

function normalizeSettings(row: Record<string, unknown> | null): AppSettings {
  if (!row) {
    return { ...DEFAULT_APP_SETTINGS };
  }

  return {
    id: row.id as string | undefined,
    is_alert_enabled: row.is_alert_enabled !== false,
    threshold_type: row.threshold_type === 'absolute' ? 'absolute' : 'percentage',
    monitoring_mode:
      row.monitoring_mode === 'nth_lowest' || row.monitoring_mode === 'nth_highest' || row.monitoring_mode === 'average'
        ? row.monitoring_mode
        : DEFAULT_APP_SETTINGS.monitoring_mode,
    monitoring_rank: row.monitoring_rank ? Number(row.monitoring_rank) : DEFAULT_APP_SETTINGS.monitoring_rank,
    threshold_value: Number(row.threshold_value ?? DEFAULT_APP_SETTINGS.threshold_value),
    urgent_threshold_value: Number(
      row.urgent_threshold_value ?? DEFAULT_APP_SETTINGS.urgent_threshold_value
    ),
    alert_sound: (row.alert_sound as string) || DEFAULT_APP_SETTINGS.alert_sound,
    is_desktop_notification: row.is_desktop_notification !== false,
    is_quiet_hours_enabled: row.is_quiet_hours_enabled !== false,
    quiet_hours_start:
      (row.quiet_hours_start as string) || DEFAULT_APP_SETTINGS.quiet_hours_start,
    quiet_hours_end: (row.quiet_hours_end as string) || DEFAULT_APP_SETTINGS.quiet_hours_end,
    refresh_interval_minutes: Number(
      row.refresh_interval_minutes ?? DEFAULT_APP_SETTINGS.refresh_interval_minutes
    ),
    last_scheduled_refresh_at: (row.last_scheduled_refresh_at as string | null) ?? null,
  };
}

export async function getAppSettings(supabase: SupabaseClient): Promise<AppSettings> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', SETTINGS_ROW_ID)
    .maybeSingle();

  if (error) {
    console.warn('读取 app_settings 失败，使用默认值:', error.message);
    return { ...DEFAULT_APP_SETTINGS };
  }

  if (!data) {
    const defaults = { id: SETTINGS_ROW_ID, ...DEFAULT_APP_SETTINGS };
    const { data: inserted } = await supabase
      .from('app_settings')
      .insert(defaults)
      .select('*')
      .single();

    return normalizeSettings(inserted);
  }

  return normalizeSettings(data);
}

export async function saveAppSettings(
  supabase: SupabaseClient,
  settings: Partial<AppSettings>
): Promise<AppSettings> {
  const payload = {
    id: SETTINGS_ROW_ID,
    is_alert_enabled: settings.is_alert_enabled ?? DEFAULT_APP_SETTINGS.is_alert_enabled,
    threshold_type: settings.threshold_type ?? DEFAULT_APP_SETTINGS.threshold_type,
    monitoring_mode: settings.monitoring_mode ?? DEFAULT_APP_SETTINGS.monitoring_mode,
    monitoring_rank: settings.monitoring_rank ?? DEFAULT_APP_SETTINGS.monitoring_rank,
    threshold_value: settings.threshold_value ?? DEFAULT_APP_SETTINGS.threshold_value,
    urgent_threshold_value:
      settings.urgent_threshold_value ?? DEFAULT_APP_SETTINGS.urgent_threshold_value,
    alert_sound: settings.alert_sound ?? DEFAULT_APP_SETTINGS.alert_sound,
    is_desktop_notification:
      settings.is_desktop_notification ?? DEFAULT_APP_SETTINGS.is_desktop_notification,
    is_quiet_hours_enabled:
      settings.is_quiet_hours_enabled ?? DEFAULT_APP_SETTINGS.is_quiet_hours_enabled,
    quiet_hours_start: settings.quiet_hours_start ?? DEFAULT_APP_SETTINGS.quiet_hours_start,
    quiet_hours_end: settings.quiet_hours_end ?? DEFAULT_APP_SETTINGS.quiet_hours_end,
    refresh_interval_minutes:
      settings.refresh_interval_minutes ?? DEFAULT_APP_SETTINGS.refresh_interval_minutes,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('app_settings')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeSettings(data);
}

export async function touchLastScheduledRefresh(supabase: SupabaseClient): Promise<void> {
  await supabase
    .from('app_settings')
    .upsert(
      {
        id: SETTINGS_ROW_ID,
        ...DEFAULT_APP_SETTINGS,
        last_scheduled_refresh_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
}
