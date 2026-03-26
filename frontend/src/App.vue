<template>
  <RouterView v-slot="{ Component, route }">
    <Transition name="fade-transform" mode="out-in">
      <KeepAlive :include="keepAliveNames">
        <component :is="Component" :key="route.fullPath" />
      </KeepAlive>
    </Transition>
  </RouterView>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterView } from 'vue-router';
import { useAppStore } from './store/modules/app';

const appStore = useAppStore();
const keepAliveNames = computed(() => appStore.keepAliveViews);
</script>
