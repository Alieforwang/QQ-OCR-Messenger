import { defineStore } from 'pinia'
import { createAppState, STEPS } from '@/types'
import ocrService from '@/services/ocrService'
import napCatService from '@/services/napCatService'
import fuzzyMatcher from '@/services/fuzzyMatcher'

export const useAppStore = defineStore('app', {
  state: () => createAppState(),

  getters: {
    // 当前步骤名称
    currentStepName: (state) => {
      const stepNames = {
        [STEPS.UPLOAD]: '上传截图',
        [STEPS.OCR]: 'OCR识别',
        [STEPS.MATCH]: '匹配联系人',
        [STEPS.SEND]: '发送消息'
      }
      return stepNames[state.step] || '未知步骤'
    },

    // 是否可以进行下一步
    canProceedToNext: (state) => {
      switch (state.step) {
        case STEPS.UPLOAD:
          return !!state.uploadedImage
        case STEPS.OCR:
          return state.extractedNames.length > 0
        case STEPS.MATCH:
          return state.selectedContacts.length > 0
        case STEPS.SEND:
          return state.messageContent.trim().length > 0
        default:
          return false
      }
    },

    // 获取所有联系人数量
    totalContactsCount: (state) => {
      return state.contacts.length + Object.values(state.groupMembers).reduce((sum, members) => sum + members.length, 0)
    },

    // 获取选中的群聊联系人
    selectedGroupContacts: (state) => {
      return state.selectedContacts.filter(contact => contact.type === 'group_member')
    },

    // 获取选中的好友联系人
    selectedFriendContacts: (state) => {
      return state.selectedContacts.filter(contact => contact.type === 'friend')
    },

    // 检查服务连接状态
    isServicesReady: (state) => {
      // 这个getter可以用来检查OCR和NapCat服务是否可用
      return !state.loading
    }
  },

  actions: {
    // 设置加载状态
    setLoading(loading) {
      this.loading = loading
    },

    // 设置当前步骤
    setStep(step) {
      this.step = step
    },

    // 进入下一步
    nextStep() {
      if (this.canProceedToNext && this.step < STEPS.SEND) {
        this.step++
      }
    },

    // 返回上一步
    previousStep() {
      if (this.step > STEPS.UPLOAD) {
        this.step--
      }
    },

    // 重置应用状态
    reset() {
      Object.assign(this, createAppState())
    },

    // 设置上传的图片
    setUploadedImage(file) {
      this.uploadedImage = file
      // 清除之后步骤的数据
      this.ocrResults = []
      this.extractedNames = []
      this.matchedContacts = []
      this.selectedContacts = []
    },

    // 执行OCR识别
    async performOCR() {
      if (!this.uploadedImage) {
        throw new Error('请先上传图片')
      }

      this.setLoading(true)
      try {
        // 执行OCR识别
        this.ocrResults = await ocrService.performOCR(this.uploadedImage)

        // 提取人名
        this.extractedNames = ocrService.extractNames(this.ocrResults)

        if (this.extractedNames.length === 0) {
          throw new Error('未能从图片中识别出有效的人名')
        }

        return this.extractedNames
      } catch (error) {
        console.error('OCR识别失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 加载联系人数据
    async loadContacts() {
      this.setLoading(true)
      try {
        // 并行加载好友列表和群列表
        const [friends, groups] = await Promise.all([
          napCatService.getFriendList(),
          napCatService.getGroupList()
        ])

        this.contacts = friends
        this.groups = groups

        // 加载所有群的成员列表
        if (groups.length > 0) {
          this.groupMembers = await napCatService.getAllGroupMembers(groups)
        }

        return { friends, groups }
      } catch (error) {
        console.error('加载联系人失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 执行模糊匹配
    async performMatching() {
      if (this.extractedNames.length === 0) {
        throw new Error('没有可匹配的人名')
      }

      this.setLoading(true)
      try {
        // 如果联系人数据为空，先加载
        if (this.contacts.length === 0 || this.groups.length === 0 || Object.keys(this.groupMembers).length === 0) {
          await this.loadContacts()
        }

        // 创建群信息映射
        const groupInfo = {}
        Object.keys(this.groupMembers).forEach(groupId => {
          const group = this.groups.find(g => g.group_id === groupId)
          groupInfo[groupId] = {
            group_name: group?.group_name || `群${groupId}`,
            group_id: groupId,
            member_count: group?.member_count || 0
          }
        })

        // 执行模糊匹配
        const matchResult = fuzzyMatcher.matchAll(
          this.extractedNames,
          this.contacts,
          this.groupMembers,
          groupInfo
        )

        this.matchedContacts = matchResult.all
        return matchResult
      } catch (error) {
        console.error('模糊匹配失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 选择/取消选择联系人
    toggleContact(contact) {
      const index = this.selectedContacts.findIndex(
        selected =>
          selected.contact.user_id === contact.contact.user_id &&
          selected.type === contact.type &&
          selected.group_id === contact.group_id
      )

      if (index >= 0) {
        this.selectedContacts.splice(index, 1)
      } else {
        this.selectedContacts.push(contact)
      }
    },

    // 选择所有匹配的联系人
    selectAllContacts() {
      this.selectedContacts = [...this.matchedContacts]
    },

    // 清除所有选择
    clearSelectedContacts() {
      this.selectedContacts = []
    },

    // 设置消息内容
    setMessageContent(content) {
      this.messageContent = content
    },

    // 发送消息
    async sendMessages() {
      if (this.selectedContacts.length === 0) {
        throw new Error('请选择要发送消息的联系人')
      }

      if (!this.messageContent.trim()) {
        throw new Error('请输入消息内容')
      }

      this.setLoading(true)
      try {
        const messages = []

        // 按类型分组处理
        const friendContacts = this.selectedContacts.filter(c => c.type === 'friend')
        const groupContacts = this.selectedContacts.filter(c => c.type === 'group_member')

        // 处理好友私聊
        friendContacts.forEach(contact => {
          messages.push({
            type: 'private',
            target_id: contact.contact.user_id,
            message: this.messageContent
          })
        })

        // 处理群聊（按群分组）
        const groupMessages = new Map()
        groupContacts.forEach(contact => {
          const groupId = contact.group_id
          if (!groupMessages.has(groupId)) {
            groupMessages.set(groupId, {
              type: 'group',
              target_id: groupId,
              message: this.messageContent,
              at_users: []
            })
          }
          groupMessages.get(groupId).at_users.push(contact.contact.user_id)
        })

        messages.push(...Array.from(groupMessages.values()))

        // 批量发送消息
        const results = await napCatService.batchSendMessages(messages)

        // 统计发送结果
        const successCount = results.filter(r => r.success).length
        const failureCount = results.filter(r => !r.success).length

        return {
          total: results.length,
          success: successCount,
          failure: failureCount,
          results
        }
      } catch (error) {
        console.error('发送消息失败:', error)
        throw error
      } finally {
        this.setLoading(false)
      }
    },

    // 测试服务连接
    async testServices() {
      this.setLoading(true)
      try {
        const [ocrConnected, napCatConnected] = await Promise.all([
          ocrService.testConnection(),
          napCatService.testConnection()
        ])

        return {
          ocr: ocrConnected,
          napCat: napCatConnected,
          allReady: ocrConnected && napCatConnected
        }
      } catch (error) {
        console.error('服务连接测试失败:', error)
        return {
          ocr: false,
          napCat: false,
          allReady: false
        }
      } finally {
        this.setLoading(false)
      }
    },

    // 搜索联系人
    searchContacts(query) {
      if (!query || query.trim().length < 2) {
        return this.matchedContacts
      }

      return fuzzyMatcher.exactSearch(
        query.trim(),
        this.contacts,
        this.groupMembers
      )
    },

    // 获取匹配统计信息
    getMatchingStats() {
      return fuzzyMatcher.getMatchStats(this.matchedContacts)
    },

    // 获取分组后的匹配联系人
    getGroupedMatches() {
      const friends = this.matchedContacts.filter(m => m.type === 'friend')
      const groupMembers = this.matchedContacts.filter(m => m.type === 'group_member')

      // 按群分组群成员
      const groupedMembers = {}
      groupMembers.forEach(member => {
        if (!groupedMembers[member.group_id]) {
          groupedMembers[member.group_id] = {
            group_name: member.group_name,
            group_id: member.group_id,
            members: []
          }
        }
        groupedMembers[member.group_id].members.push(member)
      })

      return {
        friends,
        groups: Object.values(groupedMembers),
        totalFriends: friends.length,
        totalGroups: Object.keys(groupedMembers).length,
        totalGroupMembers: groupMembers.length
      }
    }
  }
})