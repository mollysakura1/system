import request from '../utils/request';
import type { PaginatedResult } from '../types';

export function getMerchantsApi() {
  return request.get<never, { data: PaginatedResult<Record<string, string | number>> }>('/merchants');
}

export function getProductsApi() {
  return request.get<never, { data: PaginatedResult<Record<string, string | number>> }>('/products');
}

export function getOrdersApi() {
  return request.get<never, { data: PaginatedResult<Record<string, string | number>> }>('/orders');
}

export function getActivitiesApi() {
  return request.get<never, { data: PaginatedResult<Record<string, string | number>> }>('/activities');
}

export function getCouponsApi() {
  return request.get<never, { data: PaginatedResult<Record<string, string | number>> }>('/coupons');
}

export function getChannelsApi() {
  return request.get<never, { data: PaginatedResult<Record<string, string | number>> }>('/channels');
}
