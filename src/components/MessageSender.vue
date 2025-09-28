<template>
  <div class="message-sender-container">
    <div class="sender-header">
      <h3 class="title">发送消息</h3>
      <div class="recipient-count">
        将发送给 <strong>{{ selectedContacts.length }}</strong> 个联系人
      </div>
    </div>

    <!-- 接收者列表 -->
    <div class="recipients-section">
      <h4 class="section-title">
        <el-icon><UserFilled /></el-icon>
        接收者列表
      </h4>

      <div class="recipients-tabs">
        <el-tabs v-model="activeTab" type="card">
          <el-tab-pane label="全部" name="all">
            <div class="recipients-grid">
              <div
                v-for="contact in selectedContacts"
                :key="`${contact.contact.user_id}_${contact.type}_${contact.group_id || ''}`"
                class="recipient-item"
              >
                <el-avatar
                  :size="32"
                  :src="contact.contact.avatar"
                  :icon="contact.type === 'friend' ? User : UserFilled"
                />
                <div class="recipient-info">
                  <div class="recipient-name">{{ getDisplayName(contact) }}</div>
                  <div class="recipient-type">
                    <el-tag
                      size="small"
                      :type="contact.type === 'friend' ? 'success' : 'info'"
                    >
                      {{ contact.type === 'friend' ? '私聊' : '群聊' }}
                    </el-tag>
                    <span v-if="contact.group_name" class="group-name">
                      {{ contact.group_name }}
                    </span>
                  </div>
                </div>
                <el-button
                  size="small"
                  type="danger"
                  text
                  :icon="Delete"
                  @click="removeRecipient(contact)"
                />
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="好友" name="friends">
            <div class="recipients-grid">
              <div
                v-for="contact in friendContacts"
                :key="contact.contact.user_id"
                class="recipient-item"
              >
                <el-avatar
                  :size="32"
                  :src="contact.contact.avatar"
                  :icon="User"
                />
                <div class="recipient-info">
                  <div class="recipient-name">{{ getDisplayName(contact) }}</div>
                  <div class="recipient-type">
                    <el-tag size="small" type="success">私聊</el-tag>
                  </div>
                </div>
                <el-button
                  size="small"
                  type="danger"
                  text
                  :icon="Delete"
                  @click="removeRecipient(contact)"
                />
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="群聊" name="groups">
            <!-- 群消息选项 -->
            <div class="group-options">
              <el-radio-group v-model="groupMessageMode" @change="handleGroupModeChange">
                <el-radio value="at" label="at">@指定成员</el-radio>
                <el-radio value="normal" label="normal">普通群消息</el-radio>
              </el-radio-group>
              <el-text type="info" size="small">
                {{ groupMessageMode === 'at' ? '将@选中的群成员' : '发送普通群消息，不@任何人' }}
              </el-text>
            </div>

            <!-- @成员模式：显示选中的群成员 -->
            <div v-if="groupMessageMode === 'at'" class="group-recipients">
              <div
                v-for="(members, groupId) in groupedContacts"
                :key="groupId"
                class="group-section"
              >
                <div class="group-header">
                  <h5 class="group-name">{{ members[0].group_name }}</h5>
                  <el-tag size="small" type="info">
                    {{ members.length }} 人
                  </el-tag>
                </div>
                <div class="group-members">
                  <div
                    v-for="contact in members"
                    :key="contact.contact.user_id"
                    class="group-member"
                  >
                    <el-avatar
                      :size="24"
                      :src="contact.contact.avatar"
                      :icon="UserFilled"
                    />
                    <span class="member-name">{{ getDisplayName(contact) }}</span>
                    <el-button
                      size="small"
                      type="danger"
                      text
                      :icon="Delete"
                      @click="removeRecipient(contact)"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- 普通群消息模式：显示可选的群列表 -->
            <div v-else class="group-list">
              <el-text type="info" class="group-hint">
                选择要发送消息的群：
              </el-text>
              <div class="available-groups">
                <div
                  v-for="group in availableGroups"
                  :key="group.group_id"
                  class="group-item"
                  :class="{ selected: isGroupSelected(group.group_id) }"
                  @click="toggleGroup(group)"
                >
                  <el-avatar
                    :size="32"
                    :icon="UserFilled"
                  />
                  <div class="group-info">
                    <div class="group-name">{{ group.group_name }}</div>
                    <div class="group-stats">{{ group.member_count }} 人</div>
                  </div>
                  <el-checkbox
                    :model-value="isGroupSelected(group.group_id)"
                    @change="toggleGroup(group)"
                  />
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <!-- 消息编辑 -->
    <div class="message-section">
      <h4 class="section-title">
        <el-icon><ChatDotRound /></el-icon>
        消息内容
      </h4>

      <el-input
        :model-value="messageContent"
        @update:model-value="$emit('update:messageContent', $event)"
        type="textarea"
        :rows="4"
        placeholder="请输入要发送的消息内容..."
        maxlength="500"
        show-word-limit
        class="message-input"
      />

      <div class="message-tips">
        <el-alert
          title="发送提示"
          type="info"
          :closable="false"
          show-icon
        >
          <template #default>
            <ul class="tips-list">
              <li>群聊消息会自动添加 @用户 标签</li>
              <li>私聊消息直接发送给好友</li>
              <li>发送后无法撤回，请确认消息内容</li>
            </ul>
          </template>
        </el-alert>
      </div>
    </div>

    <!-- 消息预览 -->
    <div class="preview-section">
      <h4 class="section-title">
        <el-icon><View /></el-icon>
        消息预览
      </h4>

      <div class="preview-tabs">
        <el-tabs type="border-card">
          <el-tab-pane label="私聊预览" v-if="friendContacts.length > 0">
            <div class="preview-item">
              <div class="preview-header">
                <el-avatar :size="30" :icon="User" />
                <span class="preview-title">私聊消息</span>
              </div>
              <div class="preview-content">
                {{ messageContent || '(消息内容为空)' }}
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="群聊预览" v-if="groupContacts.length > 0">
            <div class="preview-item">
              <div class="preview-header">
                <el-avatar :size="30" :icon="UserFilled" />
                <span class="preview-title">群聊消息</span>
              </div>
              <div class="preview-content">
                <span class="at-mentions">
                  <span
                    v-for="contact in groupContacts.slice(0, 3)"
                    :key="contact.contact.user_id"
                    class="at-tag"
                  >
                    @{{ getDisplayName(contact) }}
                  </span>
                  <span v-if="groupContacts.length > 3" class="more-mentions">
                    ...等{{ groupContacts.length }}人
                  </span>
                </span>
                <span class="message-text">{{ messageContent || '(消息内容为空)' }}</span>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <!-- 发送选项 -->
    <div class="send-options">
      <div class="options-row">
        <el-checkbox v-model="sendImmediately">
          立即发送
        </el-checkbox>
        <el-checkbox v-model="confirmBeforeSend" :disabled="!sendImmediately">
          发送前确认每条消息
        </el-checkbox>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="actions-bar">
      <el-button @click="$emit('back')" :icon="ArrowLeft">
        返回上一步
      </el-button>
      <el-button
        type="primary"
        @click="handleSend"
        :disabled="!canSend"
        :loading="isSending"
        :icon="Position"
      >
        {{ isSending ? '发送中...' : `发送消息 (${selectedContacts.length})` }}
      </el-button>
    </div>

    <!-- 发送结果对话框 -->
    <el-dialog
      v-model="resultDialogVisible"
      title="发送结果"
      width="600px"
      :close-on-click-modal="false"
    >
      <div v-if="sendResults" class="send-results">
        <div class="results-summary">
          <el-alert
            :title="`发送完成: 成功 ${sendResults.success} 条，失败 ${sendResults.failure} 条`"
            :type="sendResults.failure === 0 ? 'success' : 'warning'"
            :closable="false"
            show-icon
          />
        </div>

        <div class="results-details">
          <el-collapse v-model="activeResultTab">
            <el-collapse-item
              v-if="successResults.length > 0"
              title="发送成功"
              name="success"
            >
              <div class="result-list">
                <div
                  v-for="(result, index) in successResults"
                  :key="index"
                  class="result-item success"
                >
                  <el-icon class="result-icon" color="#67c23a"><SuccessFilled /></el-icon>
                  <div class="result-info">
                    <div class="result-target">
                      {{ getResultTargetName(result.message) }}
                    </div>
                    <div class="result-type">
                      {{ result.message.type === 'private' ? '私聊' : '群聊' }}
                    </div>
                  </div>
                </div>
              </div>
            </el-collapse-item>

            <el-collapse-item
              v-if="failureResults.length > 0"
              title="发送失败"
              name="failure"
            >
              <div class="result-list">
                <div
                  v-for="(result, index) in failureResults"
                  :key="index"
                  class="result-item failure"
                >
                  <el-icon class="result-icon" color="#f56c6c"><CircleCloseFilled /></el-icon>
                  <div class="result-info">
                    <div class="result-target">
                      {{ getResultTargetName(result.message) }}
                    </div>
                    <div class="result-error">{{ result.error }}</div>
                  </div>
                </div>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>

      <template #footer>
        <el-button @click="handleResultClose">关闭</el-button>
        <el-button
          v-if="sendResults && sendResults.failure > 0"
          type="warning"
          @click="retryFailedMessages"
        >
          重试失败的消息
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  UserFilled,
  User,
  Delete,
  ChatDotRound,
  View,
  ArrowLeft,
  Position,
  SuccessFilled,
  CircleCloseFilled
} from '@element-plus/icons-vue'

const props = defineProps({
  selectedContacts: {
    type: Array,
    default: () => []
  },
  messageContent: {
    type: String,
    default: ''
  },
  isSending: {
    type: Boolean,
    default: false
  },
  groups: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'update:selectedContacts',
  'update:messageContent',
  'back',
  'send'
])

// 响应式数据
const activeTab = ref('all')
const sendImmediately = ref(true)
const groupMessageMode = ref('at') // 'at' 或 'normal'
const selectedGroups = ref([]) // 普通群消息模式下选中的群
const confirmBeforeSend = ref(false)
const resultDialogVisible = ref(false)
const sendResults = ref(null)
const activeResultTab = ref(['success', 'failure'])

// 计算属性
const friendContacts = computed(() => {
  return props.selectedContacts.filter(c => c.type === 'friend')
})

const groupContacts = computed(() => {
  return props.selectedContacts.filter(c => c.type === 'group_member')
})

const groupedContacts = computed(() => {
  const groups = {}
  groupContacts.value.forEach(contact => {
    const groupId = contact.group_id
    if (!groups[groupId]) {
      groups[groupId] = []
    }
    groups[groupId].push(contact)
  })
  return groups
})

const canSend = computed(() => {
  if (groupMessageMode.value === 'normal') {
    // 普通群消息模式：需要选择群和消息内容
    return selectedGroups.value.length > 0 &&
           props.messageContent.trim().length > 0 &&
           !props.isSending
  } else {
    // @成员模式：需要选择联系人和消息内容
    return props.selectedContacts.length > 0 &&
           props.messageContent.trim().length > 0 &&
           !props.isSending
  }
})

// 获取可用的群列表（用于普通群消息模式）
const availableGroups = computed(() => {
  return props.groups || []
})

const successResults = computed(() => {
  return sendResults.value?.results?.filter(r => r.success) || []
})

const failureResults = computed(() => {
  return sendResults.value?.results?.filter(r => !r.success) || []
})

// 方法
const getDisplayName = (contact) => {
  return contact.contact.remark ||
         contact.contact.card ||
         contact.contact.nickname ||
         `用户${contact.contact.user_id}`
}

const removeRecipient = (contactToRemove) => {
  const newSelection = props.selectedContacts.filter(contact =>
    !(contact.contact.user_id === contactToRemove.contact.user_id &&
      contact.type === contactToRemove.type &&
      contact.group_id === contactToRemove.group_id)
  )
  emit('update:selectedContacts', newSelection)
  ElMessage.success('已移除联系人')
}

// 群消息模式切换
const handleGroupModeChange = (mode) => {
  if (mode === 'normal') {
    // 切换到普通群消息模式，清空选中的群成员
    selectedGroups.value = []
  } else {
    // 切换到@成员模式，清空选中的群
    selectedGroups.value = []
  }
}

// 检查群是否被选中
const isGroupSelected = (groupId) => {
  return selectedGroups.value.some(g => g.group_id === groupId)
}

// 切换群选择状态
const toggleGroup = (group) => {
  const index = selectedGroups.value.findIndex(g => g.group_id === group.group_id)
  if (index > -1) {
    selectedGroups.value.splice(index, 1)
  } else {
    selectedGroups.value.push(group)
  }
}

const getResultTargetName = (message) => {
  const contact = props.selectedContacts.find(c =>
    c.contact.user_id === message.target_id ||
    c.group_id === message.target_id
  )

  if (contact) {
    return message.type === 'group' ?
      contact.group_name :
      getDisplayName(contact)
  }

  return message.target_id
}

const handleSend = async () => {
  if (!canSend.value) {
    ElMessage.warning('请检查接收者和消息内容')
    return
  }

  if (confirmBeforeSend.value) {
    try {
      await ElMessageBox.confirm(
        `确定要向 ${props.selectedContacts.length} 个联系人发送消息吗？`,
        '确认发送',
        {
          confirmButtonText: '确定发送',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    } catch {
      return
    }
  }

  try {
    const result = await emit('send')
    showSendResults(result)
  } catch (error) {
    ElMessage.error(`发送失败: ${error.message}`)
  }
}

const showSendResults = (results) => {
  sendResults.value = results
  resultDialogVisible.value = true

  if (results.failure === 0) {
    ElMessage.success('所有消息发送成功！')
  } else if (results.success === 0) {
    ElMessage.error('所有消息发送失败！')
  } else {
    ElMessage.warning(`部分消息发送失败，成功 ${results.success} 条，失败 ${results.failure} 条`)
  }
}

const handleResultClose = () => {
  resultDialogVisible.value = false
  if (sendResults.value?.failure === 0) {
    // 全部发送成功，可以重置状态或跳转
    emit('success')
  }
}

const retryFailedMessages = () => {
  // 重试失败的消息
  const failedTargets = failureResults.value.map(r => r.message.target_id)
  const retryContacts = props.selectedContacts.filter(contact =>
    failedTargets.includes(contact.contact.user_id) ||
    failedTargets.includes(contact.group_id)
  )

  emit('update:selectedContacts', retryContacts)
  resultDialogVisible.value = false
  ElMessage.info('已准备重试失败的消息')
}

// 暴露方法
defineExpose({
  showSendResults
})
</script>

<style scoped>
.message-sender-container {
  width: 100%;
}

.sender-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}

.title {
  margin: 0;
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 600;
}

.recipient-count {
  color: var(--text-secondary);
  font-size: 14px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--text-regular);
}

.recipients-section {
  margin-bottom: 32px;
}

.recipients-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.recipient-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: var(--white);
  border: 1px solid var(--gray-border);
  border-radius: 6px;
  gap: 12px;
}

.recipient-info {
  flex: 1;
  min-width: 0;
}

.recipient-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
  truncate: true;
}

.recipient-type {
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-name {
  font-size: 12px;
  color: var(--text-secondary);
}

.group-recipients {
  space-y: 16px;
}

.group-section {
  background: var(--gray-light);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.group-name {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.group-members {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
}

.group-member {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  background: var(--white);
  border-radius: 4px;
}

.member-name {
  flex: 1;
  font-size: 12px;
  color: var(--text-primary);
  min-width: 0;
  truncate: true;
}

.message-section {
  margin-bottom: 32px;
}

.message-input {
  margin-bottom: 16px;
}

.message-tips {
  margin-top: 12px;
}

.tips-list {
  margin: 0;
  padding-left: 20px;
  color: var(--text-secondary);
}

.tips-list li {
  margin-bottom: 4px;
}

.preview-section {
  margin-bottom: 32px;
}

.preview-item {
  padding: 16px;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.preview-title {
  font-weight: 500;
  color: var(--text-regular);
}

.preview-content {
  padding: 12px;
  background-color: var(--gray-light);
  border-radius: 6px;
  border-left: 3px solid var(--primary-blue);
}

.at-mentions {
  display: block;
  margin-bottom: 8px;
}

.at-tag {
  color: var(--primary-blue);
  font-weight: 500;
  margin-right: 8px;
}

.more-mentions {
  color: var(--text-secondary);
  font-size: 12px;
}

.message-text {
  color: var(--text-primary);
}

.send-options {
  margin-bottom: 32px;
  padding: 16px;
  background-color: var(--gray-light);
  border-radius: 6px;
}

.options-row {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.actions-bar {
  display: flex;
  justify-content: space-between;
  padding-top: 20px;
  border-top: 1px solid var(--gray-border);
  gap: 12px;
}

.send-results {
  max-height: 400px;
  overflow-y: auto;
}

.results-summary {
  margin-bottom: 20px;
}

.result-list {
  space-y: 8px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.result-item.success {
  background-color: rgba(103, 194, 58, 0.1);
}

.result-item.failure {
  background-color: rgba(245, 108, 108, 0.1);
}

.result-info {
  flex: 1;
}

.result-target {
  font-weight: 500;
  color: var(--text-primary);
}

.result-type {
  font-size: 12px;
  color: var(--text-secondary);
}

.result-error {
  font-size: 12px;
  color: #f56c6c;
}

@media (max-width: 768px) {
  .sender-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .recipients-grid {
    grid-template-columns: 1fr;
  }

  .group-members {
    grid-template-columns: 1fr;
  }

  .options-row {
    flex-direction: column;
    gap: 12px;
  }

  .actions-bar {
    flex-direction: column;
  }

  .actions-bar .el-button {
    width: 100%;
  }
}

/* 群选择相关样式 */
.group-options {
  padding: 16px;
  background: var(--gray-50);
  border-radius: 8px;
  margin-bottom: 16px;
}

.group-options .el-radio-group {
  margin-bottom: 8px;
}

.group-list {
  padding: 16px;
}

.group-hint {
  display: block;
  margin-bottom: 12px;
  font-size: 14px;
}

.available-groups {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.group-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 2px solid var(--gray-200);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--white);
}

.group-item:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.15);
}

.group-item.selected {
  border-color: var(--primary-color);
  background: var(--primary-light);
}

.group-info {
  flex: 1;
  min-width: 0;
}

.group-info .group-name {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-info .group-stats {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>