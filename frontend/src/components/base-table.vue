<template>
  <div class="page-card table-card">
    <el-table v-loading="loading" :data="data" style="width: 100%">
      <el-table-column
        v-for="column in columns"
        :key="column.prop"
        :prop="column.prop"
        :label="column.label"
        :min-width="column.minWidth"
        :width="column.width"
      >
        <template v-if="column.slot" #default="scope">
          <slot :name="column.slot" v-bind="scope" />
        </template>
      </el-table-column>
      <el-table-column
        v-if="$slots.actions"
        :label="t('common.actions')"
        width="260"
        fixed="right"
        align="center"
        class-name="actions-column"
      >
        <template #default="scope">
          <slot name="actions" v-bind="scope" />
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { TableColumn } from '../types/components';

defineProps<{
  columns: TableColumn[];
  data: Record<string, unknown>[];
  loading?: boolean;
}>();

const { t } = useI18n();
</script>

<style scoped>
.table-card { padding: 16px; }
:deep(.actions-column .cell) {
  overflow: visible;
  text-overflow: clip;
  white-space: nowrap;
}
</style>
