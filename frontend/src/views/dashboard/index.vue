<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('dashboard.title') }}</h1>
        <div class="page-subtitle">{{ t('dashboard.subtitle') }}</div>
      </div>
      <div style="display: flex; gap: 12px">
        <el-select v-model="filters.days" style="width: 140px" @change="handleFilterChange">
          <el-option :label="t('dashboard.last7')" :value="7" />
          <el-option :label="t('dashboard.last15')" :value="15" />
          <el-option :label="t('dashboard.last30')" :value="30" />
        </el-select>
        <el-button @click="handleExport">{{ t('dashboard.exportCsv') }}</el-button>
      </div>
    </div>

    <div class="metric-grid">
      <div v-for="metric in localizedMetrics" :key="metric.key" class="page-card metric-card">
        <div class="metric-label">{{ metric.label }}</div>
        <div class="metric-value">{{ metric.value.toLocaleString() }}{{ metric.unit }}</div>
        <div class="metric-trend" :class="{ down: metric.yoy < 0 }">{{ t('dashboard.yoy') }} {{ metric.yoy }}%</div>
      </div>
    </div>

    <div ref="chartGridRef" class="chart-grid">
      <ChartCard :title="t('dashboard.orderGmvTrend')" :subtitle="t('dashboard.orderGmvTrendSub')" :option="lineOption" :active="chartsVisible" :loading="chartLoading" />
      <ChartCard :title="t('dashboard.categorySales')" :subtitle="t('dashboard.categorySalesSub')" :option="barOption" :active="chartsVisible" :loading="chartLoading" />
      <ChartCard :title="t('dashboard.userSources')" :subtitle="t('dashboard.userSourcesSub')" :option="pieOption" :active="chartsVisible" :loading="chartLoading" />
      <div class="page-card quick-card">
        <div class="quick-title">{{ t('dashboard.todayFocus') }}</div>
        <ul>
          <li>{{ t('dashboard.pendingOrders') }}: {{ overview?.quickStats.pendingOrders }}</li>
          <li>{{ t('dashboard.activeCampaigns') }}: {{ overview?.quickStats.activeCampaigns }}</li>
          <li>{{ t('dashboard.abnormalMerchants') }}: {{ overview?.quickStats.abnormalMerchants }}</li>
          <li>{{ t('dashboard.aiInsights') }}: {{ overview?.quickStats.aiInsights }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import ChartCard from '../../components/chart-card.vue';
import { getChartsApi, getOverviewApi } from '../../api/dashboard';
import type { ChartData, ChartOverview } from '../../types';
import { exportToCsv } from '../../utils/export';

defineOptions({ name: 'DashboardPage' });

const { t } = useI18n();
const filters = reactive({ days: 7 });
const overview = ref<ChartOverview>();
const charts = ref<ChartData>();
const chartGridRef = ref<HTMLDivElement>();
const chartsVisible = ref(false);
const chartLoading = ref(false);
const baseAxis = { axisLine: { lineStyle: { color: '#94a3b8' } }, axisLabel: { color: '#64748b' } };
let chartObserver: IntersectionObserver | null = null;

const localizedMetrics = computed(() =>
  (overview.value?.metrics ?? []).map((item) => ({
    ...item,
    label: t(`dashboard.metrics.${item.key}`, item.label)
  }))
);

const lineOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: [t('dashboard.orderCount'), 'GMV'] },
  xAxis: { type: 'category', data: charts.value?.dates ?? [], ...baseAxis },
  yAxis: [{ type: 'value', ...baseAxis }, { type: 'value', ...baseAxis }],
  series: [
    { name: t('dashboard.orderCount'), type: 'line', smooth: true, data: charts.value?.orderTrend ?? [], itemStyle: { color: '#0f766e' } },
    { name: 'GMV', type: 'line', smooth: true, yAxisIndex: 1, data: charts.value?.gmvTrend ?? [], itemStyle: { color: '#0891b2' } }
  ]
}));

const barOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: charts.value?.categorySales.map((item) => item.name) ?? [], ...baseAxis },
  yAxis: { type: 'value', ...baseAxis },
  series: [{ type: 'bar', data: charts.value?.categorySales.map((item) => item.value) ?? [], itemStyle: { color: '#14b8a6' } }]
}));

const pieOption = computed(() => ({
  tooltip: { trigger: 'item' },
  series: [{ type: 'pie', radius: ['45%', '72%'], data: charts.value?.userSources ?? [] }]
}));

async function fetchOverview() {
  const { data } = await getOverviewApi();
  overview.value = data;
}

async function fetchCharts(force = false) {
  if (!chartsVisible.value) {
    chartsVisible.value = true;
  }

  if (chartLoading.value) return;
  if (charts.value && !force) return;

  chartLoading.value = true;
  try {
    const { data } = await getChartsApi(filters.days);
    charts.value = data;
  } finally {
    chartLoading.value = false;
  }
}

function warmupChartsOnVisible() {
  if (!chartGridRef.value || chartsVisible.value) return;

  const loadCharts = async () => {
    chartsVisible.value = true;
    await fetchCharts(true);
  };

  if (typeof window.IntersectionObserver !== 'function') {
    void loadCharts();
    return;
  }

  chartObserver = new window.IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    chartObserver?.disconnect();
    chartObserver = null;
    void loadCharts();
  }, { rootMargin: '180px 0px' });

  chartObserver.observe(chartGridRef.value);
}

function handleFilterChange() {
  void fetchCharts(true);
}

function handleExport() {
  exportToCsv('dashboard-report.csv', localizedMetrics.value.map((item) => ({
    [t('dashboard.metric')]: item.label,
    [t('dashboard.value')]: item.value,
    [t('dashboard.unit')]: item.unit,
    [t('dashboard.exportYoy')]: item.yoy
  })));
}

onMounted(async () => {
  await fetchOverview();
  warmupChartsOnVisible();
});

onBeforeUnmount(() => {
  chartObserver?.disconnect();
  chartObserver = null;
});
</script>

<style scoped>
.metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 18px; }
.metric-card { padding: 20px; }
.metric-label { color: var(--text-secondary); font-size: 13px; }
.metric-value { font-size: 30px; font-weight: 700; margin: 12px 0 8px; }
.metric-trend { color: #16a34a; }
.metric-trend.down { color: #dc2626; }
.chart-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; }
.quick-card { padding: 24px; }
.quick-title { font-size: 16px; font-weight: 700; margin-bottom: 14px; }
.quick-card ul { margin: 0; padding-left: 18px; line-height: 2; color: var(--text-secondary); }
@media (max-width: 1200px) {
  .metric-grid, .chart-grid { grid-template-columns: 1fr; }
}
</style>
