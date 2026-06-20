import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { refreshAllShops } from '@/lib/shop-refresh-service';
import { touchLastScheduledRefresh } from '@/lib/app-settings';

export async function POST(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    const isInternalCall = request.headers.get('x-internal-cron') === '1';

    if (cronSecret && !isInternalCall && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    const { results, totalAlerts } = await refreshAllShops(supabase);
    await touchLastScheduledRefresh(supabase);

    const successCount = results.filter((item) => item.success).length;
    const failed = results.filter((item) => !item.success);

    return NextResponse.json({
      success: true,
      message: `定时刷新完成：${successCount}/${results.length} 个店铺成功，生成 ${totalAlerts} 条提醒`,
      data: {
        successCount,
        totalShops: results.length,
        totalAlerts,
        failed,
        results,
      },
    });
  } catch (error) {
    console.error('定时刷新失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '定时刷新失败',
      },
      { status: 500 }
    );
  }
}
