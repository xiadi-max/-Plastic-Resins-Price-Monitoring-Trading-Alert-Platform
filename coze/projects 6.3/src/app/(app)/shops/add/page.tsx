'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Store, Link as LinkIcon, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AddShopPage() {
  const router = useRouter();
  const [shopUrl, setShopUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  const handleScrape = async () => {
    setError('');
    if (!shopUrl.trim()) {
      setError('请输入店铺链接');
      return;
    }
    if (!shopUrl.includes('plasway.com')) {
      setError('请输入普拉司网的店铺链接');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/shops', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shop_url: shopUrl }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || '获取数据失败，请稍后重试');
        setRetryCount(prev => prev + 1);
        setIsLoading(false);
        return;
      }

      // 成功后带上新店铺 ID 跳转，避免品类页默认落到第一家店铺
      const targetShopId = result.shop_id || result.shop?.id;
      router.push(targetShopId ? `/categories?shopId=${targetShopId}` : '/categories');
    } catch {
      setError('网络错误，请检查网络连接后重试');
      setRetryCount(prev => prev + 1);
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold">添加店铺</h1>
        <p className="text-sm text-gray-500 mt-1">
          输入普拉司网店铺链接，系统将自动获取您的原料品类信息
        </p>
      </div>

      {/* 输入卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            一键添加店铺
          </CardTitle>
          <CardDescription>
            粘贴您的普拉司网店铺链接，系统自动识别商品
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 链接输入 */}
          <div className="space-y-2">
            <Label htmlFor="shopUrl" className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              店铺链接
            </Label>
            <Input
              id="shopUrl"
              type="url"
              placeholder="https://www.plasway.com/shop/您的公司名/price"
              value={shopUrl}
              onChange={(e) => {
                setShopUrl(e.target.value);
                setError('');
              }}
              disabled={isLoading}
              className="text-base"
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-500 bg-red-50 p-3 rounded">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p>{error}</p>
                {retryCount > 0 && (
                  <p className="text-xs mt-1">已尝试 {retryCount} 次，如持续失败请联系客服</p>
                )}
              </div>
            </div>
          )}

          {/* 使用说明 */}
          <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded space-y-2">
            <p className="font-medium">📝 使用说明：</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>打开普拉司网，进入您的店铺价格页面</li>
              <li>复制浏览器地址栏的完整链接</li>
              <li>粘贴到上方输入框，点击"添加店铺"</li>
            </ol>
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="font-medium">链接示例：</p>
              <code className="text-xs break-all">https://www.plasway.com/shop/dytsj888/price</code>
            </div>
          </div>

          {/* 提交按钮 */}
          <Button 
            onClick={handleScrape} 
            className="w-full h-11 text-base" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                正在获取商品数据...
              </>
            ) : (
              <>
                <Store className="h-4 w-4 mr-2" />
                添加店铺
              </>
            )}
          </Button>
          
          {isLoading && (
            <p className="text-xs text-gray-500 text-center">
              首次获取可能需要 30-60 秒，请耐心等待
            </p>
          )}
        </CardContent>
      </Card>

      {/* 功能说明 */}
      <Card className="bg-blue-50 border-blue-100">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-700">添加成功后，您可以：</p>
              <ul className="mt-2 space-y-1 text-blue-600">
                <li>• 选择需要监控的商品品类</li>
                <li>• 设置价格变动的提醒阈值</li>
                <li>• 系统每 15 分钟自动更新价格</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
