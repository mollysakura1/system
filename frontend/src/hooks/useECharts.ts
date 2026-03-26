import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

export function useECharts(optionGetter: () => Record<string, unknown>) {
  const chartRef = ref<HTMLDivElement>();
  let chart: import('echarts').ECharts | null = null;

  async function renderChart() {
    if (!chartRef.value) return;
    const echarts = await import('echarts');
    chart ??= echarts.init(chartRef.value);
    chart.setOption(optionGetter());
  }

  onMounted(() => {
    renderChart();
    window.addEventListener('resize', renderChart);
  });

  watch(optionGetter, () => renderChart(), { deep: true });

  onBeforeUnmount(() => {
    window.removeEventListener('resize', renderChart);
    chart?.dispose();
  });

  return { chartRef };
}
