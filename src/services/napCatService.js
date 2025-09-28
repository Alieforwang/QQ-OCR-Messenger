import axios from 'axios'
import { createNapCatResponse, createContact, createGroupInfo, createGroupMember, API_PATHS, MESSAGE_TYPES } from '@/types'

class NapCatService {
  constructor() {
    this.baseURL = import.meta.env.VITE_NAPCAT_API_URL || 'http://127.0.0.1:3000'
    this.token = import.meta.env.VITE_NAPCAT_TOKEN || ''

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // 如果有token，添加到请求头
    if (this.token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.token}`
    }

    // 添加响应拦截器处理错误
    this.client.interceptors.response.use(
      response => response,
      error => {
        console.error('NapCat API请求失败:', error)
        return Promise.reject(error)
      }
    )
  }

  /**
   * 发送私聊消息
   * @param {string} userId - 用户ID
   * @param {string} message - 消息内容
   * @returns {Promise<Object>} 发送结果
   */
  async sendPrivateMessage(userId, message) {
    try {
      const response = await this.client.post(API_PATHS.SEND_PRIVATE_MSG, {
        user_id: userId,
        message: message,
        auto_escape: false
      })

      return this.handleResponse(response)
    } catch (error) {
      throw new Error(`发送私聊消息失败: ${error.message}`)
    }
  }

  /**
   * 发送群聊消息
   * @param {string} groupId - 群ID
   * @param {string} message - 消息内容
   * @param {Array} atUsers - 要@的用户ID数组
   * @returns {Promise<Object>} 发送结果
   */
  async sendGroupMessage(groupId, message, atUsers = []) {
    try {
      let finalMessage = message

      // 如果有@用户，添加CQ码
      if (atUsers && atUsers.length > 0) {
        const atParts = atUsers.map(userId => `[CQ:at,qq=${userId}]`).join(' ')
        finalMessage = `${atParts} ${message}`
      }

      const response = await this.client.post(API_PATHS.SEND_GROUP_MSG, {
        group_id: groupId,
        message: finalMessage,
        auto_escape: false
      })

      return this.handleResponse(response)
    } catch (error) {
      throw new Error(`发送群聊消息失败: ${error.message}`)
    }
  }

  /**
   * 获取好友列表
   * @returns {Promise<Array>} 好友列表
   */
  async getFriendList() {
    try {
      const response = await this.client.post(API_PATHS.GET_FRIEND_LIST)
      const result = this.handleResponse(response)

      if (result.data && Array.isArray(result.data)) {
        return result.data.map(friend => createContact(
          friend.user_id?.toString() || '',
          friend.nickname || '',
          friend.remark || '',
          friend.avatar || `http://q1.qlogo.cn/g?b=qq&nk=${friend.user_id}&s=100` // 默认QQ头像URL
        ))
      }

      return []
    } catch (error) {
      console.error('获取好友列表失败:', error)
      return []
    }
  }

  /**
   * 获取群列表
   * @returns {Promise<Array>} 群列表
   */
  async getGroupList() {
    try {
      const response = await this.client.post(API_PATHS.GET_GROUP_LIST)
      const result = this.handleResponse(response)

      if (result.data && Array.isArray(result.data)) {
        return result.data.map(group => createGroupInfo(
          group.group_id?.toString() || '',
          group.group_name || '',
          group.member_count || 0,
          group.max_member_count || 0
        ))
      }

      return []
    } catch (error) {
      console.error('获取群列表失败:', error)
      return []
    }
  }

  /**
   * 获取群成员列表
   * @param {string} groupId - 群ID
   * @returns {Promise<Array>} 群成员列表
   */
  async getGroupMemberList(groupId) {
    try {
      const response = await this.client.post(API_PATHS.GET_GROUP_MEMBER_LIST, {
        group_id: groupId
      })

      const result = this.handleResponse(response)

      if (result.data && Array.isArray(result.data)) {
        return result.data.map(member => createGroupMember(
          member.user_id?.toString() || '',
          member.nickname || '',
          member.card || '',
          member.role || 'member'
        ))
      }

      return []
    } catch (error) {
      console.error(`获取群${groupId}成员列表失败:`, error)
      return []
    }
  }

  /**
   * 获取所有群的成员列表
   * @param {Array} groupList - 群列表
   * @returns {Promise<Object>} 群成员映射对象
   */
  async getAllGroupMembers(groupList) {
    const groupMembers = {}

    // 并发获取所有群的成员列表
    const promises = groupList.map(async (group) => {
      try {
        const members = await this.getGroupMemberList(group.group_id)
        groupMembers[group.group_id] = members
      } catch (error) {
        console.error(`获取群${group.group_id}成员失败:`, error)
        groupMembers[group.group_id] = []
      }
    })

    await Promise.allSettled(promises)
    return groupMembers
  }

  /**
   * 获取登录信息
   * @returns {Promise<Object>} 登录信息
   */
  async getLoginInfo() {
    try {
      const response = await this.client.post('/get_login_info')
      return this.handleResponse(response)
    } catch (error) {
      console.error('获取登录信息失败:', error)
      return null
    }
  }

  /**
   * 获取运行状态
   * @returns {Promise<Object>} 运行状态
   */
  async getStatus() {
    try {
      const response = await this.client.post('/get_status')
      return this.handleResponse(response)
    } catch (error) {
      console.error('获取运行状态失败:', error)
      return null
    }
  }

  /**
   * 测试连接
   * @returns {Promise<boolean>} 连接是否成功
   */
  async testConnection() {
    try {
      const status = await this.getStatus()
      return status && status.data && status.data.good
    } catch (error) {
      console.warn('NapCat连接测试失败:', error.message)
      return false
    }
  }

  /**
   * 处理API响应
   * @param {Object} response - axios响应对象
   * @returns {Object} 处理后的响应
   */
  handleResponse(response) {
    const data = response.data

    if (!data) {
      throw new Error('响应数据为空')
    }

    // 检查OneBot标准响应格式
    if (data.retcode !== undefined) {
      if (data.retcode !== 0) {
        throw new Error(data.message || data.wording || `API调用失败，错误码: ${data.retcode}`)
      }
      return createNapCatResponse(
        data.status || 'ok',
        data.retcode,
        data.data,
        data.message || '',
        data.wording || ''
      )
    }

    // 如果不是标准格式，直接返回数据
    return createNapCatResponse('ok', 0, data)
  }

  /**
   * 批量发送消息
   * @param {Array} messages - 消息数组
   * @returns {Promise<Array>} 发送结果数组
   */
  async batchSendMessages(messages) {
    const results = []

    for (const msgData of messages) {
      try {
        let result
        if (msgData.type === MESSAGE_TYPES.PRIVATE) {
          result = await this.sendPrivateMessage(msgData.target_id, msgData.message)
        } else if (msgData.type === MESSAGE_TYPES.GROUP) {
          result = await this.sendGroupMessage(msgData.target_id, msgData.message, msgData.at_users)
        } else {
          throw new Error(`未知的消息类型: ${msgData.type}`)
        }

        results.push({
          success: true,
          data: result,
          message: msgData
        })

        // 添加短暂延迟避免发送过快
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          message: msgData
        })
      }
    }

    return results
  }

  /**
   * 格式化消息内容，支持CQ码
   * @param {string} message - 原始消息
   * @param {Array} atUsers - @用户列表
   * @returns {string} 格式化后的消息
   */
  formatMessage(message, atUsers = []) {
    let formattedMessage = message

    // 添加@用户
    if (atUsers.length > 0) {
      const atParts = atUsers.map(userId => `[CQ:at,qq=${userId}]`).join(' ')
      formattedMessage = `${atParts} ${message}`
    }

    return formattedMessage
  }
}

// 创建单例实例
const napCatService = new NapCatService()
export default napCatService