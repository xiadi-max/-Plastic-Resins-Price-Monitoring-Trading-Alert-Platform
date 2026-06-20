import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const unreadOnly = searchParams.get("unread") === "true";
    const since = searchParams.get("since");

    let query = supabase
      .from("alert_history")
      .select(`
        id,
        shop_id,
        product_id,
        alert_type,
        title,
        message,
        old_price,
        new_price,
        change_percent,
        is_read,
        created_at,
        user_shops (
          shop_url,
          company_name
        ),
        product_categories (
          product_name,
          model,
          manufacturer
        )
      `)
      .order("created_at", { ascending: false })
      .limit(unreadOnly ? 50 : 20);

    if (unreadOnly) {
      query = query.eq("is_read", false);
    }

    if (since) {
      query = query.gt("created_at", since);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("获取提醒历史失败:", error);
    return NextResponse.json(
      { success: false, error: "获取提醒历史失败" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, is_read } = await request.json();

    if (!id) {
      return NextResponse.json({ success: false, error: "缺少 id 参数" }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from("alert_history")
      .update({ is_read })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("更新提醒状态失败:", error);
    return NextResponse.json(
      { success: false, error: "更新提醒状态失败" },
      { status: 500 }
    );
  }
}
