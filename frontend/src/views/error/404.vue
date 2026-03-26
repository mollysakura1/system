<template>
  <div class="error-page page-card">
    <h1>404</h1>
    <p>{{ t('errors.notFound') }}</p>
    <el-button type="primary" @click="$router.push('/dashboard')">{{ t('common.returnHome') }}</el-button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<style scoped>
.error-page { min-height: 70vh; display: grid; place-items: center; text-align: center; }
h1 { font-size: 72px; margin: 0; }
</style>
