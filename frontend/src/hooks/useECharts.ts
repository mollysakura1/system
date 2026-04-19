import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import * as echarts from 'echarts/core';
import type { ECharts, SetOptionOpts } from 'echarts/core';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

echarts.use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

export function useECharts(optionGetter: () => Record<string, unknown>, enabledGetter: () => boolean = () => true) {
  const chartRef = ref<HTMLDivElement>();
  let chart: ECharts | null = null;

  function renderChart() {
    if (!chartRef.value || !enabledGetter()) return;
    chart ??= echarts.init(chartRef.value);
    chart.setOption(optionGetter(), { notMerge: true } satisfies SetOptionOpts);
  }

  function handleResize() {
    chart?.resize();
  }

  onMounted(() => {
    renderChart();
    window.addEventListener('resize', handleResize);
  });

  watch(optionGetter, () => renderChart(), { deep: true });
  watch(enabledGetter, (enabled) => {
    if (enabled) {
      renderChart();
      return;
    }

    chart?.dispose();
    chart = null;
  });

  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
    chart?.dispose();
  });

  return { chartRef };
}
