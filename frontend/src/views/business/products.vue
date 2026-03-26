<template>
  <ManagementPage
    :title="t('business.products.title')"
    :subtitle="t('business.products.subtitle')"
    api-type="products"
    :columns="columns"
    allow-create
    allow-delete
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import ManagementPage from '../../components/management-page.vue';

defineOptions({ name: 'ProductsPage' });

const { t } = useI18n();

const columns = computed(() => [
  { prop: 'productCode', label: t('business.products.productCode'), minWidth: 160 },
  { prop: 'name', label: t('business.products.name'), minWidth: 150 },
  { prop: 'category', label: t('business.products.category'), minWidth: 120 },
  { prop: 'price', label: t('business.products.price'), minWidth: 120 },
  { prop: 'stock', label: t('business.products.stock'), minWidth: 120 },
  { prop: 'sales', label: t('business.products.sales'), minWidth: 120 },
  { prop: 'status', label: t('business.products.status'), minWidth: 120 }
]);
</script>
