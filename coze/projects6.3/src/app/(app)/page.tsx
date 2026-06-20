'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return (value[0] as T) || null;
  }
  return value || null;
}

function buildPlaswayProductUrl(categoryName: string, manufacturer: string, model: string) {
  const slug = `chinaprice_search_${categoryName.trim()}/${manufacturer.trim()}/${model.trim()}`;
  return `https://s.plasway.com/price/${encodeURIComponent(slug)}.html`;
}

interface AlertItem {
  id: string;
  shopId: string;
  categoryName: string;
  manufacturer: string;
  model: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  shopUrl: string;
  createdAt: string;
  isRead: boolean;
  alertType: 'general' | 'urgent';
  title: string;
  message: string;
}

export default function AlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAlerts = async () => {
    try {
      const response = await fetch('/api/alert-history');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      const formattedAlerts: AlertItem[] = (result.data || []).map((item: Record<string, unknown>) => {
        const product = normalizeRelation(item.product_categories as Record<string, unknown> | Record<string, unknown>[] | null);
        const shop = normalizeRelation(item.user_shops as Record<string, unknown> | Record<string, unknown>[] | null);

        return {
          id: String(item.id),
          shopId: String(item.shop_id || ''),
          categoryName: (product?.product_name as string) || (item.title as string) || '未知',
          manufacturer: (product?.manufacturer as string) || '',
          model: (product?.model as string) || '',
          oldPrice: Number(item.old_price ?? 0),
          newPrice: Number(item.new_price ?? 0),
          changePercent: Number(item.change_percent ?? 0),
          shopUrl: (shop?.shop_url as string) || '#',
          createdAt: new Date(item.created_at as string).toLocaleString('zh-CN'),
          isRead: Boolean(item.is_read),
          alertType: item.alert_type === 'urgent' ? 'urgent' : 'general',
          title: (item.title as string) || '价格变动提醒',
          message: (item.message as string) || '',
        };
      });

      setAlerts(formattedAlerts);
    } catch (error) {
      console.error('加载提醒历史失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAlerts();
  }, []);

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  const handleRefresh = async () => {
    setIsLoading(true);
    await loadAlerts();
  };

  const handleOpenShop = (alert: AlertItem) => {
    const url = buildPlaswayProductUrl(alert.categoryName, alert.manufacturer, alert.model);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch('/api/alert-history', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_read: true }),
      });

      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isRead: true } : a))
      );
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">价格提醒</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0 ? `有 ${unreadCount} 条未读提醒` : '暂无未读提醒'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {alerts.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center text-gray-500">
            <p className="text-lg mb-2">暂无提醒</p>
            <p className="text-sm">添加店铺并开启监控后，将在这里收到价格变动提醒</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {alerts.map((alert) => (
          <Card
            key={alert.id}
            className={`transition-all hover:shadow-md cursor-pointer ${
              !alert.isRead
                ? alert.alertType === 'urgent'
                  ? 'border-l-4 border-l-red-500'
                  : 'border-l-4 border-l-primary'
                : ''
            }`}
            onClick={() => handleOpenShop(alert)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="text-xl font-bold tracking-tight">{alert.categoryName}</h3>
                    {!alert.isRead && (
                      <Badge variant="default" className="h-5 px-2 text-xs">
                        新
                      </Badge>
                    )}
                    <Badge variant={alert.alertType === 'urgent' ? 'destructive' : 'secondary'}>
                      {alert.alertType === 'urgent' ? '紧急' : '一般'}
                    </Badge>
                    <Badge
                      variant={alert.changePercent < 0 ? 'destructive' : 'default'}
                      className={alert.changePercent >= 0 ? 'bg-green-500' : ''}
                    >
                      {alert.changePercent >= 0 ? '+' : ''}
                      {alert.changePercent.toFixed(2)}%
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-2">
                    {alert.manufacturer && (
                      <span className="rounded bg-gray-100 px-2 py-1">
                        制造商：{alert.manufacturer}
                      </span>
                    )}
                    {alert.model && (
                      <span className="rounded bg-gray-100 px-2 py-1 font-semibold text-base text-gray-700">
                        型号：{alert.model}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-2">{alert.message || alert.title}</p>

                  <div className="flex items-baseline gap-2 text-sm text-gray-600">
                    <span className="line-through text-gray-400">
                      ¥{alert.oldPrice.toLocaleString()}
                    </span>
                    <span className="text-lg font-semibold text-primary">
                      ¥{alert.newPrice.toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-gray-400 mt-2">{alert.createdAt}</p>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenShop(alert);
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  {!alert.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleMarkAsRead(alert.id);
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
