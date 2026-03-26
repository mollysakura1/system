import { ref } from 'vue';

export function useDebounce<T>(fn: (value?: T) => void, delay = 300) {
  const timer = ref<number>();

  return (value?: T) => {
    window.clearTimeout(timer.value);
    timer.value = window.setTimeout(() => fn(value), delay);
  };
}
