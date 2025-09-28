/**
 * 消息格式化工具
 * 处理CQ码和消息格式转换
 */

/**
 * 格式化@用户消息
 * @param {Array} userIds - 用户ID数组
 * @param {string} message - 消息内容
 * @returns {string} 格式化后的消息
 */
export function formatAtMessage(userIds, message) {
  if (!userIds || userIds.length === 0) {
    return message
  }

  const atParts = userIds.map(userId => `[CQ:at,qq=${userId}]`).join(' ')
  return `${atParts} ${message}`
}

/**
 * 解析CQ码
 * @param {string} cqCode - CQ码字符串
 * @returns {Object} 解析结果
 */
export function parseCQCode(cqCode) {
  const cqRegex = /\[CQ:([^,\]]+)(?:,([^\]]+))?\]/g
  const matches = []
  let match

  while ((match = cqRegex.exec(cqCode)) !== null) {
    const type = match[1]
    const params = {}

    if (match[2]) {
      const paramPairs = match[2].split(',')
      paramPairs.forEach(pair => {
        const [key, value] = pair.split('=')
        if (key && value) {
          params[key] = decodeURIComponent(value)
        }
      })
    }

    matches.push({
      type,
      params,
      original: match[0]
    })
  }

  return matches
}

/**
 * 构建CQ码
 * @param {string} type - CQ码类型
 * @param {Object} params - 参数对象
 * @returns {string} CQ码字符串
 */
export function buildCQCode(type, params = {}) {
  if (!type) return ''

  const paramString = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join(',')

  return paramString ? `[CQ:${type},${paramString}]` : `[CQ:${type}]`
}

/**
 * 转义CQ码特殊字符
 * @param {string} text - 文本内容
 * @returns {string} 转义后的文本
 */
export function escapeCQCode(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/\[/g, '&#91;')
    .replace(/\]/g, '&#93;')
    .replace(/,/g, '&#44;')
}

/**
 * 反转义CQ码特殊字符
 * @param {string} text - 文本内容
 * @returns {string} 反转义后的文本
 */
export function unescapeCQCode(text) {
  return text
    .replace(/&#44;/g, ',')
    .replace(/&#93;/g, ']')
    .replace(/&#91;/g, '[')
    .replace(/&amp;/g, '&')
}

/**
 * 创建@所有人CQ码
 * @returns {string} @所有人的CQ码
 */
export function createAtAllCode() {
  return '[CQ:at,qq=all]'
}

/**
 * 创建@用户CQ码
 * @param {string} userId - 用户ID
 * @returns {string} @用户的CQ码
 */
export function createAtUserCode(userId) {
  return buildCQCode('at', { qq: userId })
}

/**
 * 创建图片CQ码
 * @param {string} file - 图片文件路径或URL
 * @param {Object} options - 图片选项
 * @returns {string} 图片CQ码
 */
export function createImageCode(file, options = {}) {
  return buildCQCode('image', { file, ...options })
}

/**
 * 创建语音CQ码
 * @param {string} file - 语音文件路径或URL
 * @param {Object} options - 语音选项
 * @returns {string} 语音CQ码
 */
export function createRecordCode(file, options = {}) {
  return buildCQCode('record', { file, ...options })
}

/**
 * 创建视频CQ码
 * @param {string} file - 视频文件路径或URL
 * @param {Object} options - 视频选项
 * @returns {string} 视频CQ码
 */
export function createVideoCode(file, options = {}) {
  return buildCQCode('video', { file, ...options })
}

/**
 * 创建表情CQ码
 * @param {string} id - 表情ID
 * @returns {string} 表情CQ码
 */
export function createFaceCode(id) {
  return buildCQCode('face', { id })
}

/**
 * 创建回复CQ码
 * @param {string} messageId - 消息ID
 * @returns {string} 回复CQ码
 */
export function createReplyCode(messageId) {
  return buildCQCode('reply', { id: messageId })
}

/**
 * 检查消息是否包含CQ码
 * @param {string} message - 消息内容
 * @returns {boolean} 是否包含CQ码
 */
export function hasCQCode(message) {
  return /\[CQ:[^\]]+\]/.test(message)
}

/**
 * 移除消息中的所有CQ码
 * @param {string} message - 消息内容
 * @returns {string} 移除CQ码后的纯文本
 */
export function removeCQCode(message) {
  return message.replace(/\[CQ:[^\]]+\]/g, '').trim()
}

/**
 * 统计消息中的CQ码数量
 * @param {string} message - 消息内容
 * @param {string} type - CQ码类型，不指定则统计所有
 * @returns {number} CQ码数量
 */
export function countCQCode(message, type = null) {
  if (type) {
    const regex = new RegExp(`\\[CQ:${type}[^\\]]*\\]`, 'g')
    return (message.match(regex) || []).length
  }
  return (message.match(/\[CQ:[^\]]+\]/g) || []).length
}

/**
 * 验证CQ码格式
 * @param {string} cqCode - CQ码字符串
 * @returns {boolean} 是否为有效的CQ码
 */
export function validateCQCode(cqCode) {
  return /^\[CQ:[^,\]]+(?:,[^\]]+)?\]$/.test(cqCode)
}

/**
 * 格式化消息用于显示
 * @param {string} message - 消息内容
 * @param {Object} options - 格式化选项
 * @returns {string} 格式化后的消息
 */
export function formatMessageForDisplay(message, options = {}) {
  const {
    showAtUsers = true,
    showImages = true,
    showOthers = true,
    placeholder = '[不支持的消息类型]'
  } = options

  let formattedMessage = message

  if (!showAtUsers) {
    formattedMessage = formattedMessage.replace(/\[CQ:at,[^\]]+\]/g, '[提及用户]')
  }

  if (!showImages) {
    formattedMessage = formattedMessage.replace(/\[CQ:image,[^\]]+\]/g, '[图片]')
  }

  if (!showOthers) {
    formattedMessage = formattedMessage.replace(/\[CQ:(?!at|image)[^,\]]+[^\]]*\]/g, placeholder)
  }

  return formattedMessage
}

/**
 * 将消息段数组转换为CQ码字符串
 * @param {Array} segments - 消息段数组
 * @returns {string} CQ码字符串
 */
export function segmentsToString(segments) {
  return segments.map(segment => {
    if (segment.type === 'text') {
      return segment.data.text
    }
    return buildCQCode(segment.type, segment.data)
  }).join('')
}

/**
 * 将CQ码字符串转换为消息段数组
 * @param {string} message - CQ码字符串
 * @returns {Array} 消息段数组
 */
export function stringToSegments(message) {
  const segments = []
  let lastIndex = 0
  const cqRegex = /\[CQ:([^,\]]+)(?:,([^\]]+))?\]/g
  let match

  while ((match = cqRegex.exec(message)) !== null) {
    // 添加前面的文本段
    if (match.index > lastIndex) {
      const text = message.slice(lastIndex, match.index)
      if (text) {
        segments.push({
          type: 'text',
          data: { text }
        })
      }
    }

    // 添加CQ码段
    const type = match[1]
    const params = {}

    if (match[2]) {
      const paramPairs = match[2].split(',')
      paramPairs.forEach(pair => {
        const [key, value] = pair.split('=')
        if (key && value) {
          params[key] = decodeURIComponent(value)
        }
      })
    }

    segments.push({
      type,
      data: params
    })

    lastIndex = match.index + match[0].length
  }

  // 添加最后的文本段
  if (lastIndex < message.length) {
    const text = message.slice(lastIndex)
    if (text) {
      segments.push({
        type: 'text',
        data: { text }
      })
    }
  }

  return segments
}