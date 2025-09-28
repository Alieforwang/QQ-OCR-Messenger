<template>
  <div class="contact-matcher-container">
    <div class="matcher-header">
      <h3 class="title">联系人匹配</h3>
      <div class="controls">
        <el-input
          v-model="searchQuery"
          placeholder="搜索联系人..."
          :prefix-icon="Search"
          clearable
          class="search-input"
          @input="handleSearch"
        />
        <el-dropdown @command="handleFilterCommand">
          <el-button :icon="Filter">
            筛选 <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="all">全部联系人</el-dropdown-item>
              <el-dropdown-item command="friends">仅好友</el-dropdown-item>
              <el-dropdown-item command="groups">仅群成员</el-dropdown-item>
              <el-dropdown-item command="high-score">高匹配度</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <div class="stats-bar">
      <div class="stats-item">
        <span class="label">匹配到:</span>
        <span class="value">{{ filteredContacts.length }} 个联系人</span>
      </div>
      <div class="stats-item">
        <span class="label">已选择:</span>
        <span class="value">{{ selectedContacts.length }} 个</span>
      </div>
      <div class="actions">
        <el-button
          size="small"
          @click="selectAll"
          :disabled="filteredContacts.length === 0"
        >
          全选
        </el-button>
        <el-button
          size="small"
          @click="clearSelection"
          :disabled="selectedContacts.length === 0"
        >
          清空
        </el-button>
      </div>
    </div>

    <div v-if="filteredContacts.length === 0" class="empty-state">
      <el-empty description="没有找到匹配的联系人">
        <el-button type="primary" @click="$emit('rematch')">
          重新匹配
        </el-button>
      </el-empty>
    </div>

    <div v-else class="contacts-list">
      <div
        v-for="contact in paginatedContacts"
        :key="`${contact.contact.user_id}_${contact.type}_${contact.group_id || ''}`"
        class="contact-item"
        :class="{
          'selected': isSelected(contact),
          'high-score': contact.score > 0.8,
          'medium-score': contact.score > 0.6 && contact.score <= 0.8
        }"
        @click="toggleSelection(contact)"
      >
        <div class="contact-checkbox">
          <el-checkbox
            :model-value="isSelected(contact)"
            @change="toggleSelection(contact)"
            @click.stop
          />
        </div>

        <div class="contact-avatar">
          <el-avatar
            :size="40"
            :src="contact.contact.avatar"
            :icon="contact.type === 'friend' ? User : UserFilled"
          />
        </div>

        <div class="contact-info">
          <div class="contact-main">
            <span class="contact-name">
              {{ getDisplayName(contact) }}
            </span>
            <el-tag
              :type="getScoreTagType(contact.score)"
              size="small"
              class="score-tag"
            >
              {{ Math.round(contact.score * 100) }}%
            </el-tag>
          </div>

          <div class="contact-details">
            <span class="contact-id">ID: {{ contact.contact.user_id }}</span>
            <el-tag
              size="small"
              :type="contact.type === 'friend' ? 'success' : 'info'"
              class="type-tag"
            >
              {{ contact.type === 'friend' ? '好友' : '群成员' }}
            </el-tag>
            <span v-if="contact.group_name" class="group-info">
              {{ contact.group_name }}
            </span>
          </div>

          <div v-if="contact.contact.remark || contact.contact.card" class="contact-extra">
            <span v-if="contact.contact.remark" class="remark">
              备注: {{ contact.contact.remark }}
            </span>
            <span v-if="contact.contact.card" class="card">
              群名片: {{ contact.contact.card }}
            </span>
          </div>
        </div>

        <div class="contact-actions">
          <el-button
            size="small"
            type="primary"
            text
            :icon="ChatDotRound"
            @click.stop="previewMessage(contact)"
          >
            预览
          </el-button>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="filteredContacts.length"
        layout="prev, pager, next, sizes, total"
        :page-sizes="[10, 20, 50, 100]"
        @size-change="handleSizeChange"
      />
    </div>

    <!-- 操作按钮 -->
    <div class="actions-bar">
      <el-button @click="$emit('back')" :icon="ArrowLeft">
        返回上一步
      </el-button>
      <el-button
        type="primary"
        @click="$emit('proceed', selectedContacts)"
        :disabled="selectedContacts.length === 0"
        :icon="ArrowRight"
      >
        继续发送消息 ({{ selectedContacts.length }})
      </el-button>
    </div>

    <!-- 消息预览对话框 -->
    <el-dialog
      v-model="previewDialogVisible"
      title="消息预览"
      width="500px"
    >
      <div v-if="previewContact" class="preview-content">
        <div class="preview-contact">
          <el-avatar
            :size="50"
            :src="previewContact.contact.avatar"
            :icon="previewContact.type === 'friend' ? User : UserFilled"
          />
          <div class="preview-info">
            <div class="preview-name">{{ getDisplayName(previewContact) }}</div>
            <div class="preview-type">
              {{ previewContact.type === 'friend' ? '私聊' : '群聊' }}
              <span v-if="previewContact.group_name">
                - {{ previewContact.group_name }}
              </span>
            </div>
          </div>
        </div>
        <div class="preview-message">
          <div class="message-label">消息内容:</div>
          <div class="message-preview">
            <span v-if="previewContact.type === 'group_member'" class="at-tag">
              @{{ getDisplayName(previewContact) }}
            </span>
            <span class="message-text">{{ messagePreview || '(消息内容为空)' }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="previewDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  Search,
  Filter,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  User,
  UserFilled,
  ChatDotRound
} from '@element-plus/icons-vue'

const props = defineProps({
  matchedContacts: {
    type: Array,
    default: () => []
  },
  selectedContacts: {
    type: Array,
    default: () => []
  },
  messageContent: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:selectedContacts', 'back', 'proceed', 'rematch'])

// 响应式数据
const searchQuery = ref('')
const filterType = ref('all')
const currentPage = ref(1)
const pageSize = ref(20)
const previewDialogVisible = ref(false)
const previewContact = ref(null)

// 计算属性
const filteredContacts = computed(() => {
  let contacts = props.matchedContacts

  // 按类型筛选
  if (filterType.value === 'friends') {
    contacts = contacts.filter(c => c.type === 'friend')
  } else if (filterType.value === 'groups') {
    contacts = contacts.filter(c => c.type === 'group_member')
  } else if (filterType.value === 'high-score') {
    contacts = contacts.filter(c => c.score > 0.8)
  }

  // 搜索筛选
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    contacts = contacts.filter(contact => {
      const name = getDisplayName(contact).toLowerCase()
      const id = contact.contact.user_id.toLowerCase()
      const remark = (contact.contact.remark || '').toLowerCase()
      const card = (contact.contact.card || '').toLowerCase()
      const groupName = (contact.group_name || '').toLowerCase()

      return name.includes(query) ||
             id.includes(query) ||
             remark.includes(query) ||
             card.includes(query) ||
             groupName.includes(query)
    })
  }

  return contacts
})

const totalPages = computed(() => {
  return Math.ceil(filteredContacts.value.length / pageSize.value)
})

const paginatedContacts = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredContacts.value.slice(start, end)
})

const messagePreview = computed(() => {
  return props.messageContent || '暂无消息内容'
})

// 方法
const getDisplayName = (contact) => {
  return contact.contact.remark ||
         contact.contact.card ||
         contact.contact.nickname ||
         `用户${contact.contact.user_id}`
}

const getScoreTagType = (score) => {
  if (score > 0.8) return 'success'
  if (score > 0.6) return 'warning'
  return 'info'
}

const isSelected = (contact) => {
  return props.selectedContacts.some(selected =>
    selected.contact.user_id === contact.contact.user_id &&
    selected.type === contact.type &&
    selected.group_id === contact.group_id
  )
}

const toggleSelection = (contact) => {
  const newSelection = [...props.selectedContacts]
  const index = newSelection.findIndex(selected =>
    selected.contact.user_id === contact.contact.user_id &&
    selected.type === contact.type &&
    selected.group_id === contact.group_id
  )

  if (index >= 0) {
    newSelection.splice(index, 1)
  } else {
    newSelection.push(contact)
  }

  emit('update:selectedContacts', newSelection)
}

const selectAll = () => {
  emit('update:selectedContacts', [...filteredContacts.value])
}

const clearSelection = () => {
  emit('update:selectedContacts', [])
}

const handleSearch = () => {
  currentPage.value = 1
}

const handleFilterCommand = (command) => {
  filterType.value = command
  currentPage.value = 1
}

const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
}

const previewMessage = (contact) => {
  previewContact.value = contact
  previewDialogVisible.value = true
}

// 监听筛选变化，重置页码
watch([searchQuery, filterType], () => {
  currentPage.value = 1
})
</script>

<style scoped>
.contact-matcher-container {
  width: 100%;
}

.matcher-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 16px;
  flex-wrap: wrap;
}

.title {
  margin: 0;
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 600;
}

.controls {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.search-input {
  width: 250px;
}

.stats-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--gray-light);
  border-radius: 6px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.stats-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stats-item .label {
  color: var(--text-secondary);
  font-size: 14px;
}

.stats-item .value {
  color: var(--text-primary);
  font-weight: 500;
}

.stats-bar .actions {
  display: flex;
  gap: 8px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.contacts-list {
  space-y: 12px;
}

.contact-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: var(--white);
  border: 1px solid var(--gray-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 12px;
}

.contact-item:hover {
  border-color: var(--primary-blue);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}

.contact-item.selected {
  border-color: var(--primary-blue);
  background-color: var(--light-blue);
}

.contact-item.high-score {
  border-left: 4px solid #67c23a;
}

.contact-item.medium-score {
  border-left: 4px solid #e6a23c;
}

.contact-checkbox {
  margin-right: 12px;
}

.contact-avatar {
  margin-right: 12px;
}

.contact-info {
  flex: 1;
  min-width: 0;
}

.contact-main {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.contact-name {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
}

.score-tag {
  font-weight: 600;
}

.contact-details {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.contact-id {
  font-size: 12px;
  color: var(--text-secondary);
  font-family: monospace;
}

.type-tag {
  font-size: 11px;
}

.group-info {
  font-size: 12px;
  color: var(--text-secondary);
}

.contact-extra {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.remark,
.card {
  font-size: 12px;
  color: var(--text-secondary);
}

.contact-actions {
  margin-left: 12px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin: 24px 0;
}

.actions-bar {
  display: flex;
  justify-content: space-between;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--gray-border);
  gap: 12px;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.preview-contact {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: var(--gray-light);
  border-radius: 8px;
}

.preview-info {
  flex: 1;
}

.preview-name {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.preview-type {
  font-size: 14px;
  color: var(--text-secondary);
}

.message-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-regular);
  margin-bottom: 8px;
}

.message-preview {
  padding: 12px;
  background-color: var(--gray-light);
  border-radius: 6px;
  border-left: 3px solid var(--primary-blue);
}

.at-tag {
  color: var(--primary-blue);
  font-weight: 500;
  margin-right: 6px;
}

.message-text {
  color: var(--text-primary);
}

@media (max-width: 768px) {
  .matcher-header {
    flex-direction: column;
    align-items: stretch;
  }

  .controls {
    justify-content: space-between;
  }

  .search-input {
    width: 100%;
    margin-bottom: 8px;
  }

  .stats-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .stats-bar .actions {
    justify-content: center;
  }

  .contact-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .contact-main {
    width: 100%;
  }

  .contact-details {
    width: 100%;
  }

  .actions-bar {
    flex-direction: column;
  }

  .actions-bar .el-button {
    width: 100%;
  }
}
</style>