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
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { CopyDocument, EditPen, RefreshRight } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import type { ChatMessageItem } from '../types';
import { useAppStore } from '../store/modules/app';
import { useUserStore } from '../store/modules/user';

interface MarkdownRuntime {
  marked: typeof import('marked').marked;
  highlight: typeof import('highlight.js/lib/core').default;
}

const props = defineProps<{ message: ChatMessageItem }>();

defineEmits<{
  edit: [content: string];
  regenerate: [prompt: string];
}>();

const { t } = useI18n();
const appStore = useAppStore();
const userStore = useUserStore();
const html = ref('');

let markdownRuntimePromise: Promise<MarkdownRuntime> | null = null;

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderPlainText(value: string) {
  return escapeHtml(value).replaceAll('\n', '<br />');
}

async function getMarkdownRuntime(): Promise<MarkdownRuntime> {
  markdownRuntimePromise ??= Promise.all([
    import('marked'),
    import('highlight.js/lib/core'),
    import('highlight.js/lib/languages/javascript'),
    import('highlight.js/lib/languages/typescript'),
    import('highlight.js/lib/languages/json'),
    import('highlight.js/lib/languages/bash'),
    import('highlight.js/lib/languages/xml'),
    import('highlight.js/lib/languages/css'),
    import('highlight.js/lib/languages/plaintext'),
    import('highlight.js/styles/github-dark.css')
  ]).then(
    ([
      markedModule,
      highlightCoreModule,
      javascriptModule,
      typescriptModule,
      jsonModule,
      bashModule,
      xmlModule,
      cssModule,
      plaintextModule
    ]) => {
      const highlight = highlightCoreModule.default;

      highlight.registerLanguage('javascript', javascriptModule.default);
      highlight.registerLanguage('js', javascriptModule.default);
      highlight.registerLanguage('typescript', typescriptModule.default);
      highlight.registerLanguage('ts', typescriptModule.default);
      highlight.registerLanguage('json', jsonModule.default);
      highlight.registerLanguage('bash', bashModule.default);
      highlight.registerLanguage('shell', bashModule.default);
      highlight.registerLanguage('sh', bashModule.default);
      highlight.registerLanguage('html', xmlModule.default);
      highlight.registerLanguage('xml', xmlModule.default);
      highlight.registerLanguage('vue', xmlModule.default);
      highlight.registerLanguage('css', cssModule.default);
      highlight.registerLanguage('plaintext', plaintextModule.default);
      highlight.registerLanguage('text', plaintextModule.default);

      return {
        marked: markedModule.marked,
        highlight
      };
    }
  );

  return markdownRuntimePromise;
}

async function updateHtml(content: string, role: ChatMessageItem['role']) {
  if (!content) {
    html.value = '';
    return;
  }

  if (role === 'user') {
    html.value = renderPlainText(content);
    return;
  }

  const { marked, highlight } = await getMarkdownRuntime();
  const rendered = marked.parse(content, { async: false });
  html.value = rendered.replace(
    /<pre><code class="language-(.*?)">([\s\S]*?)<\/code><\/pre>/g,
    (_, lang, code) => {
      const raw = code.replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>');
      const highlighted = highlight.highlight(raw, {
        language: highlight.getLanguage(lang) ? lang : 'plaintext'
      }).value;
      return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
    }
  );
}

watch(
  () => [props.message.content, props.message.role] as const,
  async ([content, role]) => {
    await updateHtml(content || '', role);
  },
  { immediate: true }
);

const displayName = computed(() => {
  if (props.message.role === 'assistant') {
    return t('ai.assistant');
  }

  return userStore.profile?.name || userStore.profile?.username || t('ai.user');
});

const showRegenerate = computed(() => props.message.role === 'assistant' && !props.message.loading && Boolean(props.message.prompt));

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
