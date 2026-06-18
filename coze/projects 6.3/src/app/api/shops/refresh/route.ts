import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { refreshShopById } from "@/lib/shop-refresh-service";

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { shopId } = body;

    if (!shopId) {
      return NextResponse.json(
        { success: false, error: "请提供店铺ID" },
        { status: 400 }
      );
    }

    const result = await refreshShopById(supabase, shopId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "刷新失败" },
        { status: result.error === "店铺不存在" ? 404 : 500 }
      );
    }

    const { data: updatedProducts } = await supabase
      .from("product_categories")
      .select("*")
      .eq("shop_id", shopId)
      .eq("is_deleted", false);

    return NextResponse.json({
      success: true,
      message: `刷新成功，共获取 ${result.productCount} 个商品，生成 ${result.alertCount} 条提醒`,
      data: {
        products: updatedProducts || [],
        total: result.productCount,
        newPriceCount: result.newPriceCount,
        alertCount: result.alertCount,
      },
    });
  } catch (error: unknown) {
    console.error("刷新商品错误:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { success: false, error: "服务器错误: " + message },
      { status: 500 }
    );
  }
}
