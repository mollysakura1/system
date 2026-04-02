import { defineStore } from 'pinia';
import { CHAT_ACCOUNT_KEY, CHAT_CACHE_KEY } from '../../config';
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

function normalizeSessions(sessions: ChatSession[]) {
  return sessions.map((session) => ({
    ...session,
    messages: session.messages.map((message) => ({
      ...message,
      loading: false
    }))
  }));
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
    loadForAccount(accountId: string) {
      const sessions = getStorage<ChatSession[]>(getScopedChatKey(accountId), []);
      const initial = sessions.length ? normalizeSessions(sessions) : createInitialState(accountId).sessions;
      this.sessions = initial;
      this.activeSessionId = initial[0].id;
      this.accountId = accountId;
      localStorage.setItem(CHAT_ACCOUNT_KEY, accountId);
      this.persist();
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
    createSession() {
      const session = createSession();
      this.sessions.unshift(session);
      this.activeSessionId = session.id;
      this.persist();
    },
    removeSession(id: string) {
      this.sessions = this.sessions.filter((item) => item.id !== id);

      if (!this.sessions.length) {
        const fallback = createSession();
        this.sessions = [fallback];
        this.activeSessionId = fallback.id;
      } else if (this.activeSessionId === id) {
        this.activeSessionId = this.sessions[0].id;
      }

      this.persist();
    },
    setActiveSession(id: string) {
      this.activeSessionId = id;
    },
    appendMessage(message: ChatMessageItem) {
      const session = this.activeSession;
      if (!session) return;
      session.messages.push(message);
      session.title = session.messages[0]?.content.slice(0, 18) || '';
      session.updatedAt = new Date().toISOString();
      this.persist();
    },
    updateLastAssistantMessage(content: string, loading = true, error = false) {
      const session = this.activeSession;
      if (!session) return;
      const message = [...session.messages].reverse().find((item) => item.role === 'assistant');
      if (!message) return;
      message.content = content;
      message.loading = loading;
      message.error = error;
      session.updatedAt = new Date().toISOString();
      this.persist();
    }
  }
});
