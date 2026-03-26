import { defineStore } from 'pinia';
import { BUSINESS_CACHE_KEY } from '../../config';
import { getActivitiesApi, getChannelsApi, getCouponsApi, getMerchantsApi, getOrdersApi, getProductsApi } from '../../api/business';
import { getStorage, setStorage } from '../../utils/storage';
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
    const cached = getStorage<Partial<BusinessState> | null>(BUSINESS_CACHE_KEY, null);
    return cached ? { ...createEmptyState(), ...cached, initialized: {} } : createEmptyState();
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
    persist() {
      setStorage(BUSINESS_CACHE_KEY, {
        merchants: this.merchants,
        products: this.products,
        orders: this.orders,
        activities: this.activities,
        coupons: this.coupons,
        channels: this.channels
      });
    },
    getRows(type: BusinessEntityType) {
      return this[type];
    },
    async ensureLoaded(type: BusinessEntityType) {
      if (this.initialized[type]) return;

      if (this[type].length) {
        this.initialized[type] = true;
        return;
      }

      const { data } = await fetcherMap[type]();
      this[type] = data.list as BusinessRow[];
      this.initialized[type] = true;
      this.persist();
    },
    addRow(type: BusinessEntityType, row: BusinessRow) {
      this[type] = [row, ...this[type]];
      this.persist();
    },
    updateRow(type: BusinessEntityType, rowId: string, patch: BusinessRow) {
      const index = this[type].findIndex((item) => String(item.id) === rowId);
      if (index >= 0) {
        this[type][index] = { ...this[type][index], ...patch };
        this.persist();
      }
    },
    removeRow(type: BusinessEntityType, rowId: string) {
      this[type] = this[type].filter((item) => String(item.id) !== rowId);
      this.persist();
    }
  }
});
