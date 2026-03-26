import dayjs from 'dayjs';

export function getOverview(role: string) {
  return {
    role,
    metrics: [
      { key: 'gmv', label: '本月 GMV', value: 1289300, yoy: 12.4, unit: '元' },
      { key: 'orders', label: '支付订单', value: 28421, yoy: 8.1, unit: '单' },
      { key: 'users', label: '活跃用户', value: 18320, yoy: -2.5, unit: '人' },
      { key: 'conversion', label: '转化率', value: 6.82, yoy: 1.7, unit: '%' }
    ],
    quickStats: {
      pendingOrders: 129,
      activeCampaigns: 14,
      abnormalMerchants: 3,
      aiInsights: 8
    }
  };
}

export function getCharts(days = 7) {
  const dates = Array.from({ length: days }).map((_, index) => dayjs().subtract(days - index - 1, 'day').format('MM-DD'));

  return {
    dates,
    orderTrend: dates.map((_, index) => 820 + index * 42 + (index % 2 === 0 ? 60 : -35)),
    gmvTrend: dates.map((_, index) => 42000 + index * 3800 + (index % 3 === 0 ? 3200 : -1200)),
    categorySales: [
      { name: '饮品', value: 420000 },
      { name: '轻食', value: 260000 },
      { name: '咖啡豆', value: 180000 },
      { name: '零食', value: 120000 }
    ],
    userSources: [
      { name: '私域', value: 45 },
      { name: '抖音', value: 28 },
      { name: '美团', value: 17 },
      { name: '自然搜索', value: 10 }
    ]
  };
}
