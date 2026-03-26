<template>
  <ManagementPage
    :title="t('business.merchants.title')"
    :subtitle="t('business.merchants.subtitle')"
    api-type="merchants"
    :columns="columns"
    allow-create
    allow-delete
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import ManagementPage from '../../components/management-page.vue';

defineOptions({ name: 'MerchantsPage' });

const { t } = useI18n();

const columns = computed(() => [
  { prop: 'merchantCode', label: t('business.merchants.merchantCode'), minWidth: 160 },
  { prop: 'name', label: t('business.merchants.name'), minWidth: 150 },
  { prop: 'channel', label: t('business.merchants.channel'), minWidth: 120 },
  { prop: 'owner', label: t('business.merchants.owner'), minWidth: 120 },
  { prop: 'status', label: t('business.merchants.status'), minWidth: 120 },
  { prop: 'gmv', label: 'GMV', minWidth: 120 },
  { prop: 'orders', label: t('business.merchants.orders'), minWidth: 120 }
]);
</script>
