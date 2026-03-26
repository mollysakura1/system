import type { Directive } from 'vue';
import { useUserStore } from '../store/modules/user';

export const permissionDirective: Directive<HTMLElement, string | string[]> = {
  mounted(el, binding) {
    const userStore = useUserStore();
    const required = Array.isArray(binding.value) ? binding.value : [binding.value];
    const hasPermission = required.some((item) => userStore.permissions.includes(item));
    if (!hasPermission) {
      el.parentNode?.removeChild(el);
    }
  }
};
