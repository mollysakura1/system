import { defineStore } from 'pinia';

interface AppState {
  sidebarCollapsed: boolean;
  darkMode: boolean;
  language: 'zh' | 'en';
  keepAliveViews: string[];
  visitedTabs: Array<{ title: string; path: string }>;
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    sidebarCollapsed: false,
    darkMode: localStorage.getItem('ai-ops-theme') === 'dark',
    language: (localStorage.getItem('ai-ops-lang') as 'zh' | 'en') ?? 'zh',
    keepAliveViews: ['DashboardPage', 'AiAssistantPage'],
    visitedTabs: []
  }),
  actions: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    },
    toggleDarkMode() {
      this.darkMode = !this.darkMode;
      document.documentElement.classList.toggle('dark', this.darkMode);
      localStorage.setItem('ai-ops-theme', this.darkMode ? 'dark' : 'light');
    },
    setLanguage(language: 'zh' | 'en') {
      this.language = language;
      localStorage.setItem('ai-ops-lang', language);
    },
    addVisitedTab(tab: { title: string; path: string }) {
      if (!this.visitedTabs.find((item) => item.path === tab.path)) {
        this.visitedTabs.push(tab);
      }
    },
    clearVisitedTabs() {
      this.visitedTabs = [];
    },
    removeVisitedTab(path: string) {
      this.visitedTabs = this.visitedTabs.filter((item) => item.path !== path);
    }
  }
});
