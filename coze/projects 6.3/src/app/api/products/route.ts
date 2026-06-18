import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取商品列表
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const shopId = searchParams.get("shopId");
    const categoryFilter = searchParams.get("category"); // 品名/制造商筛选
    const valueFilter = searchParams.get("value"); // 筛选的具体值

    let query = supabase
      .from("product_categories")
      .select("*")
      .eq("is_deleted", false);

    // 如果指定了店铺ID
    if (shopId) {
      query = query.eq("shop_id", shopId);
    }

    // 如果指定了筛选类别和值
    if (categoryFilter && valueFilter && valueFilter !== "全部") {
      if (categoryFilter === "品名") {
        query = query.eq("product_name", valueFilter);
      } else if (categoryFilter === "制造商") {
        query = query.eq("manufacturer", valueFilter);
      }
    }

    const { data: products, error } = await query.order("product_name");

    if (error) {
      console.error("获取商品列表失败:", error);
      return NextResponse.json(
        { success: false, error: "获取商品列表失败" },
        { status: 500 }
      );
    }

    // 获取全局提醒规则
    let alertRules: any[] = [];
    if (shopId) {
      const { data, error: alertRuleError } = await supabase
        .from("alert_rules")
        .select("*")
        .eq("shop_id", shopId)
        .eq("rule_type", "default");

      if (!alertRuleError && data) {
        alertRules = data;
      }
    }

    return NextResponse.json({
      success: true,
      data: products || [],
      alertRules: alertRules || [],
    });
  } catch (error) {
    console.error("获取商品列表错误:", error);
    return NextResponse.json(
      { success: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}

// 批量更新商品（用于阈值设置等）
export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { ids, updates } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "请选择要更新的商品" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("product_categories")
      .update(updates)
      .in("id", ids)
      .select();

    if (error) {
      console.error("更新商品失败:", error);
      return NextResponse.json(
        { success: false, error: "更新商品失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `已更新 ${ids.length} 个商品`,
      data,
    });
  } catch (error) {
    console.error("更新商品错误:", error);
    return NextResponse.json(
      { success: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
