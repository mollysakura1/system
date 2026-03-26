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
          />
        </template>
        <el-empty v-else :description="t('ai.empty')" />
      </el-scrollbar>

      <div class="composer">
        <el-input
          v-model="inputValue"
          type="textarea"
          :rows="4"
          :placeholder="t('ai.placeholder')"
          @keydown.ctrl.enter.prevent="sendMessage"
        />
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
import type { ElScrollbar } from 'element-plus';
import StreamMessage from '../../components/stream-message.vue';
import { getAiPromptsApi } from '../../api/ai';
import { useChatStore } from '../../store/modules/chat';
import { TOKEN_KEY } from '../../config';
import { streamSse } from '../../utils/sse';

defineOptions({ name: 'AiAssistantPage' });

const { t } = useI18n();
const chatStore = useChatStore();
const prompts = ref<string[]>([]);
const inputValue = ref('');
const streaming = ref(false);
const abortController = ref<AbortController | null>(null);
const lastPrompt = ref('');
const scrollbarRef = ref<InstanceType<typeof ElScrollbar>>();

const activeSession = computed(() => chatStore.activeSession);
const canRetry = computed(() => Boolean(lastPrompt.value && activeSession.value));

function scrollToBottom() {
  nextTick(() => {
    scrollbarRef.value?.setScrollTop(999999);
  });
}

function formatTime(value: string) {
  return dayjs(value).format('MM-DD HH:mm');
}

function createNewSession() {
  stopGenerate();
  chatStore.createSession();
}

function removeSession(id: string) {
  stopGenerate();
  chatStore.removeSession(id);
  ElMessage.success(t('ai.sessionDeleted'));
}

function applyPrompt(prompt: string) {
  inputValue.value = prompt;
}

function stopGenerate() {
  abortController.value?.abort();
  abortController.value = null;
  streaming.value = false;
  if (activeSession.value?.messages.length) {
    const last = activeSession.value.messages.at(-1);
    if (last?.role === 'assistant' && last.loading) {
      chatStore.updateLastAssistantMessage(last.content || t('ai.stopped'), false, false);
    }
  }
}

async function runStream(prompt: string) {
  lastPrompt.value = prompt;
  const assistantId = crypto.randomUUID();

  chatStore.appendMessage({
    id: assistantId,
    role: 'assistant',
    content: '',
    loading: true,
    createdAt: new Date().toISOString(),
    prompt
  });

  scrollToBottom();

  const controller = new AbortController();
  abortController.value = controller;
  streaming.value = true;
  let content = '';

  try {
    await streamSse(`/api/ai/stream?prompt=${encodeURIComponent(prompt)}`, {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}`,
        Accept: 'text/event-stream'
      },
      onMessage(payload) {
        if (payload.type === 'chunk') {
          content += payload.content ?? '';
          chatStore.updateLastAssistantMessage(content, true, false);
          scrollToBottom();
        }

        if (payload.type === 'done') {
          chatStore.updateLastAssistantMessage(content, false, false);
          streaming.value = false;
          abortController.value = null;
          scrollToBottom();
        }
      }
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      chatStore.updateLastAssistantMessage(content || t('ai.stopped'), false, false);
    } else {
      chatStore.updateLastAssistantMessage(content || t('ai.failed'), false, true);
      ElMessage.error(t('ai.streamError'));
    }
    streaming.value = false;
    abortController.value = null;
  }
}

async function sendMessage() {
  const prompt = inputValue.value.trim();
  if (!prompt || streaming.value) return;

  chatStore.appendMessage({
    id: crypto.randomUUID(),
    role: 'user',
    content: prompt,
    createdAt: new Date().toISOString()
  });

  inputValue.value = '';
  scrollToBottom();
  await runStream(prompt);
}

async function regenerate() {
  if (!lastPrompt.value || streaming.value) return;
  await runStream(lastPrompt.value);
}

watch(
  () => activeSession.value?.messages.length,
  () => {
    scrollToBottom();
  }
);

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
.message-list { flex: 1; min-height: 320px; padding-right: 8px; }
.composer { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color); }
.composer-actions { margin-top: 12px; display: flex; align-items: center; justify-content: space-between; }
.hint { color: var(--text-secondary); font-size: 13px; }
@media (max-width: 1200px) {
  .assistant-layout { grid-template-columns: 1fr; }
}
</style>
