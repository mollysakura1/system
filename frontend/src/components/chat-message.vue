<template>
  <div class="chat-message" :class="message.role">
    <div class="message-shell">
      <div class="bubble page-card">
        <div class="meta">{{ displayName }}</div>
        <div class="markdown-body" v-html="html"></div>
        <div v-if="message.loading" class="loading-tip">{{ t('ai.generating') }}</div>
        <div v-if="message.error" class="error-tip">{{ t('ai.retryTip') }}</div>
      </div>

      <div v-if="message.role === 'user'" class="message-actions user-actions">
        <el-tooltip :content="appStore.language === 'en' ? 'Copy' : '复制'" placement="bottom">
          <el-button text circle class="icon-action" @click="handleCopy">
            <el-icon><CopyDocument /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip :content="appStore.language === 'en' ? 'Edit' : '编辑'" placement="bottom">
          <el-button text circle class="icon-action" @click="$emit('edit', message.content)">
            <el-icon><EditPen /></el-icon>
          </el-button>
        </el-tooltip>
      </div>

      <div v-if="showRegenerate" class="message-actions assistant-actions">
        <el-tooltip :content="appStore.language === 'en' ? 'Regenerate' : '重新生成'" placement="bottom">
          <el-button text circle class="icon-action" @click="$emit('regenerate', message.prompt || '')">
            <el-icon><RefreshRight /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ElMessage } from 'element-plus';
import { CopyDocument, EditPen, RefreshRight } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import type { ChatMessageItem } from '../types';
import { useAppStore } from '../store/modules/app';
import { useUserStore } from '../store/modules/user';

const props = defineProps<{ message: ChatMessageItem }>();

defineEmits<{
  edit: [content: string];
  regenerate: [prompt: string];
}>();

const { t } = useI18n();
const appStore = useAppStore();
const userStore = useUserStore();

const displayName = computed(() => {
  if (props.message.role === 'assistant') {
    return t('ai.assistant');
  }

  return userStore.profile?.name || userStore.profile?.username || t('ai.user');
});

const showRegenerate = computed(() => props.message.role === 'assistant' && !props.message.loading && Boolean(props.message.prompt));

const html = computed(() =>
  marked.parse(props.message.content || '', { async: false }).replace(
    /<pre><code class="language-(.*?)">([\s\S]*?)<\/code><\/pre>/g,
    (_, lang, code) => {
      const raw = code.replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>');
      const highlighted = hljs.highlight(raw, { language: hljs.getLanguage(lang) ? lang : 'plaintext' }).value;
      return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
    }
  )
);

async function handleCopy() {
  await navigator.clipboard.writeText(props.message.content || '');
  ElMessage.success(appStore.language === 'en' ? 'Copied' : '已复制');
}
</script>

<style scoped>
.chat-message {
  display: flex;
  margin-bottom: 16px;
}

.chat-message.user {
  justify-content: flex-end;
}

.message-shell {
  position: relative;
  max-width: 78%;
}

.bubble {
  padding: 16px 18px;
}

.meta {
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.loading-tip {
  font-size: 12px;
  color: var(--brand-primary);
  margin-top: 10px;
}

.error-tip {
  font-size: 12px;
  color: #ef4444;
  margin-top: 10px;
}

.message-actions {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.message-shell:hover .message-actions {
  opacity: 1;
}

.user-actions {
  right: 4px;
  bottom: -38px;
}

.assistant-actions {
  right: 4px;
  bottom: -38px;
}

.icon-action {
  width: 28px;
  height: 28px;
  color: var(--text-secondary);
}

.icon-action:hover {
  color: var(--text-primary);
  background: rgba(148, 163, 184, 0.1);
}
</style>
