import axios from 'axios'
import { createOCRResult, createExtractedName } from '@/types'

class OCRService {
  constructor() {
    this.baseURL = import.meta.env.VITE_OCR_API_URL || 'http://127.0.0.1:1224/api/ocr'
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  /**
   * 对图片进行OCR识别
   * @param {File} imageFile - 图片文件
   * @returns {Promise<Array>} OCR结果数组
   */
  async performOCR(imageFile) {
    try {
      // 将图片文件转换为base64
      const base64 = await this.fileToBase64(imageFile)

      // 构造API请求数据
      const requestData = {
        base64: base64,
        options: {
          "data.format": "text"
        }
      }

      const response = await this.client.post(this.baseURL, requestData)

      // 处理API响应，根据实际OCR API的响应格式调整
      // 处理当前OCR API的响应格式: {code: 100, data: "text", score: 0.73, time: 1.24, timestamp: 1759048383}
      if (response.data && response.data.code === 100 && response.data.data) {
        return [createOCRResult(
          response.data.data,
          response.data.score || 0.8,
          []
        )]
      }

      // 备用格式：如果有results数组
      if (response.data && response.data.results) {
        return response.data.results.map(result =>
          createOCRResult(
            result.text || result.content || '',
            result.confidence || result.score || 0,
            result.bbox || result.box || []
          )
        )
      }

      // 备用格式：如果响应是数组
      if (response.data && Array.isArray(response.data)) {
        return response.data.map(result =>
          createOCRResult(
            result.text || result.content || '',
            result.confidence || result.score || 0,
            result.bbox || result.box || []
          )
        )
      }

      // 备用格式：如果是简单的文本响应
      if (response.data && typeof response.data === 'string') {
        return [createOCRResult(response.data, 1.0, [])]
      }

      // 备用格式：如果返回的是文本内容
      if (response.data && response.data.text) {
        return [createOCRResult(response.data.text, response.data.confidence || 1.0, [])]
      }

      console.warn('未知的OCR响应格式:', response.data)
      return []
    } catch (error) {
      console.error('OCR识别失败:', error)
      throw new Error(`OCR识别失败: ${error.message}`)
    }
  }

  /**
   * 从OCR结果中提取人名
   * @param {Array} ocrResults - OCR结果数组
   * @returns {Array} 提取的人名数组
   */
  extractNames(ocrResults) {
    const names = []
    const namePatterns = [
      // 中文姓名模式
      /[\u4e00-\u9fa5]{2,4}/g,
      // 英文姓名模式
      /[A-Z][a-z]+ [A-Z][a-z]+/g,
      // 可能的昵称模式
      /[@＠][^\s@＠]+/g
    ]

    ocrResults.forEach((result, resultIndex) => {
      const text = result.text || ''

      namePatterns.forEach(pattern => {
        const matches = text.match(pattern)
        if (matches) {
          matches.forEach((match, matchIndex) => {
            let cleanName = match.replace(/[@＠]/g, '').trim()

            // 过滤掉明显不是人名的文本
            if (this.isValidName(cleanName)) {
              names.push(createExtractedName(
                cleanName,
                result.confidence || 0.8,
                result.bbox || [resultIndex, matchIndex]
              ))
            }
          })
        }
      })
    })

    // 去重并按置信度排序
    return this.deduplicateNames(names)
  }

  /**
   * 验证是否为有效人名
   * @param {string} name - 待验证的名字
   * @returns {boolean} 是否为有效人名
   */
  isValidName(name) {
    if (!name || name.length < 2 || name.length > 10) {
      return false
    }

    // 排除常见的非人名词汇
    const excludeWords = [
      '时间', '日期', '地址', '电话', '手机', '微信', 'QQ',
      '公司', '部门', '职位', '标题', '内容', '备注', '说明',
      '数字', '金额', '价格', '密码', '验证码', '链接', '网址'
    ]

    if (excludeWords.some(word => name.includes(word))) {
      return false
    }

    // 排除纯数字或特殊字符
    if (/^[\d\s\-\+\(\)\.]+$/.test(name)) {
      return false
    }

    // 排除邮箱、网址等
    if (/@|\.com|\.cn|http|www/i.test(name)) {
      return false
    }

    return true
  }

  /**
   * 去重人名并按置信度排序
   * @param {Array} names - 人名数组
   * @returns {Array} 去重后的人名数组
   */
  deduplicateNames(names) {
    const uniqueNames = new Map()

    names.forEach(nameObj => {
      const key = nameObj.name.toLowerCase()
      if (!uniqueNames.has(key) || uniqueNames.get(key).confidence < nameObj.confidence) {
        uniqueNames.set(key, nameObj)
      }
    })

    return Array.from(uniqueNames.values())
      .sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * 将文件转换为base64字符串
   * @param {File} file - 文件对象
   * @returns {Promise<string>} base64字符串（不包含data:前缀）
   */
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        // 移除data:image/xxx;base64,前缀，只保留base64数据
        const base64 = reader.result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  /**
   * 测试OCR服务连接
   * @returns {Promise<boolean>} 连接是否成功
   */
  async testConnection() {
    try {
      // 使用一个小的测试图片（1x1像素的透明PNG）进行测试
      const testImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

      const requestData = {
        base64: testImageData,
        options: {
          "data.format": "text"
        }
      }

      await this.client.post(this.baseURL, requestData)
      return true
    } catch (error) {
      console.warn('OCR服务连接测试失败:', error.message)
      return false
    }
  }

  /**
   * Base64转Blob
   * @param {string} base64 - Base64字符串
   * @param {string} contentType - 内容类型
   * @returns {Blob} Blob对象
   */
  base64ToBlob(base64, contentType = '') {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }

    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: contentType })
  }
}

// 创建单例实例
const ocrService = new OCRService()
export default ocrService