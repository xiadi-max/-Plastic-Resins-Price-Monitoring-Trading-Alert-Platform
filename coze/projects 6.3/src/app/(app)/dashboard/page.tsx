'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

// 模拟价格历史数据
const priceHistoryData = [
  { date: '01-10', pp: 8500, pe: 9100, abs: 15600 },
  { date: '01-11', pp: 8450, pe: 9150, abs: 15700 },
  { date: '01-12', pp: 8400, pe: 9200, abs: 15800 },
  { date: '01-13', pp: 8350, pe: 9250, abs: 15750 },
  { date: '01-14', pp: 8300, pe: 9300, abs: 15600 },
  { date: '01-15', pp: 8200, pe: 9450, abs: 15200 },
];

// 统计数据
const stats = [
  {
    label: 'PP聚丙烯',
    price: 8200,
    change: -3.53,
    trend: 'down',
    icon: TrendingDown,
    color: 'text-red-500',
  },
  {
    label: 'PE聚乙烯',
    price: 9450,
    change: 2.72,
    trend: 'up',
    icon: TrendingUp,
    color: 'text-green-500',
  },
  {
    label: 'ABS树脂',
    price: 15200,
    change: -3.8,
    trend: 'down',
    icon: TrendingDown,
    color: 'text-red-500',
  },
];

export default function DashboardPage() {
  const [selectedCategory, setSelectedCategory] = useState('pp');
  const [timeRange, setTimeRange] = useState('7d');
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const chartData = priceHistoryData.map((d) => ({
    date: d.date,
    price: d[selectedCategory as keyof typeof d] as number,
  }));

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">价格看板</h1>
          <p className="text-sm text-gray-500 mt-1">查看原料价格历史走势</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          刷新数据
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">{stat.label}</span>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">¥{stat.price.toLocaleString()}</span>
                  <span className={`text-sm ${stat.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {stat.change >= 0 ? '+' : ''}{stat.change}%
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 图表卡片 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                价格走势
              </CardTitle>
              <CardDescription>近7天价格变动趋势</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="选择品类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pp">PP聚丙烯</SelectItem>
                  <SelectItem value="pe">PE聚乙烯</SelectItem>
                  <SelectItem value="abs">ABS树脂</SelectItem>
                </SelectContent>
              </Select>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="时间范围" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7天</SelectItem>
                  <SelectItem value="30d">30天</SelectItem>
                  <SelectItem value="90d">90天</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => `¥${value}`}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  formatter={(value: number) => [`¥${value.toLocaleString()}`, '价格']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 价格表格 */}
      <Card>
        <CardHeader>
          <CardTitle>历史价格记录</CardTitle>
          <CardDescription>最近7天的详细价格数据</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">日期</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">PP聚丙烯</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">PE聚乙烯</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">ABS树脂</th>
                </tr>
              </thead>
              <tbody>
                {priceHistoryData.map((row, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3">{row.date}</td>
                    <td className="text-right py-2 px-3 font-mono">¥{row.pp.toLocaleString()}</td>
                    <td className="text-right py-2 px-3 font-mono">¥{row.pe.toLocaleString()}</td>
                    <td className="text-right py-2 px-3 font-mono">¥{row.abs.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
