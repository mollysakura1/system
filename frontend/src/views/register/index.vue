<template>
  <div class="register-shell">
    <div class="register-card page-card">
      <div class="card-header">
        <div class="header-copy">
          <h1>{{ title }}</h1>
          <p>{{ subtitle }}</p>
        </div>
        <el-link class="back-link" type="primary" @click="router.push('/login')">{{ loginText }}</el-link>
      </div>

      <el-form :model="form" label-position="top">
        <el-form-item :label="usernameLabel">
          <el-input v-model="form.username" :placeholder="usernamePlaceholder" />
        </el-form-item>
        <el-form-item :label="nameLabel">
          <el-input v-model="form.name" :placeholder="namePlaceholder" />
        </el-form-item>
        <el-form-item :label="passwordLabel">
          <el-input v-model="form.password" type="password" :placeholder="passwordPlaceholder" show-password />
        </el-form-item>
        <el-form-item :label="confirmPasswordLabel">
          <el-input v-model="form.confirmPassword" type="password" :placeholder="confirmPasswordPlaceholder" show-password />
        </el-form-item>
        <el-form-item :label="roleLabel">
          <el-select v-model="form.role" style="width: 100%">
            <el-option v-for="item in roleOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item :label="captchaLabel">
          <div class="captcha-row">
            <el-input v-model="form.captchaCode" :placeholder="captchaPlaceholder" maxlength="4" />
            <button type="button" class="captcha-box" :disabled="captchaLoading" @click="loadCaptcha">
              <img v-if="captchaImage" :src="captchaImage" :alt="captchaAlt" />
              <span v-else>{{ captchaLoading ? loadingCaptchaText : refreshCaptchaText }}</span>
            </button>
          </div>
        </el-form-item>
        <div class="captcha-tip">{{ captchaTip }}</div>
        <el-button type="primary" style="width: 100%" :loading="loading" @click="handleRegister">{{ submitText }}</el-button>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import { getCaptchaApi, registerApi } from '../../api/auth';
import { useAppStore } from '../../store/modules/app';

const router = useRouter();
const appStore = useAppStore();
const loading = ref(false);
const captchaLoading = ref(false);
const captchaImage = ref('');
const form = reactive({
  username: '',
  name: '',
  password: '',
  confirmPassword: '',
  role: 'operator' as 'operator' | 'analyst' | 'merchant',
  captchaId: '',
  captchaCode: ''
});

const isEn = computed(() => appStore.language === 'en');
const title = computed(() => (isEn.value ? 'Register Account' : '注册账号'));
const subtitle = computed(() => (isEn.value ? 'Create an operations account and complete your profile later.' : '创建一个运营账号，其他资料可在个人设置中继续完善。'));
const loginText = computed(() => (isEn.value ? 'Back to Login' : '返回登录'));
const usernameLabel = computed(() => (isEn.value ? 'Username' : '用户名'));
const usernamePlaceholder = computed(() => (isEn.value ? 'Enter username' : '请输入用户名'));
const nameLabel = computed(() => (isEn.value ? 'Name' : '姓名'));
const namePlaceholder = computed(() => (isEn.value ? 'Enter your name' : '请输入姓名'));
const passwordLabel = computed(() => (isEn.value ? 'Password' : '密码'));
const passwordPlaceholder = computed(() => (isEn.value ? 'Enter password' : '请输入密码'));
const confirmPasswordLabel = computed(() => (isEn.value ? 'Confirm Password' : '确认密码'));
const confirmPasswordPlaceholder = computed(() => (isEn.value ? 'Re-enter password' : '请再次输入密码'));
const roleLabel = computed(() => (isEn.value ? 'Permission Role' : '权限角色'));
const captchaLabel = computed(() => (isEn.value ? 'Captcha' : '图形验证码'));
const captchaPlaceholder = computed(() => (isEn.value ? 'Enter captcha' : '请输入验证码'));
const captchaAlt = computed(() => (isEn.value ? 'Captcha' : '图形验证码'));
const captchaTip = computed(() => (isEn.value ? 'Click the image to refresh the captcha' : '点击图片可刷新验证码'));
const refreshCaptchaText = computed(() => (isEn.value ? 'Refresh' : '刷新验证码'));
const loadingCaptchaText = computed(() => (isEn.value ? 'Loading...' : '加载中...'));
const submitText = computed(() => (isEn.value ? 'Register' : '立即注册'));

const roleOptions = computed(() => [
  { label: isEn.value ? 'Operator' : '运营', value: 'operator' },
  { label: isEn.value ? 'Analyst' : '分析师', value: 'analyst' },
  { label: isEn.value ? 'Merchant' : '商家', value: 'merchant' }
]);

async function loadCaptcha() {
  captchaLoading.value = true;
  try {
    const { data } = await getCaptchaApi();
    form.captchaId = data.captchaId;
    form.captchaCode = '';
    captchaImage.value = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data.svg)}`;
  } finally {
    captchaLoading.value = false;
  }
}

async function handleRegister() {
  if (!form.username.trim() || !form.name.trim() || !form.password.trim() || !form.confirmPassword.trim()) {
    ElMessage.warning(isEn.value ? 'Please complete the registration form' : '请完整填写注册信息');
    return;
  }

  if (form.password !== form.confirmPassword) {
    ElMessage.warning(isEn.value ? 'The two passwords do not match' : '两次输入的密码不一致');
    return;
  }

  if (!form.captchaCode.trim() || !form.captchaId) {
    ElMessage.warning(isEn.value ? 'Please enter the captcha' : '请输入验证码');
    await loadCaptcha();
    return;
  }

  loading.value = true;
  try {
    await registerApi({
      username: form.username,
      name: form.name,
      password: form.password,
      role: form.role,
      captchaId: form.captchaId,
      captchaCode: form.captchaCode
    });
    ElMessage.success(isEn.value ? 'Registration successful, please log in' : '注册成功，请返回登录');
    router.push('/login');
  } catch {
    await loadCaptcha();
  } finally {
    loading.value = false;
  }
}

onMounted(loadCaptcha);
</script>

<style scoped>
.register-shell { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
.register-card { width: min(520px, 100%); padding: 28px; }
.card-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
.header-copy { min-width: 0; flex: 1; }
.card-header h1 { margin: 0 0 8px; font-size: 28px; }
.card-header p { margin: 0; color: var(--text-secondary); line-height: 1.6; }
.back-link { flex-shrink: 0; white-space: nowrap; align-self: flex-start; margin-top: 4px; }
.captcha-row {
  display: grid;
  grid-template-columns: 1fr 132px;
  gap: 12px;
  width: 100%;
}
.captcha-box {
  height: 40px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: #f8fafc;
  cursor: pointer;
  overflow: hidden;
  display: grid;
  place-items: center;
  padding: 0;
}
.captcha-box img {
  width: 100%;
  height: 100%;
  display: block;
}
.captcha-tip {
  margin: -8px 0 16px;
  color: var(--text-secondary);
  font-size: 12px;
}
@media (max-width: 640px) {
  .captcha-row {
    grid-template-columns: 1fr;
  }
}
</style>
