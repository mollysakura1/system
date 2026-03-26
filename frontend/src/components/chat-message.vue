<template>
  <div class="chat-message" :class="message.role">
    <div class="bubble page-card">
      <div class="meta">{{ message.role === 'user' ? t('ai.user') : t('ai.assistant') }}</div>
      <div class="markdown-body" v-html="html"></div>
      <div v-if="message.loading" class="loading-tip">{{ t('ai.generating') }}</div>
      <div v-if="message.error" class="error-tip">{{ t('ai.retryTip') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import type { ChatMessageItem } from '../types';

const props = defineProps<{ message: ChatMessageItem }>();
const { t } = useI18n();

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
</script>

<style scoped>
.chat-message { display: flex; margin-bottom: 16px; }
.chat-message.user { justify-content: flex-end; }
.bubble { max-width: 78%; padding: 16px 18px; }
.meta { margin-bottom: 8px; font-size: 12px; color: var(--text-secondary); }
.loading-tip { font-size: 12px; color: var(--brand-primary); margin-top: 10px; }
.error-tip { font-size: 12px; color: #ef4444; margin-top: 10px; }
</style>
