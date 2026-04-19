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

interface MarkedRuntime {
  marked: typeof import('marked').marked;
}

interface HighlightRuntime {
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

let markedRuntimePromise: Promise<MarkedRuntime> | null = null;
let highlightRuntimePromise: Promise<HighlightRuntime> | null = null;
let renderToken = 0;

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

function countTableColumns(line: string) {
  return line
    .split('|')
    .map((segment) => segment.trim())
    .filter(Boolean).length;
}

function looksLikeTableSeparator(line: string) {
  const normalized = line.trim();
  return normalized.startsWith('|') && /^(\|\s*:?-{3,}:?\s*)+\|?$/.test(normalized);
}

function downgradeIncompleteTables(value: string) {
  const lines = value.split('\n');

  for (let index = 0; index < lines.length - 1; index += 1) {
    const header = lines[index]?.trim();
    const separator = lines[index + 1]?.trim();

    if (!header?.startsWith('|') || !looksLikeTableSeparator(separator)) continue;

    let rowIndex = index + 2;
    while (rowIndex < lines.length && lines[rowIndex].trim().startsWith('|')) {
      rowIndex += 1;
    }

    const lastTableRow = rowIndex - 1;
    const expectedColumns = countTableColumns(header);
    const shouldDowngrade =
      rowIndex === lines.length && lastTableRow >= index + 2 && countTableColumns(lines[lastTableRow]) < expectedColumns;

    if (!shouldDowngrade) continue;

    for (let current = index; current < rowIndex; current += 1) {
      lines[current] = escapeHtml(lines[current]);
    }
  }

  return lines.join('\n');
}

function patchStreamingMarkdown(value: string) {
  let patched = downgradeIncompleteTables(value);

  const fenceCount = (patched.match(/```/g) || []).length;
  if (fenceCount % 2 !== 0) {
    patched += '\n```';
  }

  const inlineCodeCount = (patched.replaceAll('```', '').match(/`/g) || []).length;
  if (inlineCodeCount % 2 !== 0) {
    patched += '`';
  }

  const strongCount = (patched.match(/\*\*/g) || []).length;
  if (strongCount % 2 !== 0) {
    patched += '**';
  }

  return patched;
}

async function getMarkedRuntime(): Promise<MarkedRuntime> {
  markedRuntimePromise ??= import('marked').then((markedModule) => ({
    marked: markedModule.marked
  }));

  return markedRuntimePromise;
}

async function getHighlightRuntime(): Promise<HighlightRuntime> {
  highlightRuntimePromise ??= Promise.all([
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

      return { highlight };
    }
  );

  return highlightRuntimePromise;
}

async function updateHtml(content: string, role: ChatMessageItem['role'], renderMode: ChatMessageItem['renderMode']) {
  const currentToken = ++renderToken;

  if (!content) {
    if (currentToken === renderToken) {
      html.value = '';
    }
    return;
  }

  if (role === 'user') {
    if (currentToken === renderToken) {
      html.value = renderPlainText(content);
    }
    return;
  }

  const { marked } = await getMarkedRuntime();

  if (renderMode === 'streaming') {
    const rendered = marked.parse(patchStreamingMarkdown(content), {
      async: false,
      breaks: true
    });

    if (currentToken === renderToken) {
      html.value = rendered;
    }

    return;
  }

  const { highlight } = await getHighlightRuntime();
  const rendered = marked.parse(content, {
    async: false,
    breaks: true
  });
  const highlightedHtml = rendered.replace(
    /<pre><code class="language-(.*?)">([\s\S]*?)<\/code><\/pre>/g,
    (_, lang, code) => {
      const raw = code.replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>');
      const highlighted = highlight.highlight(raw, {
        language: highlight.getLanguage(lang) ? lang : 'plaintext'
      }).value;
      return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
    }
  );

  if (currentToken === renderToken) {
    html.value = highlightedHtml;
  }
}

watch(
  () => [props.message.content, props.message.role, props.message.renderMode] as const,
  async ([content, role, renderMode]) => {
    await updateHtml(content || '', role, renderMode);
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
