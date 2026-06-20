"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, RefreshCw, Settings, AlertCircle, Loader2, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Product {
  id: number;
  product_name: string;
  manufacturer: string;
  model: string;
  current_price: number;
  previous_price: number;
  price_change_percent: number;
  is_monitored: boolean;
  is_deleted: boolean;
  threshold_type: 'percentage' | 'absolute';
  custom_threshold_value: number | null;
  custom_urgent_threshold: number | null;
  is_custom_threshold: boolean;
  monitoring_mode: string;
  category_level1: string;
  last_updated: string;
}

interface Shop {
  id: number;
  shop_url: string;
  company_name: string;
  product_count: number;
}

export default function CategoriesClient() {
  const searchParams = useSearchParams();
  const initialShopId = searchParams.get("shopId");
  const initialProductName = searchParams.get("productName");
  const initialManufacturer = searchParams.get("manufacturer");
  const initialModel = searchParams.get("model");
  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [currentShop, setCurrentShop] = useState<Shop | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedProductName, setSelectedProductName] = useState<string>(initialProductName || "全部");
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>(initialManufacturer || "全部");
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [thresholdForm, setThresholdForm] = useState({ priceChange: "", urgent: "" });
  const [thresholdType, setThresholdType] = useState<'percentage' | 'absolute'>('percentage');
  const [monitoringMode, setMonitoringMode] = useState<'nth_lowest' | 'nth_highest' | 'average'>('nth_lowest');
  const [monitoringRank, setMonitoringRank] = useState('2');
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchThresholdForm, setBatchThresholdForm] = useState({ priceChange: "", urgent: "" });
  const [batchThresholdType, setBatchThresholdType] = useState<'percentage' | 'absolute'>('percentage');
  const [batchMonitoringMode, setBatchMonitoringMode] = useState<'nth_lowest' | 'nth_highest' | 'average'>('nth_lowest');
  const [batchMonitoringRank, setBatchMonitoringRank] = useState('2');
  const [batchUseGlobal, setBatchUseGlobal] = useState(false);

  const fetchShops = useCallback(async () => {
    try {
      const response = await fetch('/api/shops');
      const result = await response.json();
      const shopList: Shop[] = Array.isArray(result.data) ? result.data : [];
      if (result.success && shopList.length > 0) {
        setShops(shopList);
        const matchedShop = initialShopId ? shopList.find((shop) => String(shop.id) === initialShopId) : shopList[0];
        setCurrentShop(matchedShop || shopList[0]);
      }
      return shopList;
    } catch (err) {
      console.error("获取店铺失败:", err);
      return [];
    }
  }, [initialShopId]);

  const fetchProducts = useCallback(async (shopId?: number) => {
    try {
      const targetShopId = shopId || currentShop?.id;
      if (!targetShopId) {
        setProducts([]);
        setIsLoading(false);
        return;
      }
      const response = await fetch(`/api/products?shopId=${targetShopId}`);
      const result = await response.json();
      if (result.success) setProducts(result.data);
    } catch (err) {
      console.error("获取商品失败:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentShop?.id]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const shopsData = await fetchShops();
      const targetShop = shopsData.find((shop) => String(shop.id) === initialShopId) || shopsData[0];
      if (targetShop) {
        setCurrentShop(targetShop);
        await fetchProducts(targetShop.id);
      } else {
        setIsLoading(false);
      }
    };
    init();
  }, [fetchShops, fetchProducts, initialShopId]);

  const handleRefresh = async () => {
    if (!currentShop) return;
    setIsRefreshing(true);
    setError('');
    try {
      const response = await fetch('/api/shops/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId: currentShop.id }),
      });
      const result = await response.json();
      if (result.success) await fetchProducts(currentShop.id); else setError(result.error || '刷新失败');
    } catch {
      setError('刷新失败，请重试');
    } finally {
      setIsRefreshing(false);
    }
  };

  const productNameOptions = useMemo(() => ["全部", ...Array.from(new Set(products.map((p) => p.product_name)))], [products]);
  const manufacturerOptions = useMemo(() => {
    const source = selectedProductName === "全部" ? products : products.filter((p) => p.product_name === selectedProductName);
    return ["全部", ...Array.from(new Set(source.map((p) => p.manufacturer)))];
  }, [products, selectedProductName]);

  const filteredProducts = useMemo(() => products.filter((p) => {
    const matchProductName = selectedProductName === "全部" || p.product_name === selectedProductName;
    const matchManufacturer = selectedManufacturer === "全部" || p.manufacturer === selectedManufacturer;
    const matchModel = !initialModel || p.model === initialModel;
    return matchProductName && matchManufacturer && matchModel;
  }), [products, selectedProductName, selectedManufacturer, initialModel]);

  const groupedByProductName = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach((p) => { (groups[p.product_name] ||= []).push(p); });
    return groups;
  }, [filteredProducts]);

  const stats = useMemo(() => ({
    total: filteredProducts.length,
    monitored: filteredProducts.filter((p) => p.is_monitored).length,
    positive: filteredProducts.filter((p) => p.price_change_percent > 0).length,
    negative: filteredProducts.filter((p) => p.price_change_percent < 0).length,
  }), [filteredProducts]);

  const handleProductNameChange = (name: string) => { setSelectedProductName(name); setSelectedManufacturer("全部"); };
  const toggleExpand = (productName: string) => setExpandedProducts((prev) => { const next = new Set(prev); next.has(productName) ? next.delete(productName) : next.add(productName); return next; });
  const toggleSelect = (productId: number) => setSelectedProductIds((prev) => { const next = new Set(prev); next.has(productId) ? next.delete(productId) : next.add(productId); return next; });
  const selectAllCurrent = () => setSelectedProductIds(selectedProductIds.size === filteredProducts.length ? new Set() : new Set(filteredProducts.map((p) => p.id)));

  const updateProductMonitor = async (productId: number, isMonitored: boolean) => { await fetch('/api/products', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [productId], updates: { is_monitored: isMonitored } }), }); };
  const formatPrice = (price: number) => `¥${price.toLocaleString()}`;
  const formatTime = (dateStr: string) => !dateStr ? '--' : new Date(dateStr).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  if (!isLoading && shops.length === 0) {
    return <div className="space-y-6"><div><h1 className="text-2xl font-bold">品类管理</h1><p className="text-sm text-gray-500 mt-1">管理和监控您的原料品类</p></div><Alert className="border-orange-200 bg-orange-50"><AlertCircle className="h-4 w-4" /><AlertTitle>暂无店铺</AlertTitle><AlertDescription>请先添加店铺后才能管理品类。 <a href="/shops/add" className="font-medium text-orange-600 hover:underline">添加店铺 →</a></AlertDescription></Alert></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">品类管理</h1><p className="text-sm text-gray-500 mt-1">当前店铺：{currentShop?.company_name || '--'}</p></div>
        <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing || !currentShop}>{isRefreshing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />刷新中...</> : <><RefreshCw className="h-4 w-4 mr-2" />刷新</>}</Button>
      </div>

      {error && <Alert className="border-red-200 bg-red-50"><AlertCircle className="h-4 w-4" /><AlertTitle>操作失败</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

      {isLoading && <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /><span className="ml-2 text-gray-500">加载中...</span></div>}

      {!isLoading && products.length > 0 && <div className="bg-white rounded-lg border p-4 space-y-3"><div><span className="text-sm font-medium text-gray-500 inline-block mb-2">品名</span><div className="flex flex-wrap gap-2">{productNameOptions.map((name) => <button key={name} onClick={() => handleProductNameChange(name)} className={`px-3 py-1.5 text-sm rounded-full transition-colors ${selectedProductName === name ? "bg-blue-500 text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"}`}>{name}</button>)}</div></div><div><span className="text-sm font-medium text-gray-500 inline-block mb-2">制造商</span><div className="flex flex-wrap gap-2">{manufacturerOptions.map((man) => <button key={man} onClick={() => setSelectedManufacturer(man)} className={`px-3 py-1.5 text-sm rounded-full transition-colors ${selectedManufacturer === man ? "bg-blue-500 text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"}`}>{man}</button>)}</div></div></div>}

      {!isLoading && filteredProducts.length > 0 && <div className="grid grid-cols-4 gap-4"><Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-blue-600">{stats.total}</div><div className="text-sm text-gray-500">商品总数</div></CardContent></Card><Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-green-600">{stats.monitored}</div><div className="text-sm text-gray-500">已监控</div></CardContent></Card><Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-red-500">{stats.positive}</div><div className="text-sm text-gray-500">上涨</div></CardContent></Card><Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-blue-500">{stats.negative}</div><div className="text-sm text-gray-500">下跌</div></CardContent></Card></div>}

      {!isLoading && filteredProducts.length > 0 && <div className="bg-white rounded-lg border p-4 flex items-center justify-between"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={selectedProductIds.size === filteredProducts.length && filteredProducts.length > 0} onChange={selectAllCurrent} className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500" /><span className="text-sm text-gray-700">全选当前筛选结果 ({filteredProducts.length} 个商品)</span></label></div>}

      {!isLoading && products.length === 0 && <div className="text-center py-12 text-gray-500"><ShoppingBag className="h-12 w-12 mx-auto mb-4 text-gray-300" /><p>当前店铺暂无商品数据</p><p className="text-sm mt-1">请点击右上角“刷新”，或检查店铺链接是否能正常抓取商品</p></div>}
      {!isLoading && products.length > 0 && filteredProducts.length === 0 && <div className="text-center py-12 text-gray-500"><ShoppingBag className="h-12 w-12 mx-auto mb-4 text-gray-300" /><p>没有找到匹配的商品</p><p className="text-sm mt-1">尝试调整筛选条件</p></div>}

      {!isLoading && Object.keys(groupedByProductName).length > 0 && <div className="space-y-3">{Object.entries(groupedByProductName).map(([productName, items]) => <Card key={productName}><CardHeader className="py-3 px-4"><div className="flex items-center justify-between"><button onClick={() => toggleExpand(productName)} className="flex items-center gap-2 hover:bg-gray-100 -ml-2 px-2 py-1 rounded transition-colors">{expandedProducts.has(productName) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}<span className="font-medium">{productName}</span><Badge variant="secondary" className="text-xs">{items.length} 个商品</Badge></button></div></CardHeader>{expandedProducts.has(productName) && <CardContent className="pt-0 pb-4"><div className="space-y-2">{items.map((product) => <div key={product.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"><div className="flex items-center gap-3"><input type="checkbox" checked={selectedProductIds.has(product.id)} onChange={() => toggleSelect(product.id)} className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500" /><div><div className="font-medium text-sm">{product.manufacturer}</div><div className="text-xs text-gray-400">{product.model || '默认型号'}</div><div className="text-xs text-gray-500 mt-1">监控模式：{product.monitoring_mode === 'average' ? '平均价' : product.monitoring_mode.startsWith('nth_highest') ? `第 ${product.monitoring_mode.split(':')[1] || '2'} 高价` : `第 ${product.monitoring_mode.split(':')[1] || '2'} 低价`}</div></div></div><div className="flex items-center gap-4"><div className="text-right"><div className="font-medium">{formatPrice(product.current_price)}</div><div className={`text-xs ${product.price_change_percent > 0 ? "text-red-500" : product.price_change_percent < 0 ? "text-green-500" : "text-gray-500"}`}>{product.price_change_percent > 0 ? "+" : ""}{product.price_change_percent.toFixed(1)}%</div></div><Badge variant="outline" className="text-xs">{formatTime(product.last_updated)}</Badge><Button size="sm" variant="ghost"><Settings className="h-4 w-4" /></Button><Switch checked={product.is_monitored} onCheckedChange={(checked) => updateProductMonitor(product.id, checked)} /></div></div>)}</div></CardContent>}</Card>)}</div>}
    </div>
  );
}
