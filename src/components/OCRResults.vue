<template>
  <div class="ocr-results-container">
    <div class="results-header">
      <h3 class="title">OCR识别结果</h3>
      <div class="stats">
        <el-tag type="success" size="small">
          识别到 {{ extractedNames.length }} 个姓名
        </el-tag>
        <el-tag type="info" size="small">
          共 {{ ocrResults.length }} 个文本块
        </el-tag>
      </div>
    </div>

    <div v-if="extractedNames.length === 0" class="empty-state">
      <el-empty description="未识别到有效的姓名">
        <el-button type="primary" @click="$emit('retry')">
          重新识别
        </el-button>
      </el-empty>
    </div>

    <div v-else class="results-content">
      <!-- 提取的姓名列表 -->
      <div class="names-section">
        <h4 class="section-title">
          <el-icon><User /></el-icon>
          提取的姓名
        </h4>
        <div class="names-grid">
          <div
            v-for="(name, index) in extractedNames"
            :key="index"
            class="name-item"
            :class="{ 'high-confidence': name.confidence > 0.8 }"
          >
            <div class="name-content">
              <span class="name-text">{{ name.name }}</span>
              <div class="confidence-bar">
                <div
                  class="confidence-fill"
                  :style="{ width: `${name.confidence * 100}%` }"
                ></div>
              </div>
            </div>
            <div class="confidence-label">
              {{ Math.round(name.confidence * 100) }}%
            </div>
          </div>
        </div>
      </div>

      <!-- 原始OCR文本 -->
      <el-collapse v-model="activeCollapse" class="ocr-collapse">
        <el-collapse-item name="raw-text" title="原始OCR文本">
          <div class="raw-text-list">
            <div
              v-for="(result, index) in ocrResults"
              :key="index"
              class="text-item"
            >
              <div class="text-content">
                <span class="text-value">{{ result.text }}</span>
                <div class="text-meta">
                  <el-tag size="small" type="info">
                    置信度: {{ Math.round(result.confidence * 100) }}%
                  </el-tag>
                  <span v-if="result.bbox && result.bbox.length > 0" class="bbox-info">
                    位置: [{{ result.bbox.join(', ') }}]
                  </span>
                </div>
              </div>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>

      <!-- 操作按钮 -->
      <div class="actions">
        <el-button @click="$emit('retry')" :icon="RefreshRight">
          重新识别
        </el-button>
        <el-button
          type="primary"
          @click="$emit('proceed')"
          :disabled="extractedNames.length === 0"
          :icon="ArrowRight"
        >
          继续匹配联系人
        </el-button>
      </div>
    </div>

    <!-- 处理进度 -->
    <div v-if="isProcessing" class="processing-overlay">
      <div class="processing-content">
        <el-icon class="processing-icon" size="32">
          <loading />
        </el-icon>
        <p>正在处理OCR结果...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  User,
  RefreshRight,
  ArrowRight,
  Loading
} from '@element-plus/icons-vue'

const props = defineProps({
  ocrResults: {
    type: Array,
    default: () => []
  },
  extractedNames: {
    type: Array,
    default: () => []
  },
  isProcessing: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['retry', 'proceed'])

const activeCollapse = ref([])

// 计算属性
const hasHighConfidenceNames = computed(() => {
  return props.extractedNames.some(name => name.confidence > 0.8)
})

const averageConfidence = computed(() => {
  if (props.extractedNames.length === 0) return 0
  const total = props.extractedNames.reduce((sum, name) => sum + name.confidence, 0)
  return total / props.extractedNames.length
})
</script>

<style scoped>
.ocr-results-container {
  position: relative;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.title {
  margin: 0;
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 600;
}

.stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.results-content {
  space-y: 24px;
}

.names-section {
  margin-bottom: 24px;
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

.names-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.name-item {
  background: var(--white);
  border: 1px solid var(--gray-border);
  border-radius: 8px;
  padding: 12px;
  transition: all 0.3s ease;
}

.name-item:hover {
  border-color: var(--primary-blue);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.name-item.high-confidence {
  border-color: #67c23a;
  background-color: #f0f9ff;
}

.name-content {
  margin-bottom: 8px;
}

.name-text {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  display: block;
  margin-bottom: 6px;
}

.confidence-bar {
  height: 4px;
  background-color: var(--gray-border);
  border-radius: 2px;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  background: linear-gradient(90deg, #f56c6c 0%, #e6a23c 50%, #67c23a 100%);
  transition: width 0.3s ease;
}

.confidence-label {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: right;
}

.ocr-collapse {
  margin: 24px 0;
}

.raw-text-list {
  max-height: 300px;
  overflow-y: auto;
}

.text-item {
  padding: 12px;
  border-bottom: 1px solid var(--gray-border);
}

.text-item:last-child {
  border-bottom: none;
}

.text-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.text-value {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.4;
  word-break: break-all;
}

.text-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.bbox-info {
  font-size: 12px;
  color: var(--text-secondary);
  font-family: monospace;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--gray-border);
}

.processing-overlay {
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
}

.processing-content {
  text-align: center;
  padding: 20px;
}

.processing-icon {
  color: var(--primary-blue);
  margin-bottom: 12px;
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.processing-content p {
  margin: 0;
  color: var(--text-regular);
  font-size: 14px;
}

@media (max-width: 768px) {
  .results-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .names-grid {
    grid-template-columns: 1fr;
  }

  .actions {
    flex-direction: column;
  }

  .actions .el-button {
    width: 100%;
  }

  .text-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}
</style>