<template>
  <ManagementPage
    :title="t('business.orders.title')"
    :subtitle="t('business.orders.subtitle')"
    api-type="orders"
    :columns="columns"
    virtual
    allow-create
    allow-delete
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import ManagementPage from '../../components/management-page.vue';

defineOptions({ name: 'OrdersPage' });

const { t } = useI18n();

const columns = computed(() => [
  { prop: 'orderNo', label: t('business.orders.orderNo'), minWidth: 160 },
  { prop: 'merchantName', label: t('business.orders.merchantName'), minWidth: 140 },
  { prop: 'amount', label: t('business.orders.amount'), minWidth: 120 },
  { prop: 'status', label: t('business.orders.status'), minWidth: 120 },
  { prop: 'channel', label: t('business.orders.channel'), minWidth: 120 },
  { prop: 'createdAt', label: t('business.orders.createdAt'), minWidth: 180 }
]);
</script>
