<template>
  <div class="page-card chart-card">
    <div class="chart-card__header">
      <div>
        <div class="chart-card__title">{{ title }}</div>
        <div class="chart-card__subtitle">{{ subtitle }}</div>
      </div>
      <slot name="extra" />
    </div>
    <div ref="chartRef" class="chart-card__body"></div>
  </div>
</template>

<script setup lang="ts">
import { useECharts } from '../hooks/useECharts';

const props = defineProps<{
  title: string;
  subtitle?: string;
  option: Record<string, unknown>;
}>();

const { chartRef } = useECharts(() => props.option);

defineExpose({ chartRef });
</script>

<style scoped>
.chart-card { padding: 20px; min-height: 360px; }
.chart-card__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.chart-card__title { font-size: 16px; font-weight: 700; }
.chart-card__subtitle { margin-top: 4px; font-size: 13px; color: var(--text-secondary); }
.chart-card__body { width: 100%; height: 280px; }
</style>
