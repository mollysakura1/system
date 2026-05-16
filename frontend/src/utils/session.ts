import { ElMessage } from 'element-plus';
import router from '../router';
import { LAST_ACTIVE_AT_KEY, SESSION_IDLE_TIMEOUT } from '../config';
import { API_BASE_URL } from '../config/env';
import { useUserStore } from '../store/modules/user';

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = ['click', 'keydown', 'mousedown', 'mousemove', 'scroll', 'touchstart'];
const TOUCH_INTERVAL = 15 * 1000;

let started = false;
let idleTimer: number | null = null;
let lastSavedAt = 0;

function hasRuntimeSession() {
  return Boolean(useUserStore().accessToken);
}

function getLastActiveAt() {
  return Number(localStorage.getItem(LAST_ACTIVE_AT_KEY) ?? 0);
}

function clearIdleTimer() {
  if (idleTimer !== null) {
    window.clearTimeout(idleTimer);
    idleTimer = null;
  }
}

export function isSessionIdleExpired() {
  if (!hasRuntimeSession()) return false;
  const lastActiveAt = getLastActiveAt();
  return !lastActiveAt || Date.now() - lastActiveAt >= SESSION_IDLE_TIMEOUT;
}

export function clearSessionActivity() {
  clearIdleTimer();
  lastSavedAt = 0;
  localStorage.removeItem(LAST_ACTIVE_AT_KEY);
}

export function expireSession(showMessage = true) {
  const userStore = useUserStore();
  if (!userStore.accessToken) return;

  void fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include'
  }).catch(() => undefined);

  userStore.clearAuth();
  clearSessionActivity();

  if (showMessage) {
    ElMessage.warning('登录已过期，请重新登录');
  }

  if (router.currentRoute.value.path !== '/login') {
    router.replace('/login');
  }
}

function scheduleIdleTimer() {
  clearIdleTimer();
  if (!hasRuntimeSession()) return;

  const lastActiveAt = getLastActiveAt();
  const remaining = SESSION_IDLE_TIMEOUT - (Date.now() - lastActiveAt);

  if (remaining <= 0) {
    expireSession();
    return;
  }

  idleTimer = window.setTimeout(() => {
    expireSession();
  }, remaining);
}

export function touchSessionActivity(force = false) {
  if (!hasRuntimeSession()) return;

  const now = Date.now();
  if (force || now - lastSavedAt >= TOUCH_INTERVAL) {
    localStorage.setItem(LAST_ACTIVE_AT_KEY, String(now));
    lastSavedAt = now;
  }

  scheduleIdleTimer();
}

export function setupSessionActivityTracking() {
  if (started) {
    if (hasRuntimeSession()) {
      if (isSessionIdleExpired()) {
        expireSession(false);
      } else {
        scheduleIdleTimer();
      }
    }
    return;
  }

  started = true;

  const onActivity = () => {
    touchSessionActivity();
  };

  for (const eventName of ACTIVITY_EVENTS) {
    window.addEventListener(eventName, onActivity, { passive: true });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (isSessionIdleExpired()) {
        expireSession();
      } else {
        touchSessionActivity(true);
      }
    }
  });

  if (hasRuntimeSession()) {
    if (isSessionIdleExpired()) {
      expireSession(false);
    } else {
      scheduleIdleTimer();
    }
  }
}
