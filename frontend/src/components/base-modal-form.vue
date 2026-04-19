<template>
  <el-dialog v-model="visible" :title="title" width="520px">
    <el-form :model="formModel" label-width="90px">
      <el-form-item v-for="field in fields" :key="field.prop" :label="field.label">
        <el-input
          v-if="field.type === 'input' || field.type === 'textarea' || !field.type"
          :model-value="String(formModel[field.prop] ?? '')"
          @update:model-value="updateTextField(field.prop, $event)"
          :type="field.type === 'textarea' ? 'textarea' : 'text'"
          :placeholder="field.placeholder"
        />
        <el-select v-else-if="field.type === 'select'" v-model="formModel[field.prop]" style="width: 100%">
          <el-option v-for="item in field.options" :key="String(item.value)" :label="item.label" :value="item.value" />
        </el-select>
        <el-switch v-else-if="field.type === 'switch'" v-model="formModel[field.prop]" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" @click="$emit('submit', formModel)">{{ t('common.save') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormField } from '../types/components';

const props = defineProps<{
  modelValue: boolean;
  title: string;
  formModel: Record<string, string | number | boolean>;
  fields: FormField[];
}>();

const emit = defineEmits<{
  'update:modelValue': [boolean];
  submit: [Record<string, string | number | boolean>];
}>();

const { t } = useI18n();

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
});

function updateTextField(prop: string, value: string) {
  props.formModel[prop] = value;
}
</script>
