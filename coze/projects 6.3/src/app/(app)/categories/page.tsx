"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, RefreshCw, Settings, Check, X, AlertCircle, Loader2, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// 商品类型（与数据库对应）
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

// 店铺类型
interface Shop {
  id: number;
  shop_url: string;
  company_name: string;
  product_count: number;
}

export default function CategoriesPage() {
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

  // 筛选状态
  const [selectedProductName, setSelectedProductName] = useState<string>(initialProductName || "全部");
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>(initialManufacturer || "全部");

  // 设置弹窗状态
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [thresholdForm, setThresholdForm] = useState({ priceChange: "", urgent: "" });
  const [thresholdType, setThresholdType] = useState<'percentage' | 'absolute'>('percentage');
  const [monitoringMode, setMonitoringMode] = useState<'nth_lowest' | 'nth_highest' | 'average'>('nth_lowest');
  const [monitoringRank, setMonitoringRank] = useState('2');

  // 批量设置弹窗状态
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchThresholdForm, setBatchThresholdForm] = useState({ priceChange: "", urgent: "" });
  const [batchThresholdType, setBatchThresholdType] = useState<'percentage' | 'absolute'>('percentage');
  const [batchMonitoringMode, setBatchMonitoringMode] = useState<'nth_lowest' | 'nth_highest' | 'average'>('nth_lowest');
  const [batchMonitoringRank, setBatchMonitoringRank] = useState('2');
  const [batchUseGlobal, setBatchUseGlobal] = useState(false);

  // 获取店铺列表
  const fetchShops = useCallback(async () => {
    try {
      const response = await fetch('/api/shops');
      const result = await response.json();
      const shopList: Shop[] = Array.isArray(result.data) ? result.data : [];
      if (result.success && shopList.length > 0) {
        setShops(shopList);
        const matchedShop = initialShopId
          ? shopList.find((shop) => String(shop.id) === initialShopId)
          : shopList[0];
        setCurrentShop(matchedShop || shopList[0]);
      }
      return shopList;
    } catch (err) {
      console.error("获取店铺失败:", err);
      return [];
    }
  }, [initialShopId]);

  // 获取商品列表
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
      if (result.success) {
        setProducts(result.data);
      }
    } catch (err) {
      console.error("获取商品失败:", err);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 初始化加载
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const shopsData = await fetchShops();
      const targetShop =
        shopsData.find((shop) => String(shop.id) === initialShopId) ||
        shopsData[0];

      if (targetShop) {
        setCurrentShop(targetShop);
        await fetchProducts(targetShop.id);
      } else {
        setIsLoading(false);
      }
    };
    init();
  }, [fetchShops, fetchProducts, initialShopId]);

  // 手动刷新商品
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
      
      if (result.success) {
        await fetchProducts(currentShop.id);
      } else {
        setError(result.error || '刷新失败');
      }
    } catch (err) {
      setError('刷新失败，请重试');
    } finally {
      setIsRefreshing(false);
    }
  };

  // 获取所有品名选项
  const productNameOptions = useMemo(() => {
    const names = new Set(products.map((p) => p.product_name));
    return ["全部", ...Array.from(names)];
  }, [products]);

  // 获取当前选中品名下的所有制造商选项
  const manufacturerOptions = useMemo(() => {
    if (selectedProductName === "全部") {
      const mans = new Set(products.map((p) => p.manufacturer));
      return ["全部", ...Array.from(mans)];
    } else {
      const filtered = products.filter((p) => p.product_name === selectedProductName);
      const mans = new Set(filtered.map((p) => p.manufacturer));
      return ["全部", ...Array.from(mans)];
    }
  }, [products, selectedProductName]);

  // 根据筛选条件过滤商品
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchProductName = selectedProductName === "全部" || p.product_name === selectedProductName;
      const matchManufacturer = selectedManufacturer === "全部" || p.manufacturer === selectedManufacturer;
      const matchModel = !initialModel || p.model === initialModel;
      return matchProductName && matchManufacturer && matchModel;
    });
  }, [products, selectedProductName, selectedManufacturer, initialModel]);

  // 按品名分组
  const groupedByProductName = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach((p) => {
      if (!groups[p.product_name]) {
        groups[p.product_name] = [];
      }
      groups[p.product_name].push(p);
    });
    return groups;
  }, [filteredProducts]);

  // 统计信息
  const stats = useMemo(() => {
    const total = filteredProducts.length;
    const monitored = filteredProducts.filter((p) => p.is_monitored).length;
    const positive = filteredProducts.filter((p) => p.price_change_percent > 0).length;
    const negative = filteredProducts.filter((p) => p.price_change_percent < 0).length;
    return { total, monitored, positive, negative };
  }, [filteredProducts]);

  // 切换品名筛选
  const handleProductNameChange = (name: string) => {
    setSelectedProductName(name);
    setSelectedManufacturer("全部");
  };

  // 切换商品展开状态
  const toggleExpand = (productName: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productName)) {
      newExpanded.delete(productName);
    } else {
      newExpanded.add(productName);
    }
    setExpandedProducts(newExpanded);
  };

  // 切换商品选中状态
  const toggleSelect = (productId: number) => {
    const newSelected = new Set(selectedProductIds);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProductIds(newSelected);
  };

  // 全选当前筛选结果
  const selectAllCurrent = () => {
    const allIds = filteredProducts.map((p) => p.id);
    if (selectedProductIds.size === allIds.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(allIds));
    }
  };

  // 更新商品监控状态
  const updateProductMonitor = async (productId: number, isMonitored: boolean) => {
    try {
      const response = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: [productId],
          updates: { is_monitored: isMonitored },
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productId ? { ...p, is_monitored: isMonitored } : p
          )
        );
      }
    } catch (err) {
      console.error("更新监控状态失败:", err);
    }
  };

  // 批量使用全局设置
  const handleBatchUseGlobal = async () => {
    if (selectedProductIds.size === 0) return;
    
    try {
      const response = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedProductIds),
          updates: { 
            is_custom_threshold: false,
            threshold_type: thresholdType,
            monitoring_mode: monitoringMode === 'average' ? 'average' : `${monitoringMode}:${monitoringRank}`,
          },
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        setProducts((prev) =>
          prev.map((p) =>
            selectedProductIds.has(p.id)
              ? { ...p, is_custom_threshold: false, custom_threshold_value: null, custom_urgent_threshold: null }
              : p
          )
        );
        setSelectedProductIds(new Set());
      }
    } catch (err) {
      console.error("批量设置失败:", err);
    }
    setShowBatchModal(false);
  };

  // 批量设置阈值
  const handleBatchSetThreshold = async () => {
    if (selectedProductIds.size === 0) return;
    
    const priceChange = batchUseGlobal ? null : parseFloat(batchThresholdForm.priceChange) || null;
    const urgent = batchUseGlobal ? null : parseFloat(batchThresholdForm.urgent) || null;

    try {
      const response = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedProductIds),
          updates: {
            is_custom_threshold: !batchUseGlobal,
            threshold_type: batchUseGlobal ? thresholdType : batchThresholdType,
            custom_threshold_value: priceChange,
            custom_urgent_threshold: urgent,
          },
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        setProducts((prev) =>
          prev.map((p) =>
            selectedProductIds.has(p.id)
              ? {
                  ...p,
                  is_custom_threshold: !batchUseGlobal,
                  custom_threshold_value: priceChange,
                  custom_urgent_threshold: urgent,
                }
              : p
          )
        );
        setSelectedProductIds(new Set());
      }
    } catch (err) {
      console.error("批量设置失败:", err);
    }
    setShowBatchModal(false);
    setBatchThresholdForm({ priceChange: "", urgent: "" });
    setBatchThresholdType('percentage');
    setBatchUseGlobal(false);
  };

  // 打开阈值设置弹窗
  const openThresholdModal = (product: Product) => {
    setEditingProductId(product.id);
    setThresholdForm({
      priceChange: product.custom_threshold_value?.toString() || '',
      urgent: product.custom_urgent_threshold?.toString() || '',
    });
    setThresholdType(product.threshold_type || 'percentage');
    const mode = product.monitoring_mode || 'nth_lowest';
    if (mode.startsWith('nth_')) {
      const [modeType, rank] = mode.split(':');
      setMonitoringMode((modeType as 'nth_lowest' | 'nth_highest') || 'nth_lowest');
      setMonitoringRank(rank || '2');
    } else if (mode === 'average') {
      setMonitoringMode('average');
      setMonitoringRank('2');
    } else {
      setMonitoringMode('nth_lowest');
      setMonitoringRank('2');
    }
    setShowThresholdModal(true);
  };

  // 保存单个商品阈值
  const saveThreshold = async () => {
    if (!editingProductId) return;
    
    const priceChange = parseFloat(thresholdForm.priceChange) || null;
    const urgent = parseFloat(thresholdForm.urgent) || null;

    try {
      const response = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: [editingProductId],
          updates: {
            is_custom_threshold: true,
            threshold_type: thresholdType,
            custom_threshold_value: priceChange,
            custom_urgent_threshold: urgent,
            monitoring_mode: monitoringMode === 'average'
              ? 'average'
              : `${monitoringMode}:${monitoringRank}`,
          },
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingProductId
              ? {
                  ...p,
                  is_custom_threshold: true,
                  threshold_type: thresholdType,
                  custom_threshold_value: priceChange,
                  custom_urgent_threshold: urgent,
                  monitoring_mode: monitoringMode === 'average'
                    ? 'average'
                    : `${monitoringMode}:${monitoringRank}`,
                }
              : p
          )
        );
      }
    } catch (err) {
      console.error("保存阈值失败:", err);
    }
    
    setShowThresholdModal(false);
    setEditingProductId(null);
    setThresholdForm({ priceChange: "", urgent: "" });
  };

  // 格式化价格
  const formatPrice = (price: number) => {
    return `¥${price.toLocaleString()}`;
  };

  // 格式化时间
  const formatTime = (dateStr: string) => {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  // 无店铺状态
  if (!isLoading && shops.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">品类管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理和监控您的原料品类</p>
        </div>
        
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>暂无店铺</AlertTitle>
          <AlertDescription>
            请先添加店铺后才能管理品类。{" "}
            <a href="/shops/add" className="font-medium text-orange-600 hover:underline">
              添加店铺 →
            </a>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">品类管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            当前店铺：{currentShop?.company_name || '--'}
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh} 
          disabled={isRefreshing || !currentShop}
        >
          {isRefreshing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              刷新中...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新
            </>
          )}
        </Button>
      </div>

      {/* 错误提示 */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>操作失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-500">加载中...</span>
        </div>
      )}

      {/* 筛选条件 */}
      {!isLoading && products.length > 0 && (
        <div className="bg-white rounded-lg border p-4 space-y-3">
          {/* 品名筛选 */}
          <div>
            <span className="text-sm font-medium text-gray-500 inline-block mb-2">品名</span>
            <div className="flex flex-wrap gap-2">
              {productNameOptions.map((name) => (
                <button
                  key={name}
                  onClick={() => handleProductNameChange(name)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    selectedProductName === name
                      ? "bg-blue-500 text-white"
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* 制造商筛选 */}
          <div>
            <span className="text-sm font-medium text-gray-500 inline-block mb-2">制造商</span>
            <div className="flex flex-wrap gap-2">
              {manufacturerOptions.map((man) => (
                <button
                  key={man}
                  onClick={() => setSelectedManufacturer(man)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    selectedManufacturer === man
                      ? "bg-blue-500 text-white"
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {man}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 统计信息 */}
      {!isLoading && filteredProducts.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-500">商品总数</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.monitored}</div>
              <div className="text-sm text-gray-500">已监控</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-500">{stats.positive}</div>
              <div className="text-sm text-gray-500">上涨</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-500">{stats.negative}</div>
              <div className="text-sm text-gray-500">下跌</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 全选和批量操作栏 */}
      {!isLoading && filteredProducts.length > 0 && (
        <div className="bg-white rounded-lg border p-4 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedProductIds.size === filteredProducts.length && filteredProducts.length > 0}
              onChange={selectAllCurrent}
              className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              全选当前筛选结果 ({filteredProducts.length} 个商品)
            </span>
          </label>
          
          {selectedProductIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-blue-600 font-medium">
                已选择 {selectedProductIds.size} 个
              </span>
              <Button size="sm" variant="outline" onClick={() => setShowBatchModal(true)}>
                批量设置阈值
              </Button>
              <Button size="sm" variant="outline" onClick={handleBatchUseGlobal}>
                使用全局设置
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedProductIds(new Set())}>
                取消
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 商品列表 */}
      {!isLoading && products.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>当前店铺暂无商品数据</p>
          <p className="text-sm mt-1">请点击右上角“刷新”，或检查店铺链接是否能正常抓取商品</p>
        </div>
      )}

      {!isLoading && products.length > 0 && filteredProducts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>没有找到匹配的商品</p>
          <p className="text-sm mt-1">尝试调整筛选条件</p>
        </div>
      )}

      {!isLoading && Object.keys(groupedByProductName).length > 0 && (
        <div className="space-y-3">
          {Object.entries(groupedByProductName).map(([productName, items]) => (
            <Card key={productName}>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleExpand(productName)}
                    className="flex items-center gap-2 hover:bg-gray-100 -ml-2 px-2 py-1 rounded transition-colors"
                  >
                    {expandedProducts.has(productName) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-medium">{productName}</span>
                    <Badge variant="secondary" className="text-xs">
                      {items.length} 个商品
                    </Badge>
                  </button>
                </div>
              </CardHeader>
              
              {expandedProducts.has(productName) && (
                <CardContent className="pt-0 pb-4">
                  <div className="space-y-2">
                    {items.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedProductIds.has(product.id)}
                            onChange={() => toggleSelect(product.id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                          />
                          <div>
                            <div className="font-medium text-sm">
                              {product.manufacturer}
                            </div>
                            <div className="text-xs text-gray-400">
                              {product.model || '默认型号'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              监控模式：
                              {product.monitoring_mode === 'average'
                                ? '平均价'
                                : product.monitoring_mode.startsWith('nth_highest')
                                  ? `第 ${product.monitoring_mode.split(':')[1] || '2'} 高价`
                                  : `第 ${product.monitoring_mode.split(':')[1] || '2'} 低价`}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-medium">
                              {formatPrice(product.current_price)}
                            </div>
                            <div
                              className={`text-xs ${
                                product.price_change_percent > 0
                                  ? "text-red-500"
                                  : product.price_change_percent < 0
                                  ? "text-green-500"
                                  : "text-gray-500"
                              }`}
                            >
                              {product.price_change_percent > 0 ? "+" : ""}
                              {product.price_change_percent.toFixed(1)}%
                            </div>
                          </div>
                          
                          {product.is_custom_threshold && (
                            <Badge variant="outline" className="text-xs">
                              自定义阈值
                            </Badge>
                          )}
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openThresholdModal(product)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          
                          <Switch
                            checked={product.is_monitored}
                            onCheckedChange={(checked) =>
                              updateProductMonitor(product.id, checked)
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* 单个阈值设置弹窗 */}
      {showThresholdModal && editingProductId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-lg">设置阈值</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  监控模式
                </label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={monitoringMode}
                  onChange={(e) => setMonitoringMode(e.target.value as 'nth_lowest' | 'nth_highest' | 'average')}
                >
                  <option value="nth_lowest">第 N 低价</option>
                  <option value="average">平均价</option>
                  <option value="nth_highest">第 N 高价</option>
                </select>
              </div>
              
              {(monitoringMode === 'nth_lowest' || monitoringMode === 'nth_highest') && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    N 值
                  </label>
                  <Input
                    type="number"
                    min="2"
                    placeholder="例如：2、3、4"
                    value={monitoringRank}
                    onChange={(e) => setMonitoringRank(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    例如第 2 低价、第 3 低价、第 4 高价
                  </p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  阈值类型
                </label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <button
                    type="button"
                    className={`rounded-md border px-3 py-2 ${thresholdType === 'percentage' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                    onClick={() => setThresholdType('percentage')}
                  >
                    百分比
                  </button>
                  <button
                    type="button"
                    className={`rounded-md border px-3 py-2 ${thresholdType === 'absolute' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                    onClick={() => setThresholdType('absolute')}
                  >
                    绝对值
                  </button>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  价格变动阈值{thresholdType === 'percentage' ? '（%）' : '（元/吨）'}
                </label>
                <Input
                  type="number"
                  placeholder={thresholdType === 'percentage' ? '例如：3' : '例如：300'}
                  value={thresholdForm.priceChange}
                  onChange={(e) =>
                    setThresholdForm((prev) => ({
                      ...prev,
                      priceChange: e.target.value,
                    }))
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  {thresholdType === 'percentage' ? '超过此百分比发送一般提醒（蓝色标识）' : '超过此金额发送一般提醒（蓝色标识）'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  紧急提醒阈值{thresholdType === 'percentage' ? '（%）' : '（元/吨）'}
                </label>
                <Input
                  type="number"
                  placeholder={thresholdType === 'percentage' ? '例如：5' : '例如：500'}
                  value={thresholdForm.urgent}
                  onChange={(e) =>
                    setThresholdForm((prev) => ({
                      ...prev,
                      urgent: e.target.value,
                    }))
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  {thresholdType === 'percentage' ? '超过此百分比发送紧急提醒（红色标识 + 音效）' : '超过此金额发送紧急提醒（红色标识 + 音效）'}
                </p>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowThresholdModal(false);
                    setEditingProductId(null);
                    setThresholdForm({ priceChange: "", urgent: "" });
                  }}
                >
                  取消
                </Button>
                <Button onClick={saveThreshold}>保存</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 批量阈值设置弹窗 */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-lg">批量设置阈值</CardTitle>
              <p className="text-sm text-gray-500">
                将为选中的 {selectedProductIds.size} 个商品设置阈值
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={batchUseGlobal}
                    onChange={(e) => setBatchUseGlobal(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm">使用全局设置</span>
                </label>
              </div>
              
              {!batchUseGlobal && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      阈值类型
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <button
                        type="button"
                        className={`rounded-md border px-3 py-2 ${batchThresholdType === 'percentage' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                        onClick={() => setBatchThresholdType('percentage')}
                      >
                        百分比
                      </button>
                      <button
                        type="button"
                        className={`rounded-md border px-3 py-2 ${batchThresholdType === 'absolute' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                        onClick={() => setBatchThresholdType('absolute')}
                      >
                        绝对值
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      监控模式
                    </label>
                    <select
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={batchMonitoringMode}
                      onChange={(e) => setBatchMonitoringMode(e.target.value as 'nth_lowest' | 'nth_highest' | 'average')}
                    >
                      <option value="nth_lowest">第 N 低价</option>
                      <option value="average">平均价</option>
                      <option value="nth_highest">第 N 高价</option>
                    </select>
                  </div>
                  
                  {(batchMonitoringMode === 'nth_lowest' || batchMonitoringMode === 'nth_highest') && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">
                        N 值
                      </label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="例如：2、3、4"
                        value={batchMonitoringRank}
                        onChange={(e) => setBatchMonitoringRank(e.target.value)}
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      价格变动阈值{batchThresholdType === 'percentage' ? '（%）' : '（元/吨）'}
                    </label>
                    <Input
                      type="number"
                      placeholder={batchThresholdType === 'percentage' ? '例如：3' : '例如：300'}
                      value={batchThresholdForm.priceChange}
                      onChange={(e) =>
                        setBatchThresholdForm((prev) => ({
                          ...prev,
                          priceChange: e.target.value,
                        }))
                      }
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      紧急提醒阈值{batchThresholdType === 'percentage' ? '（%）' : '（元/吨）'}
                    </label>
                    <Input
                      type="number"
                      placeholder={batchThresholdType === 'percentage' ? '例如：5' : '例如：500'}
                      value={batchThresholdForm.urgent}
                      onChange={(e) =>
                        setBatchThresholdForm((prev) => ({
                          ...prev,
                          urgent: e.target.value,
                        }))
                      }
                    />
                  </div>
                </>
              )}
              
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBatchModal(false);
                    setBatchThresholdForm({ priceChange: "", urgent: "" });
                    setBatchThresholdType('percentage');
                    setBatchUseGlobal(false);
                  }}
                >
                  取消
                </Button>
                <Button onClick={batchUseGlobal ? handleBatchUseGlobal : handleBatchSetThreshold}>
                  确认
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
