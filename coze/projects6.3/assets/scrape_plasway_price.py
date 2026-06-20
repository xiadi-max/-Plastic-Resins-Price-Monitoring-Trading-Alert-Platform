"""
使用 Scrapling 抓取普拉司店铺报价页的塑胶原料表格。
仅导出：品名、制造商、型号、价格。
页面为 Ant Design Table，首屏约 704 条（与站点分页策略一致）。

依赖: pip install scrapling
"""

from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

URL = "https://www.plasway.com/shop/dytsj888/price"

# 仅输出这四列
OUTPUT_KEYS = ("品名", "制造商", "型号", "价格")


def _cell_text(sel) -> str:
    raw = sel.get_all_text()
    if raw is None:
        return (getattr(sel, "text", "") or "").strip()
    return str(raw).strip()


def parse_ant_table(response) -> list[dict[str, str]]:
    """解析 Ant Design table（thead th + tbody tr）。"""
    tables = list(response.css("table"))
    if not tables:
        return []

    table = tables[0]
    header_labels: list[str] = []
    for th in table.css("thead tr th"):
        spans = list(th.css(".ant-table-column-title"))
        if spans:
            header_labels.append(spans[0].text.strip())
        else:
            header_labels.append(_cell_text(th))

    rows_out: list[dict[str, str]] = []
    for tr in table.css("tbody tr"):
        tds = list(tr.css("td"))
        if not tds:
            continue
        texts = [_cell_text(td) for td in tds]
        if len(texts) != len(header_labels):
            continue
        row = dict(zip(header_labels, texts))
        rows_out.append({k: row.get(k, "") for k in OUTPUT_KEYS})

    return rows_out


def fetch_page():
    """普通 HTTP；失败时再尝试 Stealthy（浏览器）。"""
    from scrapling.fetchers import Fetcher

    try:
        return Fetcher.get(URL)
    except Exception as first:
        try:
            from scrapling.fetchers import StealthyFetcher

            StealthyFetcher.adaptive = True
            return StealthyFetcher.fetch(URL, headless=True, network_idle=True)
        except Exception:
            raise first


def main() -> int:
    page = fetch_page()
    rows = parse_ant_table(page)

    if not rows:
        print("未解析到表格数据。", file=sys.stderr)
        return 1

    out_dir = Path(__file__).resolve().parent
    json_path = out_dir / "plasway_dytsj888_price.json"
    csv_path = out_dir / "plasway_dytsj888_price.csv"

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)

    fieldnames = list(OUTPUT_KEYS)
    with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)

    print(f"共 {len(rows)} 条记录")
    print(f"JSON: {json_path}")
    print(f"CSV:  {csv_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
