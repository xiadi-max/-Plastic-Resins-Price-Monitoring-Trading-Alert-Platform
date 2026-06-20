import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getAppSettings, saveAppSettings } from '@/lib/app-settings';

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const settings = await getAppSettings(supabase);

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('读取设置失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '读取设置失败' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getSupabaseClient();
    const settings = await saveAppSettings(supabase, body);

    return NextResponse.json({
      success: true,
      message: '设置已保存',
      data: settings,
    });
  } catch (error) {
    console.error('保存设置失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '保存设置失败' },
      { status: 500 }
    );
  }
}
