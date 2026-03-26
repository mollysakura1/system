<template>
  <div class="page-card search-card">
    <div class="search-row">
      <el-form :inline="true" :model="model" class="search-form">
        <el-form-item v-for="field in fields" :key="field.prop" :label="field.label">
          <el-input
            v-if="field.type !== 'select'"
            v-model="model[field.prop]"
            :placeholder="field.placeholder"
            clearable
          />
          <el-select v-else v-model="model[field.prop]" :placeholder="field.placeholder" clearable style="width: 180px">
            <el-option v-for="item in field.options" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="$emit('search')">{{ t('common.search') }}</el-button>
          <el-button @click="$emit('reset')">{{ t('common.reset') }}</el-button>
        </el-form-item>
      </el-form>

      <div v-if="$slots.actions" class="search-actions">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { SearchField } from '../types/components';

defineProps<{
  fields: SearchField[];
  model: Record<string, string>;
}>();

defineEmits<{
  search: [];
  reset: [];
}>();

const { t } = useI18n();
</script>

<style scoped>
.search-card {
  padding: 16px 18px 0;
  margin-bottom: 16px;
}

.search-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.search-form {
  flex: 1;
}

.search-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: fit-content;
  padding-top: 4px;
}

@media (max-width: 900px) {
  .search-row {
    flex-direction: column;
  }

  .search-actions {
    width: 100%;
    justify-content: flex-start;
    padding-bottom: 16px;
  }
}
</style>
