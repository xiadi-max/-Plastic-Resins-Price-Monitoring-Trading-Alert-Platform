#!/usr/bin/env python3
"""
普拉司网爬虫脚本
用于抓取店铺商品信息
支持多种爬取方式：
1. curl_cffi - 轻量级，使用 curl 的 impersonate 功能
2. playwright - 完整浏览器自动化（需要安装浏览器）
3. requests - 基础方式（可能被拦截）
"""

import sys
import json
import re
from typing import Optional, List, Dict, Any

# 尝试导入 curl_cffi
try:
    from curl_cffi import requests as curl_requests
    HAS_CURL_CFFI = True
except ImportError:
    HAS_CURL_CFFI = False
    print("Warning: curl_cffi not installed, run: pip install curl_cffi", file=sys.stderr)


def extract_price(price_str: str) -> Optional[float]:
    """从价格字符串中提取数字"""
    if not price_str:
        return None
    
    price_str = str(price_str).strip()
    
    # 尝试从对象字符串中提取数字
    if price_str.startswith('{') or 'false' in price_str or 'true' in price_str:
        numbers = re.findall(r'[-+]?\d*\.?\d+', price_str)
        if numbers:
            num = float(numbers[0])
            # 如果数字大于100000，可能是原始价格（分），转换为元
            return num / 100 if num > 100000 else num
    
    # 直接提取数字
    numbers = re.findall(r'[-+]?\d*\.?\d+', price_str)
    if numbers:
        return float(numbers[0])
    
    return None


def scrape_with_curl_cffi(url: str) -> Optional[str]:
    """使用 curl_cffi 获取页面"""
    if not HAS_CURL_CFFI:
        return None
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        response = curl_requests.get(
            url,
            headers=headers,
            impersonate='chrome',
            timeout=60
        )
        
        if response.status_code == 200:
            return response.text
        else:
            print(f"curl_cffi failed: status {response.status_code}", file=sys.stderr)
            return None
            
    except Exception as e:
        print(f"curl_cffi error: {e}", file=sys.stderr)
        return None


def scrape_page(url: str) -> Optional[str]:
    """尝试爬取页面"""
    print(f"Scraping: {url}", file=sys.stderr)
    
    html = scrape_with_curl_cffi(url)
    if html and len(html) > 1000:
        print(f"Success! HTML length: {len(html)}", file=sys.stderr)
        return html
    
    return None


def parse_html_table(html: str) -> List[Dict[str, Any]]:
    """解析 HTML 表格"""
    products = []
    
    # 匹配 Ant Design Table 的行
    rows = re.findall(r'<tr[^>]*data-row-key="(\d+)"[^>]*>(.*?)</tr>', html, re.DOTALL)
    
    for row_key, row_content in rows:
        cells = re.findall(r'<td[^>]*>(.*?)</td>', row_content, re.DOTALL)
        
        if len(cells) >= 4:
            # 提取每列的文本内容
            def extract_text(cell_html):
                # 移除 HTML 标签，保留文本
                text = re.sub(r'<[^>]+>', '', cell_html)
                return text.strip()
            
            # 提取品名（可能包含在链接或标题中）
            product_match = re.search(r'title="([^"]+)"', cells[0])
            product_name = product_match.group(1) if product_match else extract_text(cells[0])
            
            # 提取制造商
            manufacturer_match = re.search(r'title="([^"]+)"', cells[1])
            manufacturer = manufacturer_match.group(1) if manufacturer_match else extract_text(cells[1])
            
            # 提取型号
            model_match = re.search(r'title="([^"]+)"', cells[2])
            model = model_match.group(1) if model_match else extract_text(cells[2])
            
            # 提取价格（可能在多个地方）
            price_text = extract_text(cells[3])
            price = extract_price(price_text)
            
            if product_name and manufacturer and price:
                products.append({
                    'product_name': product_name,
                    'manufacturer': manufacturer,
                    'model': model if model else '',
                    'price': price,
                    'price_text': price_text
                })
    
    return products


def main():
    if len(sys.argv) < 2:
        print("Usage: python scrape_plasway.py <url>", file=sys.stderr)
        sys.exit(1)
    
    url = sys.argv[1]
    
    html = scrape_page(url)
    if not html:
        print("Failed to fetch page", file=sys.stderr)
        sys.exit(1)
    
    products = parse_html_table(html)
    
    # 输出 JSON
    result = {
        'url': url,
        'count': len(products),
        'products': products
    }
    
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
