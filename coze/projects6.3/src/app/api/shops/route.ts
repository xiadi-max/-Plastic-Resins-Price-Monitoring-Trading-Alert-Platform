import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 爬取普拉司网商品（延迟导入，避免启动时出错）
async function fetchProductsFromPlasway(shopUrl: string): Promise<any[]> {
  try {
    // 动态导入爬虫模块
    const { scrapePlaswayProducts } = await import("@/lib/plasway-scraper");
    const result = await scrapePlaswayProducts(shopUrl);
    
    if (!result.success) {
      console.error("爬取失败:", result.error);
      return [];
    }

    const seen = new Set<string>();
    return result.data
      .map((product) => ({
        product_name: product.product_name,
        manufacturer: product.manufacturer,
        model: product.model,
        current_price: product.current_price,
        category_level1: "品名",
        price_change_percent: 0,
      }))
      .filter((product) => {
        const key = `${product.product_name}__${product.manufacturer}__${product.model}`.trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  } catch (error) {
    console.error("爬取异常:", error);
    return [];
  }
}

// POST - 添加店铺并爬取商品
export async function POST(request: NextRequest) {
  try {
    const { shop_url } = await request.json();

    if (!shop_url) {
      return NextResponse.json(
        { error: "请提供店铺链接" },
        { status: 400 }
      );
    }

    // 验证 URL 格式
    try {
      new URL(shop_url);
    } catch {
      return NextResponse.json(
        { error: "链接格式不正确" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 检查是否已存在该店铺
    const { data: existingShop } = await supabase
      .from("user_shops")
      .select("id")
      .eq("shop_url", shop_url)
      .single();

    let shopId: string;

    if (existingShop) {
      shopId = existingShop.id;
      // 更新店铺信息
      await supabase
        .from("user_shops")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", shopId);
    } else {
      // 提取公司名（从 URL 中）
      const url = new URL(shop_url);
      const pathParts = url.pathname.split("/");
      const companyName = pathParts[2] || "未知公司";

      // 创建新店铺
      const { data: newShop, error: shopError } = await supabase
        .from("user_shops")
        .insert({
          shop_url: shop_url,
          company_name: companyName,
        })
        .select("id")
        .single();

      if (shopError || !newShop) {
        console.error("创建店铺失败详情:", shopError);
        return NextResponse.json(
          {
            error: `创建店铺失败：${shopError?.message || '未知错误'}`,
            code: shopError?.code,
            hint: shopError?.hint,
            details: shopError?.details,
          },
          { status: 500 }
        );
      }

      shopId = newShop.id;
    }

    // 爬取商品数据
    const products = await fetchProductsFromPlasway(shop_url);

    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        message: "店铺已保存，但未能获取到商品数据，请检查链接是否正确",
        shop_id: shopId,
        products_count: 0,
      });
    }

    // 保存商品到数据库
    const seen = new Set<string>();
    const productsToInsert = products
      .map((p) => {
        // 确保价格是纯数字 - 处理各种格式
        let priceValue = 0;
        if (typeof p.current_price === 'number') {
          priceValue = p.current_price;
        } else if (typeof p.current_price === 'string') {
          // 从字符串中提取数字（如 "{1150000 ...}" 或 "11,500"）
          const match = p.current_price.match(/(\d[\d,]*)/);
          if (match) {
            priceValue = parseFloat(match[1].replace(/,/g, '')) || 0;
          }
        }

        const changePercent = typeof p.price_change_percent === 'number'
          ? p.price_change_percent
          : parseFloat(String(p.price_change_percent)) || 0;

        const product = {
          shop_id: shopId,
          product_name: p.product_name,
          manufacturer: p.manufacturer || "",
          model: p.model || "", // 型号
          current_price: priceValue, // 确保是纯数字
          price_change_percent: changePercent,
          category_level1: p.category_level1 || p.product_name,
          is_monitored: true, // 默认启用监控
          is_deleted: false,
        };

        const key = `${product.product_name}__${product.manufacturer}__${product.model}`;
        if (seen.has(key)) return null;
        seen.add(key);
        return product;
      })
      .filter(Boolean) as Array<Record<string, unknown>>;

    await supabase
      .from("product_categories")
      .update({ is_deleted: true })
      .eq("shop_id", shopId);

    const { error: productError } = await supabase
      .from("product_categories")
      .insert(productsToInsert);

    if (productError) {
      console.error("保存商品失败:", productError);
      return NextResponse.json(
        {
          success: false,
          error: `商品保存失败：${productError.message}`,
          shop_id: shopId,
          products_count: products.length,
        },
        { status: 500 }
      );
    }

    // 获取保存后的店铺信息
    const { data: shop } = await supabase
      .from("user_shops")
      .select("*")
      .eq("id", shopId)
      .single();

    return NextResponse.json({
      success: true,
      shop: shop,
      products_count: products.length,
    });
  } catch (error: any) {
    console.error("添加店铺失败:", error);
    return NextResponse.json(
      { error: "服务器错误: " + error.message },
      { status: 500 }
    );
  }
}

// GET - 获取店铺列表
export async function GET() {
  try {
    const supabase = getSupabaseClient();

    const { data: shops, error } = await supabase
      .from("user_shops")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "获取店铺列表失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: shops || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "服务器错误: " + error.message },
      { status: 500 }
    );
  }
}
