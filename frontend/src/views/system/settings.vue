<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('settings.title') }}</h1>
        <div class="page-subtitle">{{ t('settings.subtitle') }}</div>
      </div>
    </div>

    <div class="settings-grid">
      <div class="page-card setting-card">
        <h3>{{ t('settings.themeTitle') }}</h3>
        <p>{{ t('settings.themeDesc') }}</p>
        <el-switch :model-value="appStore.darkMode" :active-text="t('settings.darkMode')" @change="appStore.toggleDarkMode" />
      </div>

      <div class="page-card setting-card">
        <h3>{{ t('settings.languageTitle') }}</h3>
        <p>{{ t('settings.languageDesc') }}</p>
        <el-radio-group v-model="language" @change="handleLanguageChange">
          <el-radio-button label="zh">{{ t('common.languageChinese') }}</el-radio-button>
          <el-radio-button label="en">{{ t('common.languageEnglish') }}</el-radio-button>
        </el-radio-group>
        <div class="preview-box">
          <div>{{ t('appName') }}</div>
          <small>{{ t('logout') }}</small>
        </div>
      </div>

      <div class="page-card setting-card">
        <h3>{{ t('settings.noticeTitle') }}</h3>
        <p>{{ t('settings.noticeDesc') }}</p>
        <el-checkbox v-model="notifications.sms">{{ t('settings.smsNotice') }}</el-checkbox>
        <el-checkbox v-model="notifications.daily">{{ t('settings.dailyNotice') }}</el-checkbox>
        <el-button type="primary" text @click="saveNotifications">{{ t('settings.saveConfig') }}</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '../../store/modules/app';

defineOptions({ name: 'SettingsPage' });

const appStore = useAppStore();
const { locale, t } = useI18n();
const language = ref<'zh' | 'en'>(appStore.language);
const notifications = reactive({
  sms: true,
  daily: true
});

function handleLanguageChange(value: string | number | boolean | undefined) {
  if (value !== 'zh' && value !== 'en') return;
  appStore.setLanguage(value);
  locale.value = value;
  ElMessage.success(value === 'zh' ? t('common.switchedToChinese') : t('common.switchedToEnglish'));
}

function saveNotifications() {
  ElMessage.success(t('settings.noticeSaved'));
}
</script>

<style scoped>
.settings-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.setting-card { padding: 24px; min-height: 220px; display: flex; flex-direction: column; gap: 14px; }
.setting-card p { margin: 0; color: var(--text-secondary); }
.preview-box {
  padding: 14px;
  border-radius: 14px;
  background: rgba(148, 163, 184, 0.08);
  color: var(--text-secondary);
}
@media (max-width: 1200px) {
  .settings-grid { grid-template-columns: 1fr; }
}
</style>
