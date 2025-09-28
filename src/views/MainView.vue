<template>
  <div class="main-view">
    <!-- 应用头部 -->
    <header class="app-header">
      <div class="container">
        <div class="header-content">
          <div class="logo-section">
            <h1 class="app-title">
              <el-icon class="app-icon"><ChatDotSquare /></el-icon>
              QQ OCR Messenger
            </h1>
            <p class="app-subtitle">智能截图识别 + QQ消息发送</p>
          </div>

          <div class="header-actions">
            <el-button
              type="info"
              text
              :icon="Setting"
              @click="showSettings = true"
            >
              设置
            </el-button>
            <el-button
              type="success"
              text
              :icon="Connection"
              @click="testServices"
            >
              测试连接
            </el-button>
          </div>
        </div>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <main class="app-main">
      <div class="container">
        <!-- 步骤指示器 -->
        <div class="step-indicator">
          <div
            v-for="(stepInfo, stepNum) in steps"
            :key="stepNum"
            class="step"
            :class="{
              'active': currentStep === stepNum,
              'completed': currentStep > stepNum
            }"
          >
            <div class="step-number">
              <el-icon v-if="currentStep > stepNum" class="step-icon">
                <Check />
              </el-icon>
              <span v-else>{{ stepNum }}</span>
            </div>
            <div class="step-label">{{ stepInfo.name }}</div>
          </div>
        </div>

        <!-- 内容卡片 -->
        <div class="content-card card">
          <!-- 加载覆盖层 -->
          <div v-if="loading" class="loading-overlay">
            <div class="loading-content">
              <el-icon class="loading-icon" size="48">
                <Loading />
              </el-icon>
              <p class="loading-text">{{ loadingText }}</p>
            </div>
          </div>

          <!-- 步骤1: 图片上传 -->
          <div v-if="currentStep === 1" class="step-content">
            <ImageUpload
              @file-selected="handleFileSelected"
              @file-cleared="handleFileCleared"
            />
            <div v-if="uploadedImage" class="step-actions">
              <el-button
                type="primary"
                @click="performOCR"
                :loading="loading"
                :icon="DocumentCopy"
              >
                开始OCR识别
              </el-button>
            </div>
          </div>

          <!-- 步骤2: OCR结果 -->
          <div v-if="currentStep === 2" class="step-content">
            <OCRResults
              :ocr-results="ocrResults"
              :extracted-names="extractedNames"
              :is-processing="loading"
              @retry="goToStep(1)"
              @proceed="proceedToMatching"
            />
          </div>

          <!-- 步骤3: 联系人匹配 -->
          <div v-if="currentStep === 3" class="step-content">
            <ContactMatcher
              :matched-contacts="matchedContacts"
              v-model:selected-contacts="selectedContacts"
              :message-content="messageContent"
              @back="goToStep(2)"
              @proceed="proceedToSending"
              @rematch="performMatching"
            />
          </div>

          <!-- 步骤4: 消息发送 -->
          <div v-if="currentStep === 4" class="step-content">
            <MessageSender
              v-model:selected-contacts="selectedContacts"
              v-model:message-content="messageContent"
              :is-sending="loading"
              :groups="groups"
              @back="goToStep(3)"
              @send="sendMessages"
              @success="handleSendSuccess"
            />
          </div>
        </div>

        <!-- 快捷操作 -->
        <div class="quick-actions">
          <el-button
            v-if="currentStep > 1"
            @click="resetApp"
            :icon="RefreshRight"
          >
            重新开始
          </el-button>
          <el-button
            type="info"
            text
            @click="showHelp = true"
            :icon="QuestionFilled"
          >
            使用帮助
          </el-button>
        </div>
      </div>
    </main>

    <!-- 设置对话框 -->
    <el-dialog v-model="showSettings" title="设置" width="500px">
      <div class="settings-content">
        <el-form label-width="120px">
          <el-form-item label="OCR API地址">
            <el-input
              v-model="settings.ocrApiUrl"
              placeholder="http://127.0.0.1:1224/api/ocr"
            />
          </el-form-item>
          <el-form-item label="NapCat地址">
            <el-input
              v-model="settings.napCatApiUrl"
              placeholder="http://127.0.0.1:3000"
            />
          </el-form-item>
          <el-form-item label="认证Token">
            <el-input
              v-model="settings.napCatToken"
              type="password"
              placeholder="可选，如果NapCat需要认证"
              show-password
            />
          </el-form-item>
          <el-form-item label="匹配阈值">
            <el-slider
              v-model="settings.matchThreshold"
              :min="0"
              :max="1"
              :step="0.1"
              show-tooltip
            />
            <span class="threshold-hint">
              {{ Math.round(settings.matchThreshold * 100) }}% -
              {{ settings.matchThreshold > 0.8 ? '严格' : settings.matchThreshold > 0.6 ? '中等' : '宽松' }}
            </span>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="showSettings = false">取消</el-button>
        <el-button type="primary" @click="saveSettings">保存</el-button>
      </template>
    </el-dialog>

    <!-- 帮助对话框 -->
    <el-dialog v-model="showHelp" title="使用帮助" width="600px">
      <div class="help-content">
        <h4>使用步骤</h4>
        <ol class="help-steps">
          <li><strong>上传截图：</strong>点击或拖拽上传包含人名的截图</li>
          <li><strong>OCR识别：</strong>系统自动识别截图中的文字并提取人名</li>
          <li><strong>匹配联系人：</strong>根据识别的人名模糊匹配QQ好友和群成员</li>
          <li><strong>发送消息：</strong>编辑消息内容并批量发送</li>
        </ol>

        <h4>注意事项</h4>
        <ul class="help-notes">
          <li>确保OCR服务运行在 http://127.0.0.1:1224/api/ocr</li>
          <li>确保NapCatQQ运行在 http://127.0.0.1:3000</li>
          <li>截图应该清晰，包含明确的人名信息</li>
          <li>群聊消息会自动添加@标签</li>
          <li>发送的消息无法撤回，请谨慎确认</li>
        </ul>

        <h4>常见问题</h4>
        <div class="help-faq">
          <p><strong>Q: OCR识别不准确怎么办？</strong></p>
          <p>A: 请确保截图清晰，字体工整，可以尝试重新截图或调整图片质量。</p>

          <p><strong>Q: 找不到匹配的联系人？</strong></p>
          <p>A: 可以尝试降低匹配阈值，或检查联系人昵称是否与截图中的姓名相符。</p>

          <p><strong>Q: 消息发送失败？</strong></p>
          <p>A: 请检查NapCatQQ是否正常运行，以及是否有发送权限。</p>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="showHelp = false">知道了</el-button>
      </template>
    </el-dialog>

    <!-- 服务状态提示 -->
    <el-backtop :right="100" :bottom="100" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import {
  ChatDotSquare,
  Setting,
  Connection,
  Check,
  Loading,
  DocumentCopy,
  RefreshRight,
  QuestionFilled
} from '@element-plus/icons-vue'
import { useAppStore } from '@/stores/app'
import { STEPS } from '@/types'
import ImageUpload from '@/components/ImageUpload.vue'
import OCRResults from '@/components/OCRResults.vue'
import ContactMatcher from '@/components/ContactMatcher.vue'
import MessageSender from '@/components/MessageSender.vue'

// Store
const appStore = useAppStore()

// 响应式数据
const showSettings = ref(false)
const showHelp = ref(false)
const settings = ref({
  ocrApiUrl: import.meta.env.VITE_OCR_API_URL || 'http://127.0.0.1:1224/api/ocr',
  napCatApiUrl: import.meta.env.VITE_NAPCAT_API_URL || 'http://127.0.0.1:3000',
  napCatToken: import.meta.env.VITE_NAPCAT_TOKEN || '',
  matchThreshold: 0.6
})

// 计算属性
const currentStep = computed(() => appStore.step)
const loading = computed(() => appStore.loading)
const uploadedImage = computed(() => appStore.uploadedImage)
const ocrResults = computed(() => appStore.ocrResults)
const extractedNames = computed(() => appStore.extractedNames)
const matchedContacts = computed(() => appStore.matchedContacts)
const groups = computed(() => appStore.groups)
const selectedContacts = computed({
  get: () => appStore.selectedContacts,
  set: (value) => appStore.selectedContacts = value
})
const messageContent = computed({
  get: () => appStore.messageContent,
  set: (value) => appStore.setMessageContent(value)
})

const loadingText = computed(() => {
  switch (currentStep.value) {
    case 1:
      return '正在处理图片...'
    case 2:
      return '正在进行OCR识别...'
    case 3:
      return '正在匹配联系人...'
    case 4:
      return '正在发送消息...'
    default:
      return '处理中...'
  }
})

const steps = {
  [STEPS.UPLOAD]: { name: '上传截图' },
  [STEPS.OCR]: { name: 'OCR识别' },
  [STEPS.MATCH]: { name: '匹配联系人' },
  [STEPS.SEND]: { name: '发送消息' }
}

// 方法
const handleFileSelected = (file) => {
  appStore.setUploadedImage(file)
  ElMessage.success('图片上传成功')
}

const handleFileCleared = () => {
  appStore.setUploadedImage(null)
}

const performOCR = async () => {
  try {
    await appStore.performOCR()
    appStore.setStep(STEPS.OCR)
    ElMessage.success('OCR识别完成')
  } catch (error) {
    ElMessage.error(error.message)
  }
}

const proceedToMatching = async () => {
  try {
    await appStore.performMatching()
    appStore.setStep(STEPS.MATCH)
    ElMessage.success('联系人匹配完成')
  } catch (error) {
    ElMessage.error(error.message)
  }
}

const performMatching = async () => {
  try {
    await appStore.performMatching()
    ElMessage.success('重新匹配完成')
  } catch (error) {
    ElMessage.error(error.message)
  }
}

const proceedToSending = () => {
  if (appStore.selectedContacts.length === 0) {
    ElMessage.warning('请至少选择一个联系人')
    return
  }
  appStore.setStep(STEPS.SEND)
}

const sendMessages = async () => {
  try {
    const result = await appStore.sendMessages()

    ElNotification({
      title: '发送完成',
      message: `成功发送 ${result.success} 条消息${result.failure > 0 ? `，失败 ${result.failure} 条` : ''}`,
      type: result.failure === 0 ? 'success' : 'warning',
      duration: 5000
    })

    return result
  } catch (error) {
    ElMessage.error(error.message)
    throw error
  }
}

const handleSendSuccess = () => {
  ElMessage.success('所有消息发送成功！')
  // 可以选择重置应用或显示成功页面
}

const goToStep = (step) => {
  appStore.setStep(step)
}

const resetApp = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要重新开始吗？当前的所有数据将被清除。',
      '确认重置',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    appStore.reset()
    ElMessage.success('已重置应用')
  } catch {
    // 用户取消
  }
}

const testServices = async () => {
  ElMessage.info('正在测试服务连接...')

  try {
    const result = await appStore.testServices()

    if (result.allReady) {
      ElMessage.success('所有服务连接正常')
    } else {
      let message = '服务连接状态：'
      message += result.ocr ? ' OCR✓' : ' OCR✗'
      message += result.napCat ? ' NapCat✓' : ' NapCat✗'
      ElMessage.warning(message)
    }
  } catch (error) {
    ElMessage.error('服务连接测试失败')
  }
}

const saveSettings = () => {
  // 这里可以保存到本地存储或发送到后端
  localStorage.setItem('qq-ocr-messenger-settings', JSON.stringify(settings.value))
  showSettings.value = false
  ElMessage.success('设置已保存')
}

const loadSettings = () => {
  try {
    const saved = localStorage.getItem('qq-ocr-messenger-settings')
    if (saved) {
      Object.assign(settings.value, JSON.parse(saved))
    }
  } catch (error) {
    console.warn('加载设置失败:', error)
  }
}

// 生命周期
onMounted(() => {
  loadSettings()

  // 显示欢迎信息
  ElNotification({
    title: '欢迎使用 QQ OCR Messenger',
    message: '请确保OCR服务和NapCatQQ正在运行，然后开始上传截图。',
    type: 'info',
    duration: 5000
  })
})
</script>

<style scoped>
.main-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.app-header {
  background: var(--white);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  flex-wrap: wrap;
  gap: 16px;
}

.logo-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.app-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
}

.app-icon {
  color: var(--primary-blue);
  font-size: 28px;
}

.app-subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.app-main {
  padding: 32px 0;
}

.step-indicator {
  display: flex;
  justify-content: center;
  margin-bottom: 40px;
  position: relative;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  max-width: 200px;
  position: relative;
}

.step::after {
  content: '';
  position: absolute;
  top: 15px;
  left: 50%;
  width: 100%;
  height: 2px;
  background-color: var(--gray-border);
  z-index: -1;
}

.step:last-child::after {
  display: none;
}

.step.active::after,
.step.completed::after {
  background-color: var(--primary-blue);
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--gray-border);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-bottom: 8px;
  position: relative;
  z-index: 1;
}

.step.active .step-number {
  background-color: var(--primary-blue);
  color: var(--white);
}

.step.completed .step-number {
  background-color: #67c23a;
  color: var(--white);
}

.step-icon {
  font-size: 16px;
}

.step-label {
  font-size: 14px;
  color: var(--text-secondary);
  text-align: center;
}

.step.active .step-label {
  color: var(--primary-blue);
  font-weight: 500;
}

.content-card {
  position: relative;
  min-height: 400px;
  margin-bottom: 24px;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 8px;
}

.loading-content {
  text-align: center;
}

.loading-icon {
  color: var(--primary-blue);
  margin-bottom: 16px;
  animation: rotate 1s linear infinite;
}

.loading-text {
  margin: 0;
  color: var(--text-regular);
  font-size: 16px;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.step-content {
  padding: 24px;
}

.step-actions {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--gray-border);
}

.quick-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.settings-content {
  max-height: 400px;
  overflow-y: auto;
}

.threshold-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: 8px;
}

.help-content h4 {
  color: var(--text-primary);
  margin: 0 0 12px 0;
  font-size: 16px;
}

.help-steps,
.help-notes {
  margin: 0 0 20px 0;
  padding-left: 20px;
}

.help-steps li,
.help-notes li {
  margin-bottom: 8px;
  line-height: 1.5;
}

.help-faq p {
  margin: 8px 0;
  line-height: 1.5;
}

.help-faq p:first-child {
  margin-top: 16px;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .step-indicator {
    flex-direction: column;
    gap: 16px;
  }

  .step {
    flex-direction: row;
    max-width: none;
    align-items: center;
    gap: 12px;
  }

  .step::after {
    display: none;
  }

  .step-number {
    margin-bottom: 0;
  }

  .step-label {
    text-align: left;
  }

  .step-content {
    padding: 16px;
  }

  .quick-actions {
    flex-direction: column;
    align-items: center;
  }

  .quick-actions .el-button {
    width: 200px;
  }
}
</style>