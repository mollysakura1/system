<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('roles.title') }}</h1>
        <div class="page-subtitle">{{ t('roles.subtitle') }}</div>
      </div>
      <el-button type="primary" @click="openCreate">{{ t('roles.create') }}</el-button>
    </div>

    <div class="role-grid">
      <div v-for="role in systemStore.roles" :key="String(role.id)" class="page-card role-card">
        <div class="role-card__top">
          <div>
            <h3>{{ role.name }}</h3>
            <p>{{ role.description }}</p>
          </div>
          <el-tag>{{ role.code }}</el-tag>
        </div>
        <div class="permission-list">
          <el-tag v-for="item in (role.permissions as string[])" :key="item" size="small">{{ item }}</el-tag>
        </div>
        <div class="role-card__actions">
          <el-button text type="primary" @click="openView(role)">{{ t('common.view') }}</el-button>
          <el-button text @click="openEdit(role)">{{ t('common.edit') }}</el-button>
          <el-button text @click="openPermission(role)">{{ t('roles.permission') }}</el-button>
          <el-button text type="danger" @click="removeRole(role.id)">{{ t('common.delete') }}</el-button>
        </div>
      </div>
    </div>

    <el-drawer v-model="drawerVisible" :title="t('roles.drawerTitle')" size="420px">
      <el-descriptions v-if="currentRole" :column="1" border>
        <el-descriptions-item :label="t('roles.name')">{{ currentRole.name }}</el-descriptions-item>
        <el-descriptions-item :label="t('roles.code')">{{ currentRole.code }}</el-descriptions-item>
        <el-descriptions-item :label="t('roles.description')">{{ currentRole.description }}</el-descriptions-item>
      </el-descriptions>
    </el-drawer>

    <BaseModalForm
      v-model="modalVisible"
      :title="isEditing ? t('roles.editTitle') : t('roles.createTitle')"
      :form-model="formModel"
      :fields="fields"
      @submit="submitRole"
    />

    <el-dialog v-model="permissionVisible" :title="t('roles.permissionTitle')" width="560px">
      <el-checkbox-group v-model="selectedPermissions">
        <div class="permission-group">
          <el-checkbox v-for="permission in permissionOptions" :key="permission" :label="permission">
            {{ permission }}
          </el-checkbox>
        </div>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="permissionVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="savePermissions">{{ t('roles.savePermission') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useI18n } from 'vue-i18n';
import BaseModalForm from './base-modal-form.vue';
import type { FormField } from '../types/components';
import { useSystemStore } from '../store/modules/system';

type RoleRow = Record<string, string | number | boolean | string[]>;

const { t } = useI18n();
const systemStore = useSystemStore();
const currentRole = ref<RoleRow | null>(null);
const drawerVisible = ref(false);
const modalVisible = ref(false);
const permissionVisible = ref(false);
const isEditing = ref(false);
const selectedPermissions = ref<string[]>([]);
const permissionOptions = [
  'user:create',
  'user:edit',
  'user:delete',
  'role:assign',
  'menu:assign',
  'merchant:view',
  'product:edit',
  'activity:create',
  'orders:view',
  'logs:view',
  'ai:generate',
  'system:settings'
];

const formModel = reactive<Record<string, string>>({
  id: '',
  name: '',
  code: '',
  description: ''
});

const fields = computed<FormField[]>(() => [
  { prop: 'name', label: t('roles.name'), placeholder: t('common.enterField', { field: t('roles.name') }) },
  { prop: 'code', label: t('roles.code'), placeholder: t('common.enterField', { field: t('roles.code') }) },
  { prop: 'description', label: t('roles.description'), type: 'textarea', placeholder: t('common.enterField', { field: t('roles.description') }) }
]);

function patchForm(role?: RoleRow | null) {
  formModel.id = String(role?.id ?? '');
  formModel.name = String(role?.name ?? '');
  formModel.code = String(role?.code ?? '');
  formModel.description = String(role?.description ?? '');
}

function openView(role: RoleRow) {
  currentRole.value = role;
  drawerVisible.value = true;
}

function openEdit(role: RoleRow) {
  isEditing.value = true;
  currentRole.value = role;
  patchForm(role);
  modalVisible.value = true;
}

function openCreate() {
  isEditing.value = false;
  currentRole.value = null;
  patchForm(null);
  modalVisible.value = true;
}

function openPermission(role: RoleRow) {
  currentRole.value = role;
  selectedPermissions.value = [...((role.permissions as string[]) ?? [])];
  permissionVisible.value = true;
}

function submitRole(payload: Record<string, string | number | boolean>) {
  const normalized = {
    id: String(payload.id || `role-${Date.now()}`),
    name: String(payload.name),
    code: String(payload.code),
    description: String(payload.description),
    permissions: currentRole.value?.permissions ?? systemStore.defaultPermissions(String(payload.code))
  };

  if (isEditing.value && currentRole.value) {
    systemStore.updateRole(String(currentRole.value.id), normalized);
    ElMessage.success(t('roles.updated'));
  } else {
    systemStore.addRole(normalized);
    ElMessage.success(t('roles.created'));
  }

  modalVisible.value = false;
}

function savePermissions() {
  if (!currentRole.value) return;
  systemStore.updateRole(String(currentRole.value.id), { permissions: [...selectedPermissions.value] });
  permissionVisible.value = false;
  ElMessage.success(t('roles.permissionUpdated'));
}

async function removeRole(id: string | number | boolean | string[]) {
  await ElMessageBox.confirm(t('roles.deleteConfirm'), t('common.confirmDelete'), { type: 'warning' });
  systemStore.removeRole(String(id));
  ElMessage.success(t('roles.deleted'));
}

onMounted(async () => {
  await systemStore.ensureRoles();
});
</script>

<style scoped>
.role-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.role-card { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.role-card__top { display: flex; justify-content: space-between; gap: 12px; }
.role-card p { color: var(--text-secondary); min-height: 44px; margin: 8px 0 0; }
.permission-list { display: flex; gap: 8px; flex-wrap: wrap; }
.role-card__actions { display: flex; justify-content: flex-end; gap: 4px; flex-wrap: wrap; }
.permission-group { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
@media (max-width: 1200px) {
  .role-grid { grid-template-columns: 1fr; }
  .permission-group { grid-template-columns: 1fr; }
}
</style>
