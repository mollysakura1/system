<template>
  <div class="page-card chart-card">
    <div class="chart-card__header">
      <div>
        <div class="chart-card__title">{{ title }}</div>
        <div class="chart-card__subtitle">{{ subtitle }}</div>
      </div>
      <slot name="extra" />
    </div>
    <div v-if="!active || loading" class="chart-card__placeholder">
      <div class="chart-card__skeleton chart-card__skeleton--title"></div>
      <div class="chart-card__skeleton chart-card__skeleton--line"></div>
      <div class="chart-card__skeleton chart-card__skeleton--line short"></div>
    </div>
    <div v-show="active && !loading" ref="chartRef" class="chart-card__body"></div>
  </div>
</template>

<script setup lang="ts">
import { useECharts } from '../hooks/useECharts';

const props = defineProps<{
  title: string;
  subtitle?: string;
  option: Record<string, unknown>;
  active?: boolean;
  loading?: boolean;
}>();

const { chartRef } = useECharts(
  () => props.option,
  () => Boolean(props.active) && !props.loading
);

defineExpose({ chartRef });
</script>

<style scoped>
.chart-card { padding: 20px; min-height: 360px; }
.chart-card__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.chart-card__title { font-size: 16px; font-weight: 700; }
.chart-card__subtitle { margin-top: 4px; font-size: 13px; color: var(--text-secondary); }
.chart-card__body { width: 100%; height: 280px; }
.chart-card__placeholder {
  height: 280px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 14px;
}
.chart-card__skeleton {
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(148, 163, 184, 0.14), rgba(148, 163, 184, 0.26), rgba(148, 163, 184, 0.14));
  background-size: 200% 100%;
  animation: chart-card-shimmer 1.4s ease-in-out infinite;
}
.chart-card__skeleton--title { width: 36%; height: 14px; }
.chart-card__skeleton--line { width: 100%; height: 54px; border-radius: 18px; }
.chart-card__skeleton--line.short { width: 72%; }
@keyframes chart-card-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
