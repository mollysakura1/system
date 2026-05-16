import { getCharts, getOverview } from './dashboard.service.js';
import { listResource, type ResourceRow, type ResourceType } from '../database/db.js';
import type { CurrentUser } from '../types/auth.js';

export type AiToolResult = {
  name: string;
  reason: string;
  data: unknown;
};

const RESOURCE_LABELS: Record<ResourceType, string> = {
  merchants: '商家',
  products: '商品',
  orders: '订单',
  activities: '活动',
  coupons: '优惠券',
  channels: '渠道',
  logs: '日志',
  roles: '角色'
};

function textIncludesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word.toLowerCase()));
}

function asNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function groupSum(rows: ResourceRow[], key: string, valueKey?: string) {
  return rows.reduce<Record<string, { count: number; total: number }>>((result, row) => {
    const label = String(row[key] ?? '未分类');
    result[label] ??= { count: 0, total: 0 };
    result[label].count += 1;
    if (valueKey) result[label].total += asNumber(row[valueKey]);
    return result;
  }, {});
}

function getMerchantName(user: CurrentUser) {
  if (!user.merchantId) return '';
  const merchant = listResource('merchants').find((item) => item.id === user.merchantId);
  return String(merchant?.name ?? '');
}

function applyRoleScope(user: CurrentUser, type: ResourceType, rows: ResourceRow[]) {
  if (user.role !== 'merchant') return rows;
  const merchantName = getMerchantName(user);
  if (!merchantName) return rows;

  if (type === 'merchants') {
    return rows.filter((item) => item.id === user.merchantId || item.name === merchantName);
  }

  if (type === 'orders' || type === 'activities') {
    return rows.filter((item) => item.merchantName === merchantName);
  }

  return rows;
}

function sampleRows(rows: ResourceRow[], limit = 12) {
  return rows.slice(0, limit);
}

function getResourceInsight(user: CurrentUser, type: ResourceType) {
  const rows = applyRoleScope(user, type, listResource(type));

  if (type === 'orders') {
    return {
      total: rows.length,
      totalAmount: rows.reduce((sum, row) => sum + asNumber(row.amount), 0),
      byStatus: groupSum(rows, 'status', 'amount'),
      byChannel: groupSum(rows, 'channel', 'amount'),
      byMerchant: groupSum(rows, 'merchantName', 'amount'),
      samples: sampleRows(rows)
    };
  }

  if (type === 'merchants') {
    return {
      total: rows.length,
      byStatus: groupSum(rows, 'status'),
      byChannel: groupSum(rows, 'channel'),
      totalGmv: rows.reduce((sum, row) => sum + asNumber(row.gmv), 0),
      samples: sampleRows(rows)
    };
  }

  if (type === 'products') {
    return {
      total: rows.length,
      byStatus: groupSum(rows, 'status'),
      byCategory: groupSum(rows, 'category', 'sales'),
      totalSales: rows.reduce((sum, row) => sum + asNumber(row.sales), 0),
      lowStock: rows.filter((row) => asNumber(row.stock) <= 20),
      samples: sampleRows(rows)
    };
  }

  if (type === 'activities') {
    return {
      total: rows.length,
      byStatus: groupSum(rows, 'status', 'budget'),
      byType: groupSum(rows, 'type', 'budget'),
      samples: sampleRows(rows)
    };
  }

  if (type === 'coupons') {
    return {
      total: rows.length,
      byStatus: groupSum(rows, 'status'),
      totalUsed: rows.reduce((sum, row) => sum + asNumber(row.used), 0),
      samples: sampleRows(rows)
    };
  }

  if (type === 'channels') {
    return {
      total: rows.length,
      byStatus: groupSum(rows, 'status'),
      byType: groupSum(rows, 'type'),
      samples: sampleRows(rows)
    };
  }

  return {
    total: rows.length,
    samples: sampleRows(rows)
  };
}

function selectResourceTypes(prompt: string): ResourceType[] {
  const text = prompt.toLowerCase();
  const selected = new Set<ResourceType>();

  if (textIncludesAny(text, ['订单', 'gmv', '成交', '支付', '退款', 'order', 'revenue'])) selected.add('orders');
  if (textIncludesAny(text, ['商家', '店铺', 'merchant', '转化'])) selected.add('merchants');
  if (textIncludesAny(text, ['商品', '库存', '品类', 'sku', 'product'])) selected.add('products');
  if (textIncludesAny(text, ['活动', '投放', '预算', 'campaign', 'activity'])) selected.add('activities');
  if (textIncludesAny(text, ['优惠券', '券', 'coupon'])) selected.add('coupons');
  if (textIncludesAny(text, ['渠道', '抖音', '美团', '私域', 'channel'])) selected.add('channels');

  if (!selected.size || textIncludesAny(text, ['经营', '整体', '概览', '分析', '诊断', 'overview', 'summary'])) {
    selected.add('orders');
    selected.add('merchants');
    selected.add('channels');
  }

  return Array.from(selected).slice(0, 5);
}

export function runBusinessAiTools(user: CurrentUser, prompt: string, options: { days: number }) {
  const resourceTypes = selectResourceTypes(prompt);
  const results: AiToolResult[] = [
    {
      name: 'get_dashboard_overview',
      reason: '获取当前角色可见的经营总览指标',
      data: getOverview(user.role)
    },
    {
      name: 'get_chart_trends',
      reason: `获取近 ${options.days} 天趋势数据`,
      data: getCharts(options.days)
    },
    ...resourceTypes.map((type) => ({
      name: `query_${type}`,
      reason: `根据问题检索${RESOURCE_LABELS[type]}数据`,
      data: getResourceInsight(user, type)
    }))
  ];

  return results;
}

export function formatAiToolContext(results: AiToolResult[]) {
  return [
    '【后端工具调用结果】',
    '这些数据由后端受控工具从 SQLite 读取，回答必须优先基于这些数据。',
    JSON.stringify(results, null, 2)
  ].join('\n');
}
