<template>
  <div class="stream-message">
    <el-skeleton :loading="loading" animated>
      <template #template>
        <el-skeleton-item variant="text" style="width: 60%" />
        <el-skeleton-item variant="text" style="width: 92%" />
        <el-skeleton-item variant="text" style="width: 80%" />
      </template>
      <template #default>
        <ChatMessage :message="message" />
      </template>
    </el-skeleton>
  </div>
</template>

<script setup lang="ts">
import ChatMessage from './chat-message.vue';
import type { ChatMessageItem } from '../types';

defineProps<{
  message: ChatMessageItem;
  loading?: boolean;
}>();
</script>
