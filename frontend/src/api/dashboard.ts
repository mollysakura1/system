import request from '../utils/request';
import type { ChartData, ChartOverview } from '../types';

export function getOverviewApi() {
  return request.get<never, { data: ChartOverview }>('/dashboard/overview');
}

export function getChartsApi(days: number) {
  return request.get<never, { data: ChartData }>('/dashboard/charts', { params: { days } });
}
