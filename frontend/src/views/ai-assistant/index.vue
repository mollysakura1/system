<template>
  <div class="assistant-layout">
    <div class="session-panel page-card">
      <div class="panel-header">
        <span>{{ t('ai.sessionList') }}</span>
        <el-button type="primary" text @click="createNewSession">{{ t('ai.newButton') }}</el-button>
      </div>
      <div
        v-for="session in chatStore.sessions"
        :key="session.id"
        class="session-item"
        :class="{ active: chatStore.activeSessionId === session.id }"
        @click="chatStore.setActiveSession(session.id)"
      >
        <div class="session-content">
          <div>{{ session.title || t('ai.newSession') }}</div>
          <small>{{ formatTime(session.updatedAt) }}</small>
        </div>
        <el-button text type="danger" @click.stop="removeSession(session.id)">{{ t('ai.deleteButton') }}</el-button>
      </div>
    </div>

    <div class="chat-panel page-card">
      <div class="panel-header">
        <span>{{ t('ai.title') }}</span>
        <div class="panel-actions">
          <el-button :disabled="!canRetry || streaming" @click="regenerate">{{ t('ai.regenerate') }}</el-button>
          <el-button :disabled="!streaming" @click="stopGenerate">{{ t('ai.stop') }}</el-button>
        </div>
      </div>

      <div class="prompt-list">
        <el-tag v-for="prompt in prompts" :key="prompt" @click="applyPrompt(prompt)">{{ prompt }}</el-tag>
      </div>

      <el-scrollbar ref="scrollbarRef" class="message-list">
        <template v-if="activeSession?.messages.length">
          <StreamMessage
            v-for="message in activeSession.messages"
            :key="message.id"
            :message="message"
            :loading="message.loading"
            @edit="handleEditMessage"
            @regenerate="handleRegenerateMessage"
          />
        </template>
        <el-empty v-else :description="t('ai.empty')" />
      </el-scrollbar>

      <div class="composer">
        <el-input
          ref="inputRef"
          v-model="inputValue"
          type="textarea"
          :rows="4"
          :placeholder="t('ai.placeholder')"
          @keydown.ctrl.enter.prevent="sendMessage"
        />
        <div class="context-toggle">
          <el-switch v-model="includeBusinessContext" :disabled="streaming" />
          <span>{{ contextLabel }}</span>
        </div>
        <div class="composer-actions">
          <span class="hint">{{ streaming ? t('ai.streamingHint') : t('ai.idleHint') }}</span>
          <el-button type="primary" :loading="streaming" @click="sendMessage">{{ t('ai.send') }}</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import type { ElInput, ElScrollbar } from 'element-plus';
import StreamMessage from '../../components/stream-message.vue';
import { getAiPromptsApi } from '../../api/ai';
import { API_BASE_URL } from '../../config/env';
import { useChatStore } from '../../store/modules/chat';
import { useUserStore } from '../../store/modules/user';
import { buildConversationWindow, type AiConversationMessage } from '../../utils/ai-context';
import { buildWriteSecurityHeaders } from '../../utils/security';
import { streamSse } from '../../utils/sse';

defineOptions({ name: 'AiAssistantPage' });

const { t, locale } = useI18n();
const chatStore = useChatStore();
const userStore = useUserStore();
const prompts = ref<string[]>([]);
const inputValue = ref('');
const streaming = ref(false);
const abortController = ref<AbortController | null>(null);
const includeBusinessContext = ref(localStorage.getItem('ai-ops-include-context') !== '0');
const lastRequest = ref({ prompt: '', includeContext: includeBusinessContext.value });
const scrollbarRef = ref<InstanceType<typeof ElScrollbar>>();
const inputRef = ref<InstanceType<typeof ElInput>>();
const STREAM_FLUSH_INTERVAL = 50;
const DEFAULT_CONTEXT_TURNS = 5;
const DEFAULT_CONTEXT_CHARS = 2400;
const BUSINESS_CONTEXT_TURNS = 3;
const BUSINESS_CONTEXT_CHARS = 1600;

let streamBuffer = '';
let streamFlushTimer: number | null = null;

const activeSession = computed(() => chatStore.activeSession);
const canRetry = computed(() => Boolean(lastRequest.value.prompt && activeSession.value));
const contextLabel = computed(() =>
  locale.value === 'en' ? 'Send business context to AI' : '发送运营上下文给 AI'
);

function scrollToBottom() {
  nextTick(() => {
    scrollbarRef.value?.setScrollTop(999999);
  });
}

function resetStreamBuffer() {
  streamBuffer = '';

  if (streamFlushTimer !== null) {
    window.clearTimeout(streamFlushTimer);
    streamFlushTimer = null;
  }
}

function flushAssistantBuffer(
  currentContent: string,
  nextContent: string,
  loading = true,
  error = false,
  renderMode: 'streaming' | 'final' = 'streaming'
) {
  const mergedContent = currentContent + streamBuffer;
  resetStreamBuffer();
  chatStore.updateLastAssistantMessage(mergedContent || nextContent, loading, error, renderMode);
  scrollToBottom();
  return mergedContent || nextContent;
}

function scheduleAssistantFlush(
  getCurrentContent: () => string,
  setCurrentContent: (nextContent: string) => void,
  fallbackContent = ''
) {
  if (streamFlushTimer !== null) return;

  streamFlushTimer = window.setTimeout(() => {
    setCurrentContent(flushAssistantBuffer(getCurrentContent(), fallbackContent, true, false, 'streaming'));
  }, STREAM_FLUSH_INTERVAL);
}

function formatTime(value: string) {
  return dayjs(value).format('MM-DD HH:mm');
}

async function createNewSession() {
  stopGenerate();
  await chatStore.createSession();
}

async function removeSession(id: string) {
  stopGenerate();
  await chatStore.removeSession(id);
  ElMessage.success(t('ai.sessionDeleted'));
}

function applyPrompt(prompt: string) {
  inputValue.value = prompt;
}

function getHistoryWindow() {
  return buildConversationWindow(activeSession.value?.messages ?? [], {
    maxTurns: includeBusinessContext.value ? BUSINESS_CONTEXT_TURNS : DEFAULT_CONTEXT_TURNS,
    maxContextChars: includeBusinessContext.value ? BUSINESS_CONTEXT_CHARS : DEFAULT_CONTEXT_CHARS
  });
}

function handleEditMessage(content: string) {
  inputValue.value = content;
  nextTick(() => inputRef.value?.focus());
  ElMessage.success(locale.value === 'en' ? 'Loaded into input box' : '已载入输入框，可继续编辑');
}

async function handleRegenerateMessage(prompt: string) {
  if (!prompt || streaming.value) return;
  await runStream(prompt, getHistoryWindow());
}

function stopGenerate() {
  abortController.value?.abort();
}

async function runStream(prompt: string, historyMessages: AiConversationMessage[] = []) {
  lastRequest.value = {
    prompt,
    includeContext: includeBusinessContext.value
  };
  const assistantId = crypto.randomUUID();
  resetStreamBuffer();

  void chatStore.appendMessage({
    id: assistantId,
    role: 'assistant',
    content: '',
    loading: true,
    renderMode: 'streaming',
    createdAt: new Date().toISOString(),
    prompt
  }, false);

  scrollToBottom();

  const controller = new AbortController();
  abortController.value = controller;
  streaming.value = true;
  let content = '';

  try {
    const securityHeaders = await buildWriteSecurityHeaders('/ai/stream', 'POST');

    await streamSse(`${API_BASE_URL}/ai/stream`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userStore.accessToken}`,
        ...securityHeaders
      },
      body: JSON.stringify({
        prompt,
        includeContext: includeBusinessContext.value,
        sessionId: activeSession.value?.id ?? '',
        messages: historyMessages
      }),
      onMessage(payload) {
        if (payload.type === 'chunk') {
          streamBuffer += payload.content ?? '';
          scheduleAssistantFlush(
            () => content,
            (nextContent) => {
              content = nextContent;
            },
            content
          );
        }

        if (payload.type === 'tools') {
          ElMessage.info(locale.value === 'en' ? 'Business data tools loaded' : '已检索业务数据工具上下文');
        }

        if (payload.type === 'done') {
          content = flushAssistantBuffer(content, content, false, false, 'final');
          void chatStore.updateLastAssistantMessage(content, false, false, 'final', true);
          streaming.value = false;
          abortController.value = null;
        }
      }
    });
  } catch (error) {
    content = flushAssistantBuffer(content, content, true, false, 'streaming');
    if ((error as Error).name === 'AbortError') {
      void chatStore.updateLastAssistantMessage(content || t('ai.stopped'), false, false, 'final', true);
    } else {
      void chatStore.updateLastAssistantMessage(content || t('ai.failed'), false, true, 'final', true);
      ElMessage.error(t('ai.streamError'));
    }
    streaming.value = false;
    abortController.value = null;
    resetStreamBuffer();
  }
}

async function sendMessage() {
  const prompt = inputValue.value.trim();
  if (!prompt || streaming.value) return;
  const historyMessages = getHistoryWindow();

  await chatStore.appendMessage({
    id: crypto.randomUUID(),
    role: 'user',
    content: prompt,
    createdAt: new Date().toISOString()
  });

  inputValue.value = '';
  scrollToBottom();
  await runStream(prompt, historyMessages);
}

async function regenerate() {
  if (!lastRequest.value.prompt || streaming.value) return;
  includeBusinessContext.value = lastRequest.value.includeContext;
  await runStream(lastRequest.value.prompt, getHistoryWindow());
}

watch(
  () => activeSession.value?.messages.length,
  () => {
    scrollToBottom();
  }
);

watch(includeBusinessContext, (value) => {
  localStorage.setItem('ai-ops-include-context', value ? '1' : '0');
});

onMounted(async () => {
  const { data } = await getAiPromptsApi();
  prompts.value = data;
  scrollToBottom();
});
</script>

<style scoped>
.assistant-layout { display: grid; grid-template-columns: 280px 1fr; gap: 16px; min-height: calc(100vh - 160px); }
.session-panel, .chat-panel { padding: 18px; display: flex; flex-direction: column; }
.panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; font-weight: 700; }
.panel-actions { display: flex; gap: 8px; }
.session-item {
  padding: 12px 14px;
  border-radius: 14px;
  cursor: pointer;
  margin-bottom: 10px;
  background: rgba(148, 163, 184, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.session-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.session-item.active { background: var(--brand-soft); color: var(--brand-primary); }
.prompt-list { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
.message-list { flex: 1; min-height: 320px; padding-right: 8px; padding-bottom: 32px; }
.composer { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color); }
.context-toggle {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-secondary);
  font-size: 13px;
}
.composer-actions { margin-top: 12px; display: flex; align-items: center; justify-content: space-between; }
.hint { color: var(--text-secondary); font-size: 13px; }
@media (max-width: 1200px) {
  .assistant-layout { grid-template-columns: 1fr; }
}
</style>
