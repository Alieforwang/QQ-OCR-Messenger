<template>
  <div class="image-upload-container">
    <div
      class="upload-area"
      :class="{ 'dragover': isDragOver, 'has-image': previewUrl }"
      @click="triggerFileInput"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        style="display: none"
        @change="handleFileSelect"
      />

      <div v-if="!previewUrl" class="upload-placeholder">
        <el-icon class="upload-icon" size="48">
          <upload-filled />
        </el-icon>
        <div class="upload-text">
          <p class="primary-text">点击上传截图或拖拽图片到此处</p>
          <p class="secondary-text">支持 JPG、PNG、GIF、WebP 格式，最大 10MB</p>
        </div>
      </div>

      <div v-else class="image-preview">
        <img :src="previewUrl" alt="预览图片" class="preview-image" />
        <div class="image-overlay">
          <div class="image-actions">
            <el-button
              type="primary"
              :icon="RefreshRight"
              @click.stop="triggerFileInput"
            >
              重新选择
            </el-button>
            <el-button
              type="danger"
              :icon="Delete"
              @click.stop="clearImage"
            >
              删除
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="imageInfo" class="image-info">
      <div class="info-item">
        <span class="label">文件名:</span>
        <span class="value">{{ imageInfo.name }}</span>
      </div>
      <div class="info-item">
        <span class="label">大小:</span>
        <span class="value">{{ formatFileSize(imageInfo.size) }}</span>
      </div>
      <div class="info-item">
        <span class="label">类型:</span>
        <span class="value">{{ imageInfo.type }}</span>
      </div>
    </div>

    <div v-if="error" class="error-message">
      <el-alert
        :title="error"
        type="error"
        :closable="false"
        show-icon
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled, RefreshRight, Delete } from '@element-plus/icons-vue'
import { DEFAULT_VALUES } from '@/types'

const emit = defineEmits(['file-selected', 'file-cleared'])

const fileInput = ref(null)
const selectedFile = ref(null)
const isDragOver = ref(false)
const error = ref('')

// 计算属性
const previewUrl = computed(() => {
  if (selectedFile.value) {
    return URL.createObjectURL(selectedFile.value)
  }
  return null
})

const imageInfo = computed(() => {
  if (selectedFile.value) {
    return {
      name: selectedFile.value.name,
      size: selectedFile.value.size,
      type: selectedFile.value.type
    }
  }
  return null
})

// 方法
const triggerFileInput = () => {
  fileInput.value?.click()
}

const validateFile = (file) => {
  // 检查文件类型
  if (!DEFAULT_VALUES.ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return '不支持的文件格式，请选择 JPG、PNG、GIF 或 WebP 格式的图片'
  }

  // 检查文件大小
  if (file.size > DEFAULT_VALUES.MAX_UPLOAD_SIZE) {
    return `文件大小不能超过 ${formatFileSize(DEFAULT_VALUES.MAX_UPLOAD_SIZE)}`
  }

  return null
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    processFile(file)
  }
}

const handleDragOver = (event) => {
  event.preventDefault()
  isDragOver.value = true
}

const handleDragLeave = (event) => {
  event.preventDefault()
  isDragOver.value = false
}

const handleDrop = (event) => {
  event.preventDefault()
  isDragOver.value = false

  const files = Array.from(event.dataTransfer.files)
  const imageFile = files.find(file => file.type.startsWith('image/'))

  if (imageFile) {
    processFile(imageFile)
  } else {
    ElMessage.error('请拖拽图片文件')
  }
}

const processFile = (file) => {
  error.value = ''

  // 验证文件
  const validationError = validateFile(file)
  if (validationError) {
    error.value = validationError
    ElMessage.error(validationError)
    return
  }

  // 清理之前的预览URL
  if (selectedFile.value && previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }

  selectedFile.value = file
  emit('file-selected', file)
  ElMessage.success('图片上传成功')
}

const clearImage = () => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }

  selectedFile.value = null
  error.value = ''

  // 清空文件输入框
  if (fileInput.value) {
    fileInput.value.value = ''
  }

  emit('file-cleared')
  ElMessage.info('已清除图片')
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 暴露方法给父组件
defineExpose({
  clearImage,
  getSelectedFile: () => selectedFile.value
})
</script>

<style scoped>
.image-upload-container {
  width: 100%;
}

.upload-area {
  position: relative;
  min-height: 200px;
  border: 2px dashed var(--primary-blue);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: var(--light-blue);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.upload-area:hover {
  border-color: var(--dark-blue);
  background-color: rgba(64, 158, 255, 0.1);
}

.upload-area.dragover {
  border-color: var(--dark-blue);
  background-color: rgba(64, 158, 255, 0.15);
  transform: scale(1.02);
}

.upload-area.has-image {
  min-height: 300px;
  border-style: solid;
  background-color: transparent;
}

.upload-placeholder {
  text-align: center;
  padding: 20px;
}

.upload-icon {
  color: var(--primary-blue);
  margin-bottom: 16px;
}

.upload-text .primary-text {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.upload-text .secondary-text {
  font-size: 14px;
  color: var(--text-secondary);
}

.image-preview {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 4px;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-preview:hover .image-overlay {
  opacity: 1;
}

.image-actions {
  display: flex;
  gap: 12px;
}

.image-info {
  margin-top: 16px;
  padding: 12px;
  background-color: var(--gray-light);
  border-radius: 4px;
  border-left: 4px solid var(--primary-blue);
}

.info-item {
  display: flex;
  margin-bottom: 4px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-item .label {
  font-weight: 500;
  color: var(--text-regular);
  width: 60px;
  flex-shrink: 0;
}

.info-item .value {
  color: var(--text-primary);
  word-break: break-all;
}

.error-message {
  margin-top: 16px;
}

@media (max-width: 768px) {
  .upload-area {
    min-height: 150px;
  }

  .upload-area.has-image {
    min-height: 200px;
  }

  .preview-image {
    max-height: 200px;
  }

  .image-actions {
    flex-direction: column;
    gap: 8px;
  }

  .image-actions .el-button {
    width: 120px;
  }
}
</style>