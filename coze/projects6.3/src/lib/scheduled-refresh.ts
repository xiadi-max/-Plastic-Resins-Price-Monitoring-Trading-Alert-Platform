import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getAppSettings } from '@/lib/app-settings';
import { refreshAllShops } from '@/lib/shop-refresh-service';

let schedulerTimer: NodeJS.Timeout | null = null;
let isRunning = false;

async function runScheduledRefreshInternal() {
  if (isRunning) {
    console.log('[scheduler] 上一次定时刷新尚未结束，跳过本次');
    return;
  }

  isRunning = true;
  const startedAt = new Date().toISOString();

  try {
    console.log(`[scheduler] 开始定时刷新 @ ${startedAt}`);
    const supabase = getSupabaseClient();
    const { results, totalAlerts } = await refreshAllShops(supabase);

    await supabase
      .from('app_settings')
      .upsert(
        {
          id: '00000000-0000-4000-8000-000000000001',
          last_scheduled_refresh_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    const successCount = results.filter((item) => item.success).length;
    console.log(
      `[scheduler] 定时刷新完成：${successCount}/${results.length} 店铺成功，生成 ${totalAlerts} 条提醒`
    );
  } catch (error) {
    console.error('[scheduler] 定时刷新失败:', error);
  } finally {
    isRunning = false;
  }
}

export function startScheduledRefresh() {
  if (schedulerTimer) {
    return;
  }

  const bootstrap = async () => {
    try {
      const supabase = getSupabaseClient();
      const settings = await getAppSettings(supabase);
      const intervalMinutes = settings.refresh_interval_minutes || 15;
      const intervalMs = intervalMinutes * 60 * 1000;

      console.log(`[scheduler] 已启动，每 ${intervalMinutes} 分钟自动刷新店铺价格`);

      schedulerTimer = setInterval(() => {
        void runScheduledRefreshInternal();
      }, intervalMs);

      setTimeout(() => {
        void runScheduledRefreshInternal();
      }, 30_000);
    } catch (error) {
      console.error('[scheduler] 启动失败，使用默认 15 分钟间隔:', error);
      schedulerTimer = setInterval(() => {
        void runScheduledRefreshInternal();
      }, 15 * 60 * 1000);
    }
  };

  void bootstrap();
}
