<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('menus.title') }}</h1>
        <div class="page-subtitle">{{ t('menus.subtitle') }}</div>
      </div>
      <el-button type="primary" @click="assignVisible = true">{{ t('menus.assign') }}</el-button>
    </div>

    <div class="page-card content-card">
      <el-tree
        :data="menus"
        node-key="id"
        default-expand-all
        :props="{ label: 'title', children: 'children' }"
      >
        <template #default="{ data }">
          <div class="tree-node">
            <div class="tree-node__info">
              <span>{{ translateMenuTitle(data.path, data.title) }}</span>
              <el-tag size="small">{{ data.path }}</el-tag>
            </div>
            <div class="tree-node__actions">
              <el-tag v-if="data.permissions?.length" size="small" type="success">
                {{ data.permissions.join(', ') }}
              </el-tag>
            </div>
          </div>
        </template>
      </el-tree>
    </div>

    <el-dialog v-model="assignVisible" :title="t('menus.assignTitle')" width="620px">
      <el-form label-width="90px">
        <el-form-item :label="t('menus.targetRole')">
          <el-select v-model="selectedRole" style="width: 100%">
            <el-option label="super-admin" value="super-admin" />
            <el-option label="operator" value="operator" />
            <el-option label="analyst" value="analyst" />
            <el-option label="merchant" value="merchant" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('menus.menuPermission')">
          <el-tree
            ref="treeRef"
            :data="menus"
            node-key="id"
            show-checkbox
            default-expand-all
            :props="{ label: 'title', children: 'children' }"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleAssign">{{ t('menus.saveAssign') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import type { ElTree } from 'element-plus';
import { useUserStore } from '../../store/modules/user';
import { translateMenuTitle } from '../../utils/i18n';

defineOptions({ name: 'MenusPage' });

const { t } = useI18n();
const userStore = useUserStore();
const assignVisible = ref(false);
const selectedRole = ref('operator');
const treeRef = ref<InstanceType<typeof ElTree>>();

const menus = computed(() => userStore.menus);

function handleAssign() {
  const checkedKeys = treeRef.value?.getCheckedKeys(false) ?? [];
  ElMessage.success(t('menus.assignSuccess', { role: selectedRole.value, count: checkedKeys.length }));
  assignVisible.value = false;
}
</script>

<style scoped>
.content-card { padding: 20px; }
.tree-node {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}
.tree-node__info,
.tree-node__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
