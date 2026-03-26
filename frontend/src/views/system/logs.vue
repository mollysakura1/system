<template>
  <ManagementPage
    :title="t('logs.title')"
    :subtitle="t('logs.subtitle')"
    api-type="logs"
    :columns="columns"
    allow-delete
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import ManagementPage from '../../components/management-page.vue';

defineOptions({ name: 'LogsPage' });

const { t } = useI18n();

const columns = computed(() => [
  { prop: 'operator', label: t('logs.operator'), minWidth: 120 },
  { prop: 'module', label: t('logs.module'), minWidth: 120 },
  { prop: 'action', label: t('logs.action'), minWidth: 120 },
  { prop: 'ip', label: 'IP', minWidth: 120 },
  { prop: 'createdAt', label: t('logs.time'), minWidth: 180 }
]);
</script>
