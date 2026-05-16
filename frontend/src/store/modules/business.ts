import { defineStore } from 'pinia';
import {
  createBusinessResourceApi,
  deleteBusinessResourceApi,
  getActivitiesApi,
  getChannelsApi,
  getCouponsApi,
  getMerchantsApi,
  getOrdersApi,
  getProductsApi,
  updateBusinessResourceApi
} from '../../api/business';
import type { BusinessEntityType } from '../../types';

type BusinessRow = Record<string, string | number | boolean>;

interface BusinessState {
  merchants: BusinessRow[];
  products: BusinessRow[];
  orders: BusinessRow[];
  activities: BusinessRow[];
  coupons: BusinessRow[];
  channels: BusinessRow[];
  initialized: Partial<Record<BusinessEntityType, boolean>>;
}

const fetcherMap = {
  merchants: getMerchantsApi,
  products: getProductsApi,
  orders: getOrdersApi,
  activities: getActivitiesApi,
  coupons: getCouponsApi,
  channels: getChannelsApi
};

function createEmptyState(): BusinessState {
  return {
    merchants: [],
    products: [],
    orders: [],
    activities: [],
    coupons: [],
    channels: [],
    initialized: {}
  };
}

export const useBusinessStore = defineStore('business', {
  state: (): BusinessState => {
    return createEmptyState();
  },
  getters: {
    merchantOptions(state) {
      return state.merchants.map((item) => ({
        label: String(item.name ?? ''),
        value: String(item.name ?? '')
      }));
    },
    channelOptions(state) {
      return state.channels.map((item) => ({
        label: String(item.name ?? ''),
        value: String(item.name ?? '')
      }));
    }
  },
  actions: {
    getRows(type: BusinessEntityType) {
      return this[type];
    },
    async ensureLoaded(type: BusinessEntityType) {
      if (this.initialized[type]) return;

      const { data } = await fetcherMap[type]();
      this[type] = data.list as BusinessRow[];
      this.initialized[type] = true;
    },
    async addRow(type: BusinessEntityType, row: BusinessRow) {
      const { data } = await createBusinessResourceApi(type, row);
      this[type] = [data, ...this[type]];
    },
    async updateRow(type: BusinessEntityType, rowId: string, patch: BusinessRow) {
      const { data } = await updateBusinessResourceApi(type, rowId, patch);
      const index = this[type].findIndex((item) => String(item.id) === rowId);
      if (index >= 0) {
        this[type][index] = data;
      }
    },
    async removeRow(type: BusinessEntityType, rowId: string) {
      await deleteBusinessResourceApi(type, rowId);
      this[type] = this[type].filter((item) => String(item.id) !== rowId);
    }
  }
});
