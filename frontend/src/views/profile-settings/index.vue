<template>
  <div class="profile-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ title }}</h1>
        <div class="page-subtitle">{{ subtitle }}</div>
      </div>
    </div>

    <div class="profile-grid">
      <div class="page-card profile-card">
        <div class="avatar-row">
          <el-avatar :size="84" :src="form.avatar || userStore.profile?.avatar" />
          <div class="avatar-meta">
            <div class="avatar-title">{{ baseInfoTitle }}</div>
            <div class="avatar-desc">{{ avatarDesc }}</div>
          </div>
        </div>

        <el-form :model="form" label-position="top">
          <el-form-item :label="avatarLabel">
            <el-input v-model="form.avatar" :placeholder="avatarPlaceholder" />
          </el-form-item>
          <el-form-item :label="usernameLabel">
            <el-input :model-value="userStore.profile?.username" disabled />
          </el-form-item>
          <el-form-item :label="nameLabel">
            <el-input v-model="form.name" :placeholder="namePlaceholder" />
          </el-form-item>
          <el-form-item :label="roleLabel">
            <el-input :model-value="userStore.profile?.role" disabled />
          </el-form-item>
          <el-form-item :label="phoneLabel">
            <el-input v-model="form.phone" :placeholder="phonePlaceholder" />
          </el-form-item>
          <el-form-item :label="emailLabel">
            <el-input v-model="form.email" :placeholder="emailPlaceholder" />
          </el-form-item>
          <el-form-item :label="addressLabel">
            <el-input v-model="form.address" :placeholder="addressPlaceholder" />
          </el-form-item>
          <el-form-item :label="passwordLabel">
            <el-input v-model="form.password" type="password" :placeholder="passwordPlaceholder" show-password />
          </el-form-item>
          <el-button type="primary" :loading="saving" @click="saveProfile">{{ saveText }}</el-button>
        </el-form>
      </div>

      <div v-if="showPermissionRequest" class="page-card profile-card">
        <div class="section-title">{{ permissionTitle }}</div>
        <p class="section-desc">{{ permissionDesc }}</p>
        <el-select v-model="targetRole" style="width: 100%; margin-bottom: 16px">
          <el-option v-for="item in roleOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-button type="warning" plain :loading="requesting" @click="applyPermission">{{ requestText }}</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { requestPermissionApi } from '../../api/system';
import { useAppStore } from '../../store/modules/app';
import { useSystemStore } from '../../store/modules/system';
import { useUserStore } from '../../store/modules/user';

defineOptions({ name: 'ProfileSettingsPage' });

const appStore = useAppStore();
const userStore = useUserStore();
const systemStore = useSystemStore();
const saving = ref(false);
const requesting = ref(false);
const targetRole = ref<'operator' | 'analyst' | 'merchant'>('operator');
const form = reactive({
  avatar: '',
  name: '',
  phone: '',
  email: '',
  address: '',
  password: ''
});

const isEn = computed(() => appStore.language === 'en');
const title = computed(() => (isEn.value ? 'Profile Settings' : '个人设置'));
const subtitle = computed(() => (isEn.value ? 'Manage your account profile, contact information, and permission requests.' : '管理你的账号资料、联系信息和权限申请。'));
const baseInfoTitle = computed(() => (isEn.value ? 'Personal Profile' : '个人资料'));
const avatarDesc = computed(() => (isEn.value ? 'Update your avatar URL and basic account information.' : '更新你的头像地址和基础账号信息。'));
const avatarLabel = computed(() => (isEn.value ? 'Avatar URL' : '头像地址'));
const avatarPlaceholder = computed(() => (isEn.value ? 'Enter avatar URL' : '请输入头像图片地址'));
const usernameLabel = computed(() => (isEn.value ? 'Username' : '用户名'));
const nameLabel = computed(() => (isEn.value ? 'Name' : '姓名'));
const namePlaceholder = computed(() => (isEn.value ? 'Enter your name' : '请输入姓名'));
const roleLabel = computed(() => (isEn.value ? 'Current Role' : '当前角色'));
const phoneLabel = computed(() => (isEn.value ? 'Mobile Phone' : '手机号'));
const phonePlaceholder = computed(() => (isEn.value ? 'Enter mobile number' : '请输入手机号'));
const emailLabel = computed(() => (isEn.value ? 'Email' : '电子邮件'));
const emailPlaceholder = computed(() => (isEn.value ? 'Enter email address' : '请输入电子邮件'));
const addressLabel = computed(() => (isEn.value ? 'Address' : '地址'));
const addressPlaceholder = computed(() => (isEn.value ? 'Enter address' : '请输入地址'));
const passwordLabel = computed(() => (isEn.value ? 'New Password' : '新密码'));
const passwordPlaceholder = computed(() => (isEn.value ? 'Leave blank to keep current password' : '留空则不修改当前密码'));
const saveText = computed(() => (isEn.value ? 'Save Profile' : '保存资料'));
const permissionTitle = computed(() => (isEn.value ? 'Permission Request' : '申请修改权限'));
const permissionDesc = computed(() => (isEn.value ? 'Submit a role change request to the super admin through the internal message center.' : '通过站内信向超级管理员提交角色变更申请。'));
const requestText = computed(() => (isEn.value ? 'Submit Request' : '提交申请'));
const showPermissionRequest = computed(() => userStore.profile?.role !== 'super-admin');

const roleOptions = computed(() =>
  [
    { label: isEn.value ? 'Operator' : '运营', value: 'operator' },
    { label: isEn.value ? 'Analyst' : '分析师', value: 'analyst' },
    { label: isEn.value ? 'Merchant' : '商家', value: 'merchant' }
  ].filter((item) => item.value !== userStore.profile?.role)
);

function syncForm() {
  form.avatar = userStore.profile?.avatar ?? '';
  form.name = userStore.profile?.name ?? '';
  form.phone = userStore.profile?.phone ?? '';
  form.email = userStore.profile?.email ?? '';
  form.address = userStore.profile?.address ?? '';
  form.password = '';
  targetRole.value = (roleOptions.value[0]?.value ?? 'operator') as 'operator' | 'analyst' | 'merchant';
}

async function saveProfile() {
  saving.value = true;
  try {
    await userStore.updateProfile({
      avatar: form.avatar,
      name: form.name,
      phone: form.phone,
      email: form.email,
      address: form.address,
      password: form.password || undefined
    });
    await systemStore.ensureUsers(true);
    ElMessage.success(isEn.value ? 'Profile updated successfully' : '个人资料已更新');
    syncForm();
  } finally {
    saving.value = false;
  }
}

async function applyPermission() {
  requesting.value = true;
  try {
    await requestPermissionApi(targetRole.value);
    ElMessage.success(isEn.value ? 'Permission request submitted' : '权限申请已提交');
  } finally {
    requesting.value = false;
  }
}

onMounted(async () => {
  if (!userStore.profile) {
    await userStore.fetchProfile();
  }
  syncForm();
});
</script>

<style scoped>
.profile-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; }
.profile-card { padding: 24px; }
.avatar-row { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
.avatar-title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
.avatar-desc, .section-desc { color: var(--text-secondary); line-height: 1.6; }
.section-title { font-size: 18px; font-weight: 700; margin-bottom: 10px; }
@media (max-width: 1200px) {
  .profile-grid { grid-template-columns: 1fr; }
}
</style>
