import { defineStore } from 'pinia';
import { getMessagesApi, readMessageApi } from '../../api/system';
import type { SiteMessage } from '../../types';

interface MessageState {
  list: SiteMessage[];
  unread: number;
  initialized: boolean;
}

export const useMessageStore = defineStore('message', {
  state: (): MessageState => ({
    list: [],
    unread: 0,
    initialized: false
  }),
  actions: {
    async fetchMessages(force = false) {
      if (this.initialized && !force) return;
      const { data } = await getMessagesApi();
      this.list = data.list;
      this.unread = data.unread;
      this.initialized = true;
    },
    async markAsRead(id: string) {
      await readMessageApi(id);
      await this.fetchMessages(true);
    },
    reset() {
      this.list = [];
      this.unread = 0;
      this.initialized = false;
    }
  }
});
