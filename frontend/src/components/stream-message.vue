<template>
  <div class="stream-message">
    <div v-if="showThinking" class="thinking-card page-card">
      <div class="thinking-header">AI 助手</div>
      <div class="thinking-label">
        <span class="thinking-text">正在思考中</span>
      </div>
    </div>
    <ChatMessage
      v-else
      :message="message"
      @edit="$emit('edit', $event)"
      @regenerate="$emit('regenerate', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ChatMessage from './chat-message.vue';
import type { ChatMessageItem } from '../types';

const props = defineProps<{
  message: ChatMessageItem;
  loading?: boolean;
}>();

defineEmits<{
  edit: [content: string];
  regenerate: [prompt: string];
}>();

const showThinking = computed(() => Boolean(props.loading && !props.message.content.trim()));
</script>

<style scoped>
.thinking-card {
  max-width: 78%;
  padding: 16px 18px;
}

.thinking-header {
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.thinking-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
}

.thinking-text {
  display: inline-block;
  color: var(--el-color-primary);
  letter-spacing: 0.04em;
  animation: thinking-pulse 1.35s ease-in-out infinite;
}

html.dark .thinking-text {
  color: #7dd3fc;
}

@keyframes thinking-pulse {
  0% {
    opacity: 0.35;
    filter: blur(0.3px);
  }

  50% {
    opacity: 0.95;
    filter: blur(0);
    text-shadow: 0 0 12px rgba(59, 130, 246, 0.16);
  }

  100% {
    opacity: 0.35;
    filter: blur(0.3px);
  }
}
</style>
