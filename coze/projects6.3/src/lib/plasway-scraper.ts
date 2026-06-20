/**
 * 普拉司网爬虫服务
 * 使用 Puppeteer 模拟浏览器抓取店铺商品数据
 */

import puppeteer from "puppeteer";

interface Product {
  product_name: string;  // 品名
  manufacturer: string; // 制造商
  model: string;         // 型号
  current_price: number; // 当前价格
}

interface ScrapeResult {
  success: boolean;
  data: Product[];
  error?: string;
}

interface MarketQuote extends Product {
  shop_name?: string;
}

interface MarketScrapeResult {
  success: boolean;
  data: MarketQuote[];
  error?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Page = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Browser = any;

/**
 * 解析 Ant Design Table
 */
function parseAntTable(page: Page): Promise<Product[]> {
  return page.evaluate(() => {
    const products: Product[] = [];
    
    // 获取表格
    const table = document.querySelector("table");
    if (!table) return products;
    
    // 获取表头
    const headers: string[] = [];
    const headerCells = table.querySelectorAll("thead tr th");
    headerCells.forEach((th: Element) => {
      const span = th.querySelector(".ant-table-column-title");
      headers.push(span?.textContent?.trim() || th.textContent?.trim() || "");
    });
    
    // 找到品名、制造商、型号、价格对应的列索引
    const productNameIdx = headers.findIndex(h => h.includes("品名"));
    const manufacturerIdx = headers.findIndex(h => h.includes("制造商"));
    const modelIdx = headers.findIndex(h => h.includes("型号"));
    const priceIdx = headers.findIndex(h => h.includes("价格"));
    
    if (productNameIdx === -1 || priceIdx === -1) {
      console.log("未找到品名或价格列，headers:", headers);
      return products;
    }
    
    // 解析每行数据
    const tbody = table.querySelector("tbody");
    if (!tbody) return products;
    
    const rows = tbody.querySelectorAll("tr");
    rows.forEach((row: Element) => {
      const cells = row.querySelectorAll("td");
      if (cells.length < Math.max(productNameIdx, manufacturerIdx, modelIdx, priceIdx) + 1) return;
      
      const productName = cells[productNameIdx]?.textContent?.trim() || "";
      const manufacturer = manufacturerIdx !== -1 ? cells[manufacturerIdx]?.textContent?.trim() || "" : "";
      const model = modelIdx !== -1 ? cells[modelIdx]?.textContent?.trim() || "" : "";
      const priceText = cells[priceIdx]?.textContent?.trim() || "0";
      
      // 提取价格数字
      const priceMatch = priceText.match(/[\d,.]+/);
      const price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, "")) : 0;
      
      if (productName && price > 0) {
        products.push({
          product_name: productName,
          manufacturer: manufacturer,
          model: model,
          current_price: price,
        });
      }
    });
    
    return products;
  });
}

/**
 * 爬取普拉司网店铺商品
 */
export async function scrapePlaswayProducts(shopUrl: string): Promise<ScrapeResult> {
  let browser: Browser | null = null;
  
  try {
    console.log("正在启动浏览器...");
    
    // 启动浏览器（无头模式）
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--window-size=1920,1080",
      ],
    });
    
    const page: Page = await browser.newPage();
    
    // 设置 User-Agent
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    
    // 设置视口
    await page.setViewport({
      width: 1920,
      height: 1080,
    });
    
    // 设置请求拦截器，移除可能导致反爬虫的请求头
    await page.setExtraHTTPHeaders({});
    
    console.log("正在访问:", shopUrl);
    
    // 访问页面，增加超时时间
    await page.goto(shopUrl, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });
    
    // 等待表格加载
    try {
      await page.waitForSelector("table", { timeout: 30000 });
    } catch (e) {
      console.log("等待表格超时，尝试获取当前页面内容...");
      const content = await page.content();
      console.log("页面内容前1000字符:", content.substring(0, 1000));
      throw new Error("页面加载超时，未找到数据表格");
    }
    
    // 等待页面完全加载
    await page.waitForFunction(() => {
      const table = document.querySelector("table");
      const tbody = table?.querySelector("tbody");
      return tbody && tbody.querySelectorAll("tr").length > 0;
    }, { timeout: 30000 });
    
    console.log("表格已加载，开始解析数据...");
    
    // 解析表格数据
    const products = await parseAntTable(page);
    
    console.log(`解析完成，共获取 ${products.length} 条商品数据`);
    
    await browser.close();
    
    return {
      success: true,
      data: products,
    };
  } catch (error) {
    console.error("爬取失败:", error);
    
    if (browser) {
      await browser.close();
    }
    
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 爬取多页数据
 */
export async function scrapePlaswayProductsMultiPage(
  baseUrl: string, 
  maxPages: number = 3
): Promise<ScrapeResult> {
  const allProducts: Product[] = [];
  let browser: Browser | null = null;
  
  try {
    console.log("正在启动浏览器...");
    
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--window-size=1920,1080",
      ],
    });
    
    const page: Page = await browser.newPage();
    
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    
    await page.setViewport({
      width: 1920,
      height: 1080,
    });
    
    // 解析 URL 获取基础路径
    const url = new URL(baseUrl);
    const basePath = url.pathname;
    
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const pageUrl = `${url.origin}${basePath}?page=${pageNum}`;
      console.log(`正在爬取第 ${pageNum} 页: ${pageUrl}`);
      
      try {
        await page.goto(pageUrl, {
          waitUntil: "networkidle2",
          timeout: 30000,
        });
        
        // 等待表格
        try {
          await page.waitForSelector("table", { timeout: 10000 });
        } catch {
          console.log(`第 ${pageNum} 页没有表格，可能已到最后一页`);
          break;
        }
        
        // 检查是否有数据
        const hasData = await page.evaluate(() => {
          const tbody = document.querySelector("table tbody");
          return tbody && tbody.querySelectorAll("tr").length > 0;
        });
        
        if (!hasData) {
          console.log(`第 ${pageNum} 页没有数据，停止爬取`);
          break;
        }
        
        // 解析数据
        const products = await parseAntTable(page);
        
        if (products.length === 0) {
          console.log(`第 ${pageNum} 页解析不到数据，停止爬取`);
          break;
        }
        
        allProducts.push(...products);
        console.log(`第 ${pageNum} 页获取 ${products.length} 条，累计 ${allProducts.length} 条`);
        
        // 等待一下，避免请求过快
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`第 ${pageNum} 页爬取失败:`, error);
        break;
      }
    }
    
    await browser.close();
    
    return {
      success: true,
      data: allProducts,
    };
  } catch (error) {
    console.error("爬取失败:", error);
    
    if (browser) {
      await browser.close();
    }
    
    return {
      success: false,
      data: allProducts,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

function buildOfficialPriceSearchUrl(product: Product): string {
  const productName = encodeURIComponent(product.product_name.trim());
  const manufacturer = encodeURIComponent(product.manufacturer.trim());
  const model = encodeURIComponent(product.model.trim());
  const prefix = `chinaprice_search_${productName}`;

  if (manufacturer && model) {
    return `https://s.plasway.com/price/${prefix}/${manufacturer}/${model}.html`;
  }

  if (manufacturer) {
    return `https://s.plasway.com/price/${prefix}/${manufacturer}.html`;
  }

  return `https://s.plasway.com/price/${prefix}.html`;
}

export async function scrapePlaswayMarketPrices(product: Product): Promise<MarketScrapeResult> {
  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
    });

    const page: Page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1920, height: 1080 });

    const searchUrl = buildOfficialPriceSearchUrl(product);
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('table', { timeout: 30000 });

    const quotes = await page.evaluate(() => {
      const table = document.querySelector('table');
      if (!table) return [] as MarketQuote[];
      const headers = Array.from(table.querySelectorAll('thead tr th')).map((th) =>
        th.textContent?.trim() || ''
      );
      const priceIdx = headers.findIndex((h) => h.includes('价格'));
      const shopIdx = headers.findIndex((h) => h.includes('商家') || h.includes('店铺'));
      const nameIdx = headers.findIndex((h) => h.includes('品名'));
      const manufacturerIdx = headers.findIndex((h) => h.includes('制造商'));
      const modelIdx = headers.findIndex((h) => h.includes('型号'));
      const tbody = table.querySelector('tbody');
      if (!tbody || priceIdx === -1) return [] as MarketQuote[];

      return Array.from(tbody.querySelectorAll('tr'))
        .map((row) => {
          const cells = row.querySelectorAll('td');
          const priceText = cells[priceIdx]?.textContent?.trim() || '';
          const match = priceText.match(/[\d,.]+/);
          const current_price = match ? parseFloat(match[0].replace(/,/g, '')) : 0;
          const product_name = nameIdx !== -1 ? cells[nameIdx]?.textContent?.trim() || '' : '';
          const manufacturer = manufacturerIdx !== -1 ? cells[manufacturerIdx]?.textContent?.trim() || '' : '';
          const model = modelIdx !== -1 ? cells[modelIdx]?.textContent?.trim() || '' : '';
          const shop_name = shopIdx !== -1 ? cells[shopIdx]?.textContent?.trim() || '' : '';
          return { product_name, manufacturer, model, current_price, shop_name };
        })
        .filter((item) => item.current_price > 0);
    });

    return { success: true, data: quotes };
  } catch (error) {
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : '未知错误',
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export type { Product, MarketQuote, ScrapeResult, MarketScrapeResult };
