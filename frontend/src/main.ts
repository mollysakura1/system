import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import App from './App.vue';
import router from './router';
import { setupDirectives } from './directives';
import i18n from './locales';
import './styles/index.css';
import { setupSessionActivityTracking } from './utils/session';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(ElementPlus);
app.use(i18n);
setupDirectives(app);
setupSessionActivityTracking();

app.mount('#app');
