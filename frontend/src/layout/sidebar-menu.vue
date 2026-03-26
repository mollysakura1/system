<template>
  <template v-for="menu in menus" :key="menu.id">
    <el-sub-menu v-if="menu.children?.length" :index="menu.path">
      <template #title>
        <span>{{ translateMenuTitle(menu.path, menu.title) }}</span>
      </template>
      <SidebarMenu :menus="menu.children" />
    </el-sub-menu>
    <el-menu-item v-else :index="menu.path">{{ translateMenuTitle(menu.path, menu.title) }}</el-menu-item>
  </template>
</template>

<script setup lang="ts">
import type { AppMenu } from '../types';
import { translateMenuTitle } from '../utils/i18n';

defineProps<{ menus: AppMenu[] }>();
</script>
