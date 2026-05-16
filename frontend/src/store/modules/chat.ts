import { defineStore } from 'pinia';
import { CHAT_ACCOUNT_KEY, CHAT_CACHE_KEY } from '../../config';
import { createAiSessionApi, deleteAiSessionApi, getAiSessionsApi, saveAiMessageApi } from '../../api/ai';
import type { ChatMessageItem, ChatSession } from '../../types';
import { getStorage, setStorage } from '../../utils/storage';

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string;
  accountId: string;
}

function createSession(): ChatSession {
  return {
    id: crypto.randomUUID(),
    title: '',
    updatedAt: new Date().toISOString(),
    messages: []
  };
}

function createInitialState(accountId = ''): Pick<ChatState, 'sessions' | 'activeSessionId' | 'accountId'> {
  const session = createSession();
  return {
    sessions: [session],
    activeSessionId: session.id,
    accountId
  };
}

function getScopedChatKey(accountId: string) {
  return `${CHAT_CACHE_KEY}:${accountId || 'guest'}`;
}

function normalizeSessions(sessions: ChatSession[]): ChatSession[] {
  return sessions.map((session) => ({
    ...session,
    messages: session.messages.map((message) => ({
      ...message,
      loading: false,
      renderMode: 'final' as const
    }))
  }));
}

function normalizeRemoteSessions(sessions: ChatSession[]) {
  const normalized = normalizeSessions(sessions);
  return normalized.length ? normalized : createInitialState().sessions;
}

export const useChatStore = defineStore('chat', {
  state: (): ChatState => ({
    ...createInitialState(localStorage.getItem(CHAT_ACCOUNT_KEY) ?? '')
  }),
  getters: {
    activeSession(state) {
      return state.sessions.find((item) => item.id === state.activeSessionId) ?? state.sessions[0];
    }
  },
  actions: {
    async loadForAccount(accountId: string) {
      const sessions = getStorage<ChatSession[]>(getScopedChatKey(accountId), []);
      const initial = sessions.length ? normalizeSessions(sessions) : createInitialState(accountId).sessions;
      this.sessions = initial;
      this.activeSessionId = initial[0].id;
      this.accountId = accountId;
      localStorage.setItem(CHAT_ACCOUNT_KEY, accountId);
      this.persist();

      try {
        const { data } = await getAiSessionsApi();
        this.sessions = normalizeRemoteSessions(data.list);
        this.activeSessionId = this.sessions[0].id;
        this.persist();
      } catch {
        // Keep local cache as a fast fallback when the backend is temporarily unavailable.
      }
    },
    resetRuntime() {
      const next = createInitialState('');
      this.sessions = next.sessions;
      this.activeSessionId = next.activeSessionId;
      this.accountId = '';
      localStorage.removeItem(CHAT_ACCOUNT_KEY);
    },
    persist() {
      if (!this.accountId) return;
      setStorage(getScopedChatKey(this.accountId), this.sessions);
    },
    async createSession() {
      const session = createSession();
      this.sessions.unshift(session);
      this.activeSessionId = session.id;
      this.persist();
      try {
        await createAiSessionApi(session);
      } catch {
        // Local cache keeps the draft session until the next successful backend load.
      }
    },
    async removeSession(id: string) {
      this.sessions = this.sessions.filter((item) => item.id !== id);

      if (!this.sessions.length) {
        const fallback = createSession();
        this.sessions = [fallback];
        this.activeSessionId = fallback.id;
      } else if (this.activeSessionId === id) {
        this.activeSessionId = this.sessions[0].id;
      }

      this.persist();
      try {
        await deleteAiSessionApi(id);
      } catch {
        // The local removal keeps the UI responsive; backend remains authoritative on reload.
      }
    },
    setActiveSession(id: string) {
      this.activeSessionId = id;
    },
    async appendMessage(message: ChatMessageItem, sync = true) {
      const session = this.activeSession;
      if (!session) return;
      const wasEmpty = session.messages.length === 0;
      session.messages.push(message);
      session.title = session.messages[0]?.content.slice(0, 18) || '';
      session.updatedAt = new Date().toISOString();
      this.persist();
      if (!sync) return;

      try {
        if (wasEmpty) {
          await createAiSessionApi(session);
        }
        const { data } = await saveAiMessageApi(session.id, message);
        const index = this.sessions.findIndex((item) => item.id === session.id);
        if (index >= 0) {
          this.sessions[index] = normalizeSessions([data])[0];
          this.persist();
        }
      } catch {
        // The message remains in local cache and can still be used as a fallback.
      }
    },
    async updateLastAssistantMessage(
      content: string,
      loading = true,
      error = false,
      renderMode: ChatMessageItem['renderMode'] = 'final',
      sync = false
    ) {
      const session = this.activeSession;
      if (!session) return;
      const message = [...session.messages].reverse().find((item) => item.role === 'assistant');
      if (!message) return;
      message.content = content;
      message.loading = loading;
      message.error = error;
      message.renderMode = renderMode;
      session.updatedAt = new Date().toISOString();
      this.persist();
      if (!sync) return;

      try {
        const { data } = await saveAiMessageApi(session.id, message);
        const index = this.sessions.findIndex((item) => item.id === session.id);
        if (index >= 0) {
          this.sessions[index] = normalizeSessions([data])[0];
          this.persist();
        }
      } catch {
        // Final assistant content is kept locally if persistence fails.
      }
    }
  }
});
