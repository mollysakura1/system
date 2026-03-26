<template>
  <ManagementPage
    :title="t('business.activities.title')"
    :subtitle="t('business.activities.subtitle')"
    api-type="activities"
    :columns="columns"
    allow-create
    allow-delete
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import ManagementPage from '../../components/management-page.vue';

defineOptions({ name: 'ActivitiesPage' });

const { t } = useI18n();

const columns = computed(() => [
  { prop: 'activityCode', label: t('business.activities.activityCode'), minWidth: 160 },
  { prop: 'name', label: t('business.activities.name'), minWidth: 160 },
  { prop: 'type', label: t('business.activities.type'), minWidth: 120 },
  { prop: 'status', label: t('business.activities.status'), minWidth: 120 },
  { prop: 'budget', label: t('business.activities.budget'), minWidth: 120 },
  { prop: 'roi', label: 'ROI', minWidth: 120 },
  { prop: 'merchantName', label: t('business.activities.merchantName'), minWidth: 120 }
]);
</script>
