<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('users.title') }}</h1>
        <div class="page-subtitle">{{ t('users.subtitle') }}</div>
      </div>
    </div>

    <BaseSearchForm :fields="searchFields" :model="searchModel" @search="noop" @reset="resetSearch">
      <template #actions>
        <el-button type="primary" @click="openCreate">{{ t('common.create') }}</el-button>
      </template>
    </BaseSearchForm>

    <BaseTable :columns="columns" :data="filteredUsers">
      <template #actions="{ row }">
        <div class="action-group">
          <el-button text type="primary" @click="openView(row)">{{ t('common.view') }}</el-button>
          <el-button text @click="openEdit(row)">{{ t('common.edit') }}</el-button>
          <el-button text type="danger" @click="removeUser(row.id)">{{ t('common.delete') }}</el-button>
        </div>
      </template>
    </BaseTable>

    <el-drawer v-model="drawerVisible" :title="drawerTitle" size="420px">
      <el-descriptions v-if="currentUser" :column="1" border>
        <el-descriptions-item :label="usernameLabel">{{ currentUser.username }}</el-descriptions-item>
        <el-descriptions-item :label="t('users.name')">{{ currentUser.name }}</el-descriptions-item>
        <el-descriptions-item :label="t('users.role')">{{ currentUser.role }}</el-descriptions-item>
        <el-descriptions-item :label="t('users.status')">{{ currentUser.status }}</el-descriptions-item>
        <el-descriptions-item :label="t('users.createdAt')">{{ currentUser.createdAt }}</el-descriptions-item>
      </el-descriptions>
    </el-drawer>

    <BaseModalForm
      v-model="modalVisible"
      :title="isEditing ? t('users.editTitle') : t('users.createTitle')"
      :form-model="formModel"
      :fields="fields"
      @submit="submitUser"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useI18n } from 'vue-i18n';
import BaseModalForm from '../../components/base-modal-form.vue';
import BaseSearchForm from '../../components/base-search-form.vue';
import BaseTable from '../../components/base-table.vue';
import { useAppStore } from '../../store/modules/app';
import { useMessageStore } from '../../store/modules/message';
import { useSystemStore } from '../../store/modules/system';
import type { FormField } from '../../types/components';
import type { RoleCode, UserRecord } from '../../types';

defineOptions({ name: 'UsersPage' });

const STATUS_ENABLED = 'Enabled';
const STATUS_DISABLED = 'Disabled';

const { t } = useI18n();
const appStore = useAppStore();
const messageStore = useMessageStore();
const systemStore = useSystemStore();
const drawerVisible = ref(false);
const modalVisible = ref(false);
const isEditing = ref(false);
const submitting = ref(false);
const currentUser = ref<UserRecord | null>(null);
const searchModel = reactive({ keyword: '' });
const formModel = reactive<Record<string, string | number | boolean>>({
  id: '',
  username: '',
  name: '',
  role: '',
  status: STATUS_ENABLED,
  password: ''
});

const isEn = computed(() => appStore.language === 'en');
const usernameLabel = computed(() => (isEn.value ? 'Username' : '用户名'));
const usernamePlaceholder = computed(() => (isEn.value ? 'Enter username' : '请输入用户名'));
const passwordLabel = computed(() => (isEn.value ? 'Password' : '密码'));
const passwordPlaceholder = computed(() => (isEn.value ? 'Leave blank to keep current password' : '留空则不修改当前密码'));
const drawerTitle = computed(() => (isEn.value ? 'User Details' : '用户详情'));

const searchFields = computed(() => [{ prop: 'keyword', label: t('common.keyword'), placeholder: t('users.searchPlaceholder') }]);
const columns = computed(() => [
  { prop: 'username', label: usernameLabel.value, minWidth: 140 },
  { prop: 'name', label: t('users.name'), minWidth: 120 },
  { prop: 'role', label: t('users.role'), minWidth: 120 },
  { prop: 'status', label: t('users.status'), minWidth: 120 },
  { prop: 'createdAt', label: t('users.createdAt'), minWidth: 160 }
]);

const fields = computed<FormField[]>(() => [
  { prop: 'username', label: usernameLabel.value, placeholder: usernamePlaceholder.value },
  { prop: 'name', label: t('users.name'), placeholder: t('users.namePlaceholder') },
  { prop: 'role', label: t('users.role'), type: 'select', options: systemStore.roleOptions, placeholder: t('users.rolePlaceholder') },
  {
    prop: 'status',
    label: t('users.status'),
    type: 'select',
    options: [
      { label: t('users.enabled'), value: STATUS_ENABLED },
      { label: t('users.disabled'), value: STATUS_DISABLED }
    ],
    placeholder: t('users.statusPlaceholder')
  },
  { prop: 'password', label: passwordLabel.value, placeholder: passwordPlaceholder.value }
]);

const filteredUsers = computed(() => {
  const keyword = searchModel.keyword.trim().toLowerCase();
  if (!keyword) return systemStore.users;
  return systemStore.users.filter((item) => JSON.stringify(item).toLowerCase().includes(keyword));
});

function noop() {}

function resetSearch() {
  searchModel.keyword = '';
}

function patchForm(user?: UserRecord | null) {
  formModel.id = String(user?.id ?? '');
  formModel.username = String(user?.username ?? '');
  formModel.name = String(user?.name ?? '');
  formModel.role = String(user?.role ?? systemStore.roleOptions[0]?.value ?? '');
  formModel.status = String(user?.status ?? STATUS_ENABLED);
  formModel.password = '';
}

function openView(user: UserRecord) {
  currentUser.value = user;
  drawerVisible.value = true;
}

function openEdit(user: UserRecord) {
  isEditing.value = true;
  currentUser.value = user;
  patchForm(user);
  modalVisible.value = true;
}

function openCreate() {
  isEditing.value = false;
  currentUser.value = null;
  patchForm(null);
  modalVisible.value = true;
}

async function submitUser(payload: Record<string, string | number | boolean>) {
  submitting.value = true;
  try {
    const normalized = {
      username: String(payload.username),
      name: String(payload.name),
      role: String(payload.role) as RoleCode,
      status: String(payload.status),
      password: String(payload.password || '')
    };

    if (isEditing.value && currentUser.value) {
      await systemStore.updateUser(String(currentUser.value.id), normalized);
      ElMessage.success(t('users.updated'));
    } else {
      await systemStore.addUser(normalized);
      ElMessage.success(t('users.created'));
    }

    await messageStore.fetchMessages(true);
    modalVisible.value = false;
  } finally {
    submitting.value = false;
  }
}

async function removeUser(id: string) {
  await ElMessageBox.confirm(t('users.deleteConfirm'), t('common.confirmDelete'), { type: 'warning' });
  await systemStore.removeUser(String(id));
  ElMessage.success(t('users.deleted'));
}

onMounted(async () => {
  await systemStore.ensureRoles();
  await systemStore.ensureUsers(true);
});
</script>

<style scoped>
.action-group {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0;
}
</style>
