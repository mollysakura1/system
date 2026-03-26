<template>
  <div class="login-shell">
    <div class="login-toolbar">
      <el-select :model-value="appStore.language" style="width: 110px" @change="changeLanguage">
        <el-option :label="t('common.languageChinese')" value="zh" />
        <el-option :label="t('common.languageEnglish')" value="en" />
      </el-select>
    </div>
    <div class="login-panel page-card">
      <div class="hero">
        <div class="hero-badge">{{ t('login.heroBadge') }}</div>
        <h1>{{ t('login.title') }}</h1>
        <p>{{ t('login.description') }}</p>
        <ul>
          <li>{{ t('login.feature1') }}</li>
          <li>{{ t('login.feature2') }}</li>
          <li>{{ t('login.feature3') }}</li>
        </ul>
      </div>
      <div class="form-wrap">
        <h2>{{ t('login.welcome') }}</h2>
        <p>{{ t('login.demoAccount') }}</p>
        <div class="register-entry">
          <span>{{ appStore.language === 'en' ? "Don't have an account?" : '还没有账号？' }}</span>
          <el-link type="primary" @click="router.push('/register')">{{ appStore.language === 'en' ? 'Register now' : '立即注册' }}</el-link>
        </div>
        <el-form :model="form" @submit.prevent="handleLogin">
          <el-form-item>
            <el-input v-model="form.username" :placeholder="t('login.usernamePlaceholder')" size="large" />
          </el-form-item>
          <el-form-item>
            <el-input v-model="form.password" type="password" :placeholder="t('login.passwordPlaceholder')" size="large" show-password />
          </el-form-item>
          <el-form-item>
            <div class="captcha-row">
              <el-input v-model="form.captchaCode" :placeholder="captchaPlaceholder" size="large" maxlength="4" />
              <button type="button" class="captcha-box" :disabled="captchaLoading" @click="loadCaptcha">
                <img v-if="captchaImage" :src="captchaImage" :alt="captchaAlt" />
                <span v-else>{{ captchaLoading ? loadingCaptchaText : refreshCaptchaText }}</span>
              </button>
            </div>
          </el-form-item>
          <div class="captcha-tip">{{ captchaTip }}</div>
          <el-form-item>
            <el-button type="primary" size="large" style="width: 100%" :loading="loading" @click="handleLogin">
              {{ t('login.submit') }}
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { getCaptchaApi } from '../../api/auth';
import { useAppStore } from '../../store/modules/app';
import { useUserStore } from '../../store/modules/user';

const router = useRouter();
const appStore = useAppStore();
const userStore = useUserStore();
const { t, locale } = useI18n();
const loading = ref(false);
const captchaLoading = ref(false);
const captchaImage = ref('');
const form = reactive({
  username: 'admin',
  password: '123456',
  captchaId: '',
  captchaCode: ''
});

const captchaPlaceholder = computed(() => (appStore.language === 'en' ? 'Enter captcha' : '请输入验证码'));
const captchaAlt = computed(() => (appStore.language === 'en' ? 'Captcha' : '图形验证码'));
const captchaTip = computed(() =>
  appStore.language === 'en' ? 'Click the image to refresh the captcha' : '点击图片可刷新验证码'
);
const refreshCaptchaText = computed(() => (appStore.language === 'en' ? 'Refresh' : '刷新验证码'));
const loadingCaptchaText = computed(() => (appStore.language === 'en' ? 'Loading...' : '加载中...'));

function changeLanguage(value: 'zh' | 'en') {
  appStore.setLanguage(value);
  locale.value = value;
}

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

async function handleLogin() {
  if (!form.captchaCode.trim() || !form.captchaId) {
    ElMessage.warning(appStore.language === 'en' ? 'Please enter the captcha' : '请输入验证码');
    await loadCaptcha();
    return;
  }

  loading.value = true;
  try {
    await userStore.loginAction(form);
    userStore.dynamicRoutesReady = false;
    await router.replace('/dashboard');
    ElMessage.success(t('login.success'));
  } catch {
    await loadCaptcha();
  } finally {
    loading.value = false;
  }
}

onMounted(loadCaptcha);
</script>

<style scoped>
.login-shell { min-height: 100vh; display: grid; place-items: center; padding: 24px; position: relative; }
.login-toolbar {
  position: absolute;
  top: 24px;
  right: 24px;
}
.login-panel { width: min(1120px, 100%); padding: 24px; display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 24px; }
.hero { padding: 30px; border-radius: 24px; color: white; background: linear-gradient(140deg, #0f766e, #164e63 62%, #0f172a); }
.hero-badge { display: inline-flex; padding: 8px 12px; border-radius: 999px; background: rgba(255,255,255,0.16); margin-bottom: 18px; }
.hero h1 { margin: 0 0 16px; font-size: 40px; }
.hero p { margin: 0 0 20px; line-height: 1.7; }
.hero ul { margin: 0; padding-left: 18px; line-height: 1.9; }
.form-wrap { padding: 30px 24px; display: flex; flex-direction: column; justify-content: center; }
.form-wrap h2 { margin: 0 0 10px; font-size: 28px; }
.form-wrap p { margin: 0 0 24px; color: var(--text-secondary); }
.register-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: -8px 0 20px;
  color: var(--text-secondary);
  font-size: 13px;
}
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
@media (max-width: 900px) {
  .login-panel { grid-template-columns: 1fr; }
  .login-toolbar {
    top: 16px;
    right: 16px;
  }
  .captcha-row {
    grid-template-columns: 1fr;
  }
}
</style>
