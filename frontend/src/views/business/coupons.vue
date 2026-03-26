<template>
  <ManagementPage
    :title="t('business.coupons.title')"
    :subtitle="t('business.coupons.subtitle')"
    api-type="coupons"
    :columns="columns"
    allow-create
    allow-delete
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import ManagementPage from '../../components/management-page.vue';

defineOptions({ name: 'CouponsPage' });

const { t } = useI18n();

const columns = computed(() => [
  { prop: 'couponCode', label: t('business.coupons.couponCode'), minWidth: 150 },
  { prop: 'name', label: t('business.coupons.name'), minWidth: 160 },
  { prop: 'stock', label: t('business.coupons.stock'), minWidth: 120 },
  { prop: 'used', label: t('business.coupons.used'), minWidth: 120 },
  { prop: 'status', label: t('business.coupons.status'), minWidth: 120 }
]);
</script>
