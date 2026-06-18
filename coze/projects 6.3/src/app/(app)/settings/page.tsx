'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Bell, Volume2, Moon, Save, TrendingUp, TrendingDown, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [isAlertEnabled, setIsAlertEnabled] = useState(true);
  const [alertSound, setAlertSound] = useState('wechat');
  const [isDesktopNotification, setIsDesktopNotification] = useState(true);
  const [thresholdType, setThresholdType] = useState<'percentage' | 'absolute'>('percentage');
  const [monitoringMode, setMonitoringMode] = useState<'nth_lowest' | 'nth_highest' | 'average'>('nth_lowest');
  const [monitoringRank, setMonitoringRank] = useState('2');
  const [priceThreshold, setPriceThreshold] = useState('3');
  const [urgentThreshold, setUrgentThreshold] = useState('5');
  const [isQuietHoursEnabled, setIsQuietHoursEnabled] = useState(true);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00');
  const [refreshIntervalMinutes, setRefreshIntervalMinutes] = useState('15');
  const [lastScheduledRefreshAt, setLastScheduledRefreshAt] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || '加载设置失败');
        }

        const data = result.data;
        setIsAlertEnabled(data.is_alert_enabled);
        setAlertSound(data.alert_sound);
        setIsDesktopNotification(data.is_desktop_notification);
        setThresholdType(data.threshold_type === 'absolute' ? 'absolute' : 'percentage');
        setMonitoringMode(
          data.monitoring_mode === 'nth_highest' || data.monitoring_mode === 'average'
            ? data.monitoring_mode
            : 'nth_lowest'
        );
        setMonitoringRank(String(data.monitoring_rank ?? 2));
        setPriceThreshold(String(data.threshold_value));
        setUrgentThreshold(String(data.urgent_threshold_value));
        setIsQuietHoursEnabled(data.is_quiet_hours_enabled);
        setQuietHoursStart(data.quiet_hours_start);
        setQuietHoursEnd(data.quiet_hours_end);
        setRefreshIntervalMinutes(String(data.refresh_interval_minutes ?? 15));
        setLastScheduledRefreshAt(data.last_scheduled_refresh_at);
      } catch (error) {
        console.error('加载设置失败:', error);
        toast.error('加载设置失败，已使用默认值');
      } finally {
        setIsLoading(false);
      }
    };

    void loadSettings();
  }, []);

  const handleNumberInput = (
    value: string,
    setter: (v: string) => void,
    allowDecimal = false
  ) => {
    const regex = allowDecimal ? /^[0-9]*\.?[0-9]*$/ : /^[0-9]*$/;
    if (value === '' || regex.test(value)) {
      setter(value);
    }
  };

  const handleSave = async () => {
    const thresholdValue = parseFloat(priceThreshold);
    const urgentValue = parseFloat(urgentThreshold);
    const refreshMinutes = parseInt(refreshIntervalMinutes, 10);

    if (Number.isNaN(thresholdValue) || Number.isNaN(urgentValue)) {
      toast.error('请填写有效的阈值');
      return;
    }

    if (thresholdValue >= urgentValue) {
      toast.error('紧急提醒阈值应大于一般提醒阈值');
      return;
    }

    if (Number.isNaN(refreshMinutes) || refreshMinutes < 5) {
      toast.error('自动刷新间隔至少为 5 分钟');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_alert_enabled: isAlertEnabled,
          threshold_type: thresholdType,
          monitoring_mode: monitoringMode,
          monitoring_rank: monitoringMode === 'average' ? null : parseInt(monitoringRank, 10) || 2,
          threshold_value: thresholdValue,
          urgent_threshold_value: urgentValue,
          alert_sound: alertSound,
          is_desktop_notification: isDesktopNotification,
          is_quiet_hours_enabled: isQuietHoursEnabled,
          quiet_hours_start: quietHoursStart,
          quiet_hours_end: quietHoursEnd,
          refresh_interval_minutes: refreshMinutes,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '保存失败');
      }

      toast.success('设置已保存到数据库');
      setLastScheduledRefreshAt(result.data.last_scheduled_refresh_at);
    } catch (error) {
      console.error('保存设置失败:', error);
      toast.error(error instanceof Error ? error.message : '保存设置失败');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-gray-500">
        正在加载设置...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">提醒设置</h1>
        <p className="text-sm text-gray-500 mt-1">配置价格变动提醒的触发条件和通知方式</p>
        {lastScheduledRefreshAt && (
          <p className="text-xs text-gray-400 mt-2">
            上次自动刷新：{new Date(lastScheduledRefreshAt).toLocaleString('zh-CN')}
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            提醒开关
          </CardTitle>
          <CardDescription>开启或关闭价格变动提醒</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">启用价格提醒</p>
              <p className="text-sm text-gray-500">当监控的原料价格发生变动时发送通知</p>
            </div>
            <Switch checked={isAlertEnabled} onCheckedChange={setIsAlertEnabled} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            提醒阈值（全局设置）
          </CardTitle>
          <CardDescription>适用于所有品类的默认阈值，各品类可单独设置覆盖</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label>阈值类型</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className={`rounded-lg border px-4 py-3 text-left transition-all ${thresholdType === 'percentage' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}
                onClick={() => setThresholdType('percentage')}
                disabled={!isAlertEnabled}
              >
                <div className="flex items-center gap-2 font-medium">
                  <TrendingUp className="h-4 w-4" />
                  百分比变化
                </div>
                <p className="mt-1 text-xs text-gray-500">按涨跌比例触发提醒</p>
              </button>
              <button
                type="button"
                className={`rounded-lg border px-4 py-3 text-left transition-all ${thresholdType === 'absolute' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}
                onClick={() => setThresholdType('absolute')}
                disabled={!isAlertEnabled}
              >
                <div className="flex items-center gap-2 font-medium">
                  <TrendingDown className="h-4 w-4" />
                  绝对值变化
                </div>
                <p className="mt-1 text-xs text-gray-500">按金额变化触发提醒</p>
              </button>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label>监控模式</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button type="button" className={`rounded-lg border px-4 py-3 text-left transition-all ${monitoringMode === 'nth_lowest' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`} onClick={() => setMonitoringMode('nth_lowest')} disabled={!isAlertEnabled}>
                <div className="font-medium">第 N 低价</div>
                <p className="mt-1 text-xs text-gray-500">取排序后第 N 低的报价</p>
              </button>
              <button type="button" className={`rounded-lg border px-4 py-3 text-left transition-all ${monitoringMode === 'average' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`} onClick={() => setMonitoringMode('average')} disabled={!isAlertEnabled}>
                <div className="font-medium">平均价</div>
                <p className="mt-1 text-xs text-gray-500">取全部报价平均值</p>
              </button>
              <button type="button" className={`rounded-lg border px-4 py-3 text-left transition-all ${monitoringMode === 'nth_highest' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`} onClick={() => setMonitoringMode('nth_highest')} disabled={!isAlertEnabled}>
                <div className="font-medium">第 N 高价</div>
                <p className="mt-1 text-xs text-gray-500">取排序后第 N 高的报价</p>
              </button>
            </div>
            {monitoringMode !== 'average' && (
              <div className="flex items-center gap-3">
                <Label htmlFor="monitoringRank" className="whitespace-nowrap">N 值</Label>
                <Input id="monitoringRank" type="number" min="1" value={monitoringRank} onChange={(e) => handleNumberInput(e.target.value, setMonitoringRank)} disabled={!isAlertEnabled} className="w-28 text-center" />
                <span className="text-sm text-gray-500">例如 2 表示第 2 项</span>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="priceThreshold" className="whitespace-nowrap flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                价格变动阈值
              </Label>
              <div className="flex items-center gap-2">
                {thresholdType === 'percentage' ? (
                  <>
                    <Input id="priceThreshold" type="text" inputMode="decimal" value={priceThreshold} onChange={(e) => handleNumberInput(e.target.value, setPriceThreshold, true)} disabled={!isAlertEnabled} className="w-24 text-center" />
                    <span className="text-gray-500">%</span>
                  </>
                ) : (
                  <>
                    <span className="text-gray-500">¥</span>
                    <Input id="priceThreshold" type="text" inputMode="numeric" value={priceThreshold} onChange={(e) => handleNumberInput(e.target.value, setPriceThreshold)} disabled={!isAlertEnabled} className="w-28 text-center" />
                    <span className="text-gray-500">元/吨</span>
                  </>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500">价格变动超过此阈值时才发送提醒</p>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="urgentThreshold" className="whitespace-nowrap flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                紧急提醒阈值
              </Label>
              <div className="flex items-center gap-2">
                {thresholdType === 'percentage' ? (
                  <>
                    <Input id="urgentThreshold" type="text" inputMode="decimal" value={urgentThreshold} onChange={(e) => handleNumberInput(e.target.value, setUrgentThreshold, true)} disabled={!isAlertEnabled} className="w-24 text-center" />
                    <span className="text-gray-500">%</span>
                  </>
                ) : (
                  <>
                    <span className="text-gray-500">¥</span>
                    <Input id="urgentThreshold" type="text" inputMode="numeric" value={urgentThreshold} onChange={(e) => handleNumberInput(e.target.value, setUrgentThreshold)} disabled={!isAlertEnabled} className="w-28 text-center" />
                    <span className="text-gray-500">元/吨</span>
                  </>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500">超过此阈值时触发紧急提醒（红色标识 + 音效提示）</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            紧急提醒音效
          </CardTitle>
          <CardDescription>紧急提醒时播放的提示音</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="alertSound">提示音效</Label>
            <Select value={alertSound} onValueChange={setAlertSound} disabled={!isAlertEnabled}>
              <SelectTrigger>
                <SelectValue placeholder="选择音效" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wechat">微信提示音</SelectItem>
                <SelectItem value="ding">钉钉提示音</SelectItem>
                <SelectItem value="alert">警报声</SelectItem>
                <SelectItem value="soft">柔和提示音</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">桌面弹窗</p>
              <p className="text-sm text-gray-500">紧急提醒时弹出浏览器通知</p>
            </div>
            <Switch
              checked={isDesktopNotification}
              onCheckedChange={setIsDesktopNotification}
              disabled={!isAlertEnabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5" />
            静默时段
          </CardTitle>
          <CardDescription>设置不发送提醒的时间段</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">启用静默时段</p>
              <p className="text-sm text-gray-500">深夜和凌晨不打扰</p>
            </div>
            <Switch checked={isQuietHoursEnabled} onCheckedChange={setIsQuietHoursEnabled} />
          </div>

          {isQuietHoursEnabled && (
            <div className="flex items-center gap-4 pt-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="quietStart">开始时间</Label>
                <Input
                  id="quietStart"
                  type="time"
                  value={quietHoursStart}
                  onChange={(e) => setQuietHoursStart(e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="quietEnd">结束时间</Label>
                <Input
                  id="quietEnd"
                  type="time"
                  value={quietHoursEnd}
                  onChange={(e) => setQuietHoursEnd(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            自动刷新
          </CardTitle>
          <CardDescription>服务端定时抓取店铺价格（修改后需重启 dev 服务生效）</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label htmlFor="refreshInterval">刷新间隔（分钟）</Label>
            <Input
              id="refreshInterval"
              type="text"
              inputMode="numeric"
              value={refreshIntervalMinutes}
              onChange={(e) => handleNumberInput(e.target.value, setRefreshIntervalMinutes)}
              className="w-24 text-center"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? '保存中...' : '保存设置'}
        </Button>
      </div>
    </div>
  );
}
