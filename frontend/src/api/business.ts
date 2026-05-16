import request from '../utils/request';
import type { BusinessEntityType, PaginatedResult } from '../types';

type BusinessPayload = Record<string, string | number | boolean>;

const resourcePathMap: Record<BusinessEntityType, string> = {
  merchants: '/merchants',
  products: '/products',
  orders: '/orders',
  activities: '/activities',
  coupons: '/coupons',
  channels: '/channels'
};

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

export function createBusinessResourceApi(type: BusinessEntityType, payload: BusinessPayload) {
  return request.post<never, { data: BusinessPayload }>(resourcePathMap[type], payload);
}

export function updateBusinessResourceApi(type: BusinessEntityType, id: string, payload: BusinessPayload) {
  return request.patch<never, { data: BusinessPayload }>(`${resourcePathMap[type]}/${id}`, payload);
}

export function deleteBusinessResourceApi(type: BusinessEntityType, id: string) {
  return request.delete<never, { data: { id: string } }>(`${resourcePathMap[type]}/${id}`);
}
