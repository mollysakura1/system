<template>
  <ManagementPage
    :title="pageTitle"
    :subtitle="pageSubtitle"
    api-type="channels"
    :columns="columns"
    allow-create
    allow-delete
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import ManagementPage from '../../components/management-page.vue';

defineOptions({ name: 'ChannelsPage' });

const { locale } = useI18n();
const isEn = computed(() => locale.value === 'en');
const pageTitle = computed(() => (isEn.value ? 'Channel Management' : '渠道管理'));
const pageSubtitle = computed(() =>
  isEn.value
    ? 'Manage channel records and reuse them in merchant and order forms.'
    : '维护渠道数据，并联动商家和订单表单中的渠道选项。'
);

const columns = computed(() => [
  { prop: 'name', label: isEn.value ? 'Channel Name' : '渠道名称', minWidth: 180 },
  { prop: 'type', label: isEn.value ? 'Channel Type' : '渠道类型', minWidth: 140 },
  { prop: 'status', label: isEn.value ? 'Status' : '状态', minWidth: 120 },
  { prop: 'owner', label: isEn.value ? 'Owner' : '负责人', minWidth: 140 },
  { prop: 'remark', label: isEn.value ? 'Remark' : '备注', minWidth: 220 }
]);
</script>
