<template>
  <div class="layout-shell">
    <aside class="sidebar" :class="{ collapsed: appStore.sidebarCollapsed }">
      <div class="brand">
        <div class="brand-logo">AI</div>
        <div v-if="!appStore.sidebarCollapsed">
          <div class="brand-title">{{ t('appName') }}</div>
          <div class="brand-subtitle">SaaS Operation Console</div>
        </div>
      </div>
      <el-scrollbar class="menu-scroll">
        <el-menu
          :default-active="route.path"
          :collapse="appStore.sidebarCollapsed"
          background-color="transparent"
          text-color="var(--text-secondary)"
          active-text-color="var(--brand-primary)"
          router
        >
          <SidebarMenu :menus="userStore.menus" />
        </el-menu>
      </el-scrollbar>
    </aside>

    <section class="main">
      <header class="header page-card">
        <div class="header-left">
          <el-button text @click="appStore.toggleSidebar">
            <el-icon><Fold /></el-icon>
          </el-button>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.path">
              {{ translateRouteTitle(item.path, String(item.meta.title ?? '')) }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-badge :value="messageStore.unread" :hidden="messageStore.unread === 0" class="message-badge">
            <el-button circle @click="openMessages">
              <el-icon><Message /></el-icon>
            </el-button>
          </el-badge>
          <el-switch
            :model-value="appStore.darkMode"
            inline-prompt
            :active-text="t('layout.dark')"
            :inactive-text="t('layout.light')"
            @change="appStore.toggleDarkMode"
          />
          <el-select :model-value="appStore.language" style="width: 110px" @change="changeLanguage">
            <el-option :label="t('common.languageChinese')" value="zh" />
            <el-option :label="t('common.languageEnglish')" value="en" />
          </el-select>
          <el-dropdown>
            <div class="user-box">
              <el-avatar :src="userStore.profile?.avatar" />
              <div>
                <div>{{ userStore.profile?.name }}</div>
                <small>{{ userStore.profile?.role }}</small>
              </div>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="router.push('/profile-settings')">{{ profileText }}</el-dropdown-item>
                <el-dropdown-item @click="router.push('/system/settings')">{{ t('layout.systemSettings') }}</el-dropdown-item>
                <el-dropdown-item @click="handleLogout">{{ t('logout') }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <div class="tabs page-card">
        <el-tag
          v-for="item in appStore.visitedTabs"
          :key="item.path"
          class="tab-item"
          closable
          :disable-transitions="true"
          :effect="route.path === item.path ? 'dark' : 'plain'"
          @click="router.push(item.path)"
          @close="closeTab(item.path)"
        >
          {{ translateRouteTitle(item.path, item.title) }}
        </el-tag>
      </div>

      <main class="content">
        <RouterView />
      </main>
    </section>

    <el-drawer v-model="messageVisible" :title="messageTitle" size="420px">
      <div class="message-list">
        <div v-for="item in messageStore.list" :key="item.id" class="message-item" :class="{ unread: !item.read }">
          <div class="message-top">
            <div class="message-name">{{ item.title }}</div>
            <small>{{ item.createdAt }}</small>
          </div>
          <div class="message-content">{{ item.content }}</div>
          <div class="message-actions">
            <el-button v-if="!item.read" text type="primary" @click="markRead(item.id)">{{ markReadText }}</el-button>
          </div>
        </div>
        <el-empty v-if="!messageStore.list.length" :description="emptyMessageText" />
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Fold, Message } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { RouterView, useRoute, useRouter } from 'vue-router';
import SidebarMenu from './sidebar-menu.vue';
import { useAppStore } from '../store/modules/app';
import { useMessageStore } from '../store/modules/message';
import { useUserStore } from '../store/modules/user';
import { translateRouteTitle } from '../utils/i18n';

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const appStore = useAppStore();
const userStore = useUserStore();
const messageStore = useMessageStore();
const messageVisible = ref(false);
const breadcrumbs = computed(() => route.matched.filter((item) => item.meta?.title));
const isEn = computed(() => appStore.language === 'en');
const profileText = computed(() => (isEn.value ? 'Profile Settings' : '个人设置'));
const messageTitle = computed(() => (isEn.value ? 'Inbox' : '站内信'));
const markReadText = computed(() => (isEn.value ? 'Mark as read' : '标记已读'));
const emptyMessageText = computed(() => (isEn.value ? 'No messages yet' : '暂无站内信'));

function changeLanguage(value: 'zh' | 'en') {
  appStore.setLanguage(value);
  locale.value = value;
}

async function openMessages() {
  await messageStore.fetchMessages(true);
  messageVisible.value = true;
}

async function markRead(id: string) {
  await messageStore.markAsRead(id);
  ElMessage.success(isEn.value ? 'Marked as read' : '已标记为已读');
}

function handleLogout() {
  appStore.clearVisitedTabs();
  userStore.clearAuth();
  router.replace('/login');
}

function closeTab(path: string) {
  const currentIndex = appStore.visitedTabs.findIndex((item) => item.path === path);
  const isCurrent = route.path === path;
  appStore.removeVisitedTab(path);

  if (!isCurrent) return;

  const fallback = appStore.visitedTabs[currentIndex - 1] ?? appStore.visitedTabs[currentIndex] ?? { path: '/dashboard' };
  router.push(fallback.path);
}

onMounted(async () => {
  if (userStore.accessToken) {
    await messageStore.fetchMessages(true);
  }
});
</script>

<style scoped>
.layout-shell { display: flex; min-height: 100vh; padding: 14px; gap: 14px; }
.sidebar { width: 252px; padding: 18px 12px; border-radius: 28px; background: var(--bg-panel); border: 1px solid var(--border-color); transition: width 0.25s ease; }
.sidebar.collapsed { width: 88px; }
.brand { display: flex; align-items: center; gap: 12px; padding: 6px 8px 18px; }
.brand-logo { width: 44px; height: 44px; border-radius: 14px; background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary)); color: #fff; display: grid; place-items: center; font-weight: 700; }
.brand-title { font-size: 15px; font-weight: 700; }
.brand-subtitle { font-size: 12px; color: var(--text-secondary); }
.menu-scroll { height: calc(100vh - 110px); }
.main { flex: 1; display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.header { min-height: 72px; padding: 0 20px; display: flex; align-items: center; justify-content: space-between; }
.header-left, .header-right { display: flex; align-items: center; gap: 12px; }
.user-box { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.tabs { padding: 12px 16px; display: flex; gap: 10px; overflow-x: auto; }
.tab-item { cursor: pointer; }
.message-badge { display: inline-flex; }
.message-list { display: flex; flex-direction: column; gap: 12px; }
.message-item { padding: 14px; border-radius: 14px; background: rgba(148, 163, 184, 0.08); }
.message-item.unread { border: 1px solid rgba(220, 38, 38, 0.24); }
.message-top { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
.message-name { font-weight: 700; }
.message-content { color: var(--text-secondary); line-height: 1.6; }
.message-actions { margin-top: 8px; display: flex; justify-content: flex-end; }
@media (max-width: 1200px) {
  .layout-shell { padding: 8px; }
}
</style>
