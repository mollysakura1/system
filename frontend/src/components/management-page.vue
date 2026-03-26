<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ title }}</h1>
        <div class="page-subtitle">{{ subtitle }}</div>
      </div>
    </div>

    <BaseSearchForm :fields="searchFields" :model="searchModel" @search="fetchData" @reset="handleReset">
      <template v-if="allowCreate" #actions>
        <el-button type="primary" @click="handleCreate">{{ t('common.create') }}</el-button>
      </template>
    </BaseSearchForm>

    <div v-if="virtual" class="page-card virtual-card">
      <div class="virtual-list">
        <div v-for="row in filteredList" :key="String(row.id)" class="virtual-item">
          <div v-for="column in columns" :key="column.prop">
            <div class="virtual-label">{{ column.label }}</div>
            <div>{{ row[column.prop] }}</div>
          </div>
          <div class="action-group virtual-actions">
            <el-button text type="primary" class="action-button" @click="handleView(row)">{{ t('common.view') }}</el-button>
            <el-button text class="action-button" @click="handleEdit(row)">{{ t('common.edit') }}</el-button>
            <el-button v-if="allowDelete" text type="danger" class="action-button" @click="handleDelete(row)">{{ t('common.delete') }}</el-button>
          </div>
        </div>
      </div>
    </div>

    <BaseTable v-else :columns="columns" :data="filteredList" :loading="loading">
      <template #actions="{ row }">
        <div class="action-group table-actions">
          <el-button text type="primary" class="action-button" @click="handleView(row)">{{ t('common.view') }}</el-button>
          <el-button text class="action-button" @click="handleEdit(row)">{{ t('common.edit') }}</el-button>
          <el-button v-if="allowDelete" text type="danger" class="action-button" @click="handleDelete(row)">{{ t('common.delete') }}</el-button>
        </div>
      </template>
    </BaseTable>

    <el-drawer v-model="drawerVisible" :title="`${title}${t('common.details')}`" size="420px">
      <el-descriptions v-if="currentRow" :column="1" border>
        <el-descriptions-item v-for="column in columns" :key="column.prop" :label="column.label">
          {{ currentRow[column.prop] }}
        </el-descriptions-item>
      </el-descriptions>
      <el-empty v-else :description="t('common.empty')" />
    </el-drawer>

    <BaseModalForm
      v-model="modalVisible"
      :title="modalTitle"
      :form-model="formModel"
      :fields="formFields"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useI18n } from 'vue-i18n';
import BaseSearchForm from './base-search-form.vue';
import BaseTable from './base-table.vue';
import BaseModalForm from './base-modal-form.vue';
import { getLogsApi, getUsersApi } from '../api/system';
import { useBusinessStore } from '../store/modules/business';
import { useAppStore } from '../store/modules/app';
import type { BusinessEntityType } from '../types';
import type { FormField, TableColumn } from '../types/components';

type RowData = Record<string, string | number | boolean>;
type ApiType = 'users' | 'logs' | BusinessEntityType;

const CHANNEL_PRIVATE = '\u79c1\u57df';
const CHANNEL_DOUYIN = '\u6296\u97f3';
const CHANNEL_MEITUAN = '\u7f8e\u56e2';
const STATUS_ENABLED = '\u542f\u7528';
const STATUS_DISABLED = '\u505c\u7528';
const CATEGORY_BEVERAGE = '\u996e\u54c1';
const CATEGORY_LIGHT_MEAL = '\u8f7b\u98df';
const CATEGORY_COFFEE_BEANS = '\u5496\u5561\u8c46';
const STATUS_LISTED = '\u4e0a\u67b6';
const STATUS_UNLISTED = '\u4e0b\u67b6';
const ORDER_PENDING_PAY = '\u5f85\u652f\u4ed8';
const ORDER_PAID = '\u5df2\u652f\u4ed8';
const ORDER_COMPLETED = '\u5df2\u5b8c\u6210';
const ORDER_REFUNDED = '\u5df2\u9000\u6b3e';
const ACTIVITY_FULL_REDUCTION = '\u6ee1\u51cf';
const ACTIVITY_LIVESTREAM = '\u76f4\u64ad';
const ACTIVITY_COUPON = '\u4f18\u60e0\u5238';
const ACTIVITY_PENDING_RELEASE = '\u5f85\u53d1\u5e03';
const ACTIVITY_ONGOING = '\u8fdb\u884c\u4e2d';
const ACTIVITY_ENDED = '\u5df2\u7ed3\u675f';
const COUPON_PENDING_DELIVERY = '\u5f85\u6295\u653e';
const COUPON_DELIVERING = '\u6295\u653e\u4e2d';
const COUPON_DEACTIVATED = '\u5df2\u505c\u7528';

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle: string;
    columns: TableColumn[];
    apiType: ApiType;
    virtual?: boolean;
    allowCreate?: boolean;
    allowDelete?: boolean;
  }>(),
  {
    virtual: false,
    allowCreate: false,
    allowDelete: false
  }
);

const { t } = useI18n();
const appStore = useAppStore();
const businessStore = useBusinessStore();
const loading = ref(false);
const rows = ref<RowData[]>([]);
const drawerVisible = ref(false);
const modalVisible = ref(false);
const isEditing = ref(false);
const currentRow = ref<RowData | null>(null);
const searchModel = reactive({ keyword: '' });
const formModel = reactive<RowData>({});

const searchFields = computed(() => [
  { prop: 'keyword', label: t('common.keyword'), placeholder: t('common.enterKeyword') }
]);

const systemApiMap = {
  users: getUsersApi,
  logs: getLogsApi
};

const businessTypes: BusinessEntityType[] = ['merchants', 'products', 'orders', 'activities', 'coupons'];

function isBusinessType(type: ApiType): type is BusinessEntityType {
  return businessTypes.includes(type as BusinessEntityType);
}

const optionMap = computed<Partial<Record<ApiType, Record<string, Array<{ label: string; value: string | number }>>>>>(
  () => ({
    merchants: {
      channel: [
        { label: t('business.options.channelPrivate'), value: CHANNEL_PRIVATE },
        { label: t('business.options.channelDouyin'), value: CHANNEL_DOUYIN },
        { label: t('business.options.channelMeituan'), value: CHANNEL_MEITUAN }
      ],
      status: [
        { label: t('business.options.enabled'), value: STATUS_ENABLED },
        { label: t('business.options.disabled'), value: STATUS_DISABLED }
      ]
    },
    products: {
      category: [
        { label: t('business.options.beverage'), value: CATEGORY_BEVERAGE },
        { label: t('business.options.lightMeal'), value: CATEGORY_LIGHT_MEAL },
        { label: t('business.options.coffeeBeans'), value: CATEGORY_COFFEE_BEANS }
      ],
      status: [
        { label: t('business.options.listed'), value: STATUS_LISTED },
        { label: t('business.options.unlisted'), value: STATUS_UNLISTED }
      ]
    },
    orders: {
      merchantName: [],
      status: [
        { label: t('business.options.pendingPay'), value: ORDER_PENDING_PAY },
        { label: t('business.options.paid'), value: ORDER_PAID },
        { label: t('business.options.completed'), value: ORDER_COMPLETED },
        { label: t('business.options.refunded'), value: ORDER_REFUNDED }
      ],
      channel: [
        { label: t('business.options.channelPrivate'), value: CHANNEL_PRIVATE },
        { label: t('business.options.channelDouyin'), value: CHANNEL_DOUYIN },
        { label: t('business.options.channelMeituan'), value: CHANNEL_MEITUAN }
      ]
    },
    activities: {
      merchantName: [],
      type: [
        { label: t('business.options.fullReduction'), value: ACTIVITY_FULL_REDUCTION },
        { label: t('business.options.livestream'), value: ACTIVITY_LIVESTREAM },
        { label: t('business.options.coupon'), value: ACTIVITY_COUPON }
      ],
      status: [
        { label: t('business.options.pendingRelease'), value: ACTIVITY_PENDING_RELEASE },
        { label: t('business.options.ongoing'), value: ACTIVITY_ONGOING },
        { label: t('business.options.ended'), value: ACTIVITY_ENDED }
      ]
    },
    coupons: {
      status: [
        { label: t('business.options.pendingDelivery'), value: COUPON_PENDING_DELIVERY },
        { label: t('business.options.delivering'), value: COUPON_DELIVERING },
        { label: t('business.options.deactivated'), value: COUPON_DEACTIVATED }
      ]
    }
  })
);

const generatedFields = new Set(['merchantCode', 'productCode', 'orderNo', 'activityCode', 'couponCode', 'createdAt']);

const formFields = computed<FormField[]>(() =>
  props.columns
    .filter((column) => column.prop !== 'id' && !generatedFields.has(column.prop))
    .slice(0, 6)
    .map((column) => {
      const dynamicOptions =
        (props.apiType === 'orders' || props.apiType === 'activities') && column.prop === 'merchantName'
          ? businessStore.merchantOptions
          : optionMap.value[props.apiType]?.[column.prop];

      return {
        prop: column.prop,
        label: column.label,
        type: dynamicOptions ? 'select' : 'input',
        options: dynamicOptions,
        placeholder: dynamicOptions
          ? t('common.selectField', { field: column.label })
          : t('common.enterField', { field: column.label })
      } satisfies FormField;
    })
);

const modalTitle = computed(() => `${isEditing.value ? t('common.edit') : t('common.create')}${props.title}`);

const filteredList = computed(() => {
  const keyword = searchModel.keyword.trim().toLowerCase();
  if (!keyword) return rows.value;
  return rows.value.filter((item) => JSON.stringify(item).toLowerCase().includes(keyword));
});

const codeConfig: Partial<Record<ApiType, { key: string; prefix: string }>> = {
  merchants: { key: 'merchantCode', prefix: 'MCH' },
  products: { key: 'productCode', prefix: 'PRD' },
  orders: { key: 'orderNo', prefix: 'ORD' },
  activities: { key: 'activityCode', prefix: 'ACT' },
  coupons: { key: 'couponCode', prefix: 'CPN' }
};

function generateUniqueCode(prefix: string, field: string) {
  let code = '';
  do {
    code = `${prefix}${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
  } while (rows.value.some((item) => item[field] === code));
  return code;
}

function getDefaultValue(prop: string) {
  const options =
    (props.apiType === 'orders' || props.apiType === 'activities') && prop === 'merchantName'
      ? businessStore.merchantOptions
      : optionMap.value[props.apiType]?.[prop];

  if (options?.length) return options[0].value;
  if (prop === 'amount' || prop === 'budget' || prop === 'stock' || prop === 'used' || prop === 'sales' || prop === 'orders') return 0;
  return '';
}

async function fetchData() {
  loading.value = true;
  try {
    if (isBusinessType(props.apiType)) {
      if (props.apiType === 'orders' || props.apiType === 'activities') {
        await businessStore.ensureLoaded('merchants');
      }
      await businessStore.ensureLoaded(props.apiType);
      rows.value = [...businessStore.getRows(props.apiType)];
      return;
    }

    const { data } = await systemApiMap[props.apiType]();
    rows.value = [...data.list] as RowData[];
  } finally {
    loading.value = false;
  }
}

function handleReset() {
  searchModel.keyword = '';
  fetchData();
}

function syncForm(row?: RowData | null) {
  Object.keys(formModel).forEach((key) => delete formModel[key]);

  formFields.value.forEach((field) => {
    formModel[field.prop] = row?.[field.prop] ?? getDefaultValue(field.prop);
  });

  if (row?.id) {
    formModel.id = row.id;
  }
}

function handleView(row: RowData) {
  currentRow.value = row;
  drawerVisible.value = true;
}

function handleEdit(row: RowData) {
  isEditing.value = true;
  currentRow.value = row;
  syncForm(row);
  modalVisible.value = true;
}

async function handleCreate() {
  isEditing.value = false;
  currentRow.value = null;
  if (props.apiType === 'orders' || props.apiType === 'activities') {
    await businessStore.ensureLoaded('merchants');
  }
  syncForm(null);
  modalVisible.value = true;
}

function buildCreateRow(payload: RowData) {
  const created: RowData = {
    id: `row-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ...payload
  };

  const config = codeConfig[props.apiType];
  if (config && !created[config.key]) {
    created[config.key] = generateUniqueCode(config.prefix, config.key);
  }

  if (props.apiType === 'orders' && !created.createdAt) {
    created.createdAt = new Date().toLocaleString(appStore.language === 'en' ? 'en-US' : 'zh-CN', { hour12: false });
  }

  return created;
}

function normalizeEditPayload(payload: RowData) {
  const next = { ...payload };
  const config = codeConfig[props.apiType];

  if (config) {
    const value = String(next[config.key] ?? '').trim();
    const conflict = rows.value.some((item) => item.id !== currentRow.value?.id && item[config.key] === value);
    if (value && conflict) {
      next[config.key] = generateUniqueCode(config.prefix, config.key);
      const label = props.columns.find((column) => column.prop === config.key)?.label ?? config.key;
      ElMessage.warning(t('common.duplicateCode', { field: label }));
    }
  }

  return next;
}

function refreshLocalRows() {
  if (isBusinessType(props.apiType)) {
    rows.value = [...businessStore.getRows(props.apiType)];
  }
}

function handleSubmit(payload: RowData) {
  if (isEditing.value && currentRow.value) {
    const normalized = normalizeEditPayload(payload);

    if (isBusinessType(props.apiType)) {
      businessStore.updateRow(props.apiType, String(currentRow.value.id), normalized);
      refreshLocalRows();
    } else {
      const index = rows.value.findIndex((item) => item.id === currentRow.value?.id);
      if (index >= 0) {
        rows.value[index] = { ...rows.value[index], ...normalized };
      }
    }

    ElMessage.success(t('common.updateCurrent'));
  } else {
    const created = buildCreateRow(payload);

    if (isBusinessType(props.apiType)) {
      businessStore.addRow(props.apiType, created);
      refreshLocalRows();
    } else {
      rows.value.unshift(created);
    }

    ElMessage.success(t('common.createCurrent'));
  }

  modalVisible.value = false;
  currentRow.value = null;
}

async function handleDelete(row: RowData) {
  const target = String(row[props.columns[0].prop] ?? row.id);
  await ElMessageBox.confirm(t('common.deleteTargetConfirm', { target }), t('common.confirmDelete'), {
    type: 'warning'
  });

  if (isBusinessType(props.apiType)) {
    businessStore.removeRow(props.apiType, String(row.id));
    refreshLocalRows();
  } else {
    rows.value = rows.value.filter((item) => item.id !== row.id);
  }

  ElMessage.success(t('common.deleteSuccess'));
}

onMounted(fetchData);
</script>

<style scoped>
.virtual-card {
  padding: 12px;
  min-height: calc(100vh - 260px);
  display: flex;
}
.virtual-list {
  flex: 1;
  width: 100%;
  max-height: calc(100vh - 284px);
  overflow: auto;
  display: grid;
  gap: 12px;
  align-content: start;
}
.virtual-item {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  padding: 16px;
  border-radius: 16px;
  background: rgba(148, 163, 184, 0.08);
}
.virtual-label { color: var(--text-secondary); font-size: 12px; margin-bottom: 4px; }
.action-group {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0;
  white-space: nowrap;
}
.action-button {
  min-width: 44px;
  margin: 0;
  padding: 4px 8px;
}
.table-actions {
  width: 100%;
}
.virtual-actions {
  grid-column: 1 / -1;
  justify-self: end;
  padding-top: 6px;
  border-top: 1px solid var(--border-color);
}
</style>
