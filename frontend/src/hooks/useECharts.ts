import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import * as echarts from 'echarts/core';
import type { ECharts, SetOptionOpts } from 'echarts/core';
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

echarts.use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

export function useECharts(optionGetter: () => Record<string, unknown>, enabledGetter: () => boolean = () => true) {
  const chartRef = ref<HTMLDivElement>();
  let chart: ECharts | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let renderFrame = 0;
  let resizeFrame = 0;

  function cancelScheduledFrames() {
    if (renderFrame) {
      window.cancelAnimationFrame(renderFrame);
      renderFrame = 0;
    }

    if (resizeFrame) {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = 0;
    }
  }

  function renderChart() {
    if (!chartRef.value || !enabledGetter()) return;
    chart ??= echarts.init(chartRef.value);
    chart.setOption(optionGetter(), { notMerge: true } satisfies SetOptionOpts);
  }

  function handleResize() {
    chart?.resize();
  }

  function scheduleResize() {
    if (!enabledGetter()) return;

    if (resizeFrame) {
      window.cancelAnimationFrame(resizeFrame);
    }

    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = 0;
        handleResize();
      });
    });
  }

  function scheduleRender() {
    if (!enabledGetter()) return;

    cancelScheduledFrames();
    void nextTick(() => {
      renderFrame = window.requestAnimationFrame(() => {
        renderFrame = window.requestAnimationFrame(() => {
          renderFrame = 0;
          renderChart();
          scheduleResize();
        });
      });
    });
  }

  onMounted(() => {
    if (typeof window.ResizeObserver === 'function') {
      resizeObserver = new window.ResizeObserver(() => {
        scheduleResize();
      });
    }

    if (chartRef.value) {
      resizeObserver?.observe(chartRef.value);
    }

    scheduleRender();
    window.addEventListener('resize', handleResize);
  });

  watch(chartRef, (element, previousElement) => {
    if (previousElement) {
      resizeObserver?.unobserve(previousElement);
    }

    if (element) {
      resizeObserver?.observe(element);
      scheduleRender();
    }
  });

  watch(optionGetter, () => scheduleRender(), { deep: true });
  watch(enabledGetter, (enabled) => {
    if (enabled) {
      scheduleRender();
      return;
    }

    cancelScheduledFrames();
    chart?.dispose();
    chart = null;
  });

  onBeforeUnmount(() => {
    cancelScheduledFrames();
    window.removeEventListener('resize', handleResize);
    resizeObserver?.disconnect();
    chart?.dispose();
  });

  return { chartRef };
}
