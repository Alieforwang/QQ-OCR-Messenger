import Fuse from 'fuse.js'
import { createMatchedContact, CONTACT_TYPES, DEFAULT_VALUES } from '@/types'

class FuzzyMatcher {
  constructor() {
    this.matchThreshold = DEFAULT_VALUES.MATCH_SCORE_THRESHOLD

    // Fuse.js配置选项
    this.fuseOptions = {
      // 搜索的字段
      keys: [
        { name: 'nickname', weight: 0.7 },
        { name: 'remark', weight: 0.8 },
        { name: 'card', weight: 0.6 }
      ],
      // 模糊匹配的阈值，0.0为完全匹配，1.0为完全不匹配
      threshold: 0.4,
      // 返回匹配的位置信息
      includeMatches: true,
      // 返回匹配分数
      includeScore: true,
      // 最小匹配字符长度
      minMatchCharLength: 1,
      // 是否应该对搜索模式进行排序
      shouldSort: true,
      // 搜索时是否忽略位置
      ignoreLocation: true
    }
  }

  /**
   * 在好友列表中搜索匹配的联系人
   * @param {Array} extractedNames - 提取的姓名列表
   * @param {Array} friends - 好友列表
   * @returns {Array} 匹配的好友列表
   */
  matchFriends(extractedNames, friends) {
    if (!friends || friends.length === 0) {
      return []
    }

    const fuse = new Fuse(friends, this.fuseOptions)
    const matches = []

    extractedNames.forEach(nameObj => {
      const searchResults = fuse.search(nameObj.name)

      searchResults.forEach(result => {
        const score = this.calculateScore(result.score, nameObj.confidence)

        if (score >= this.matchThreshold) {
          matches.push(createMatchedContact(
            result.item,
            score,
            CONTACT_TYPES.FRIEND
          ))
        }
      })
    })

    return this.deduplicateAndSort(matches)
  }

  /**
   * 在群成员中搜索匹配的联系人
   * @param {Array} extractedNames - 提取的姓名列表
   * @param {Object} groupMembers - 群成员映射对象 {groupId: [members]}
   * @param {Object} groupInfo - 群信息映射对象 {groupId: groupInfo}
   * @returns {Array} 匹配的群成员列表
   */
  matchGroupMembers(extractedNames, groupMembers, groupInfo = {}) {
    const matches = []

    Object.entries(groupMembers).forEach(([groupId, members]) => {
      if (!members || members.length === 0) return

      const fuse = new Fuse(members, this.fuseOptions)

      extractedNames.forEach(nameObj => {
        const searchResults = fuse.search(nameObj.name)

        searchResults.forEach(result => {
          const score = this.calculateScore(result.score, nameObj.confidence)

          if (score >= this.matchThreshold) {
            const groupName = groupInfo[groupId]?.group_name || `群${groupId}`

            matches.push(createMatchedContact(
              result.item,
              score,
              CONTACT_TYPES.GROUP_MEMBER,
              groupId,
              groupName
            ))
          }
        })
      })
    })

    return this.deduplicateAndSort(matches)
  }

  /**
   * 综合搜索好友和群成员
   * @param {Array} extractedNames - 提取的姓名列表
   * @param {Array} friends - 好友列表
   * @param {Object} groupMembers - 群成员映射对象
   * @param {Object} groupInfo - 群信息映射对象
   * @returns {Object} 匹配结果对象
   */
  matchAll(extractedNames, friends = [], groupMembers = {}, groupInfo = {}) {
    const friendMatches = this.matchFriends(extractedNames, friends)
    const groupMemberMatches = this.matchGroupMembers(extractedNames, groupMembers, groupInfo)

    // 合并所有匹配结果
    const allMatches = [...friendMatches, ...groupMemberMatches]
    const sortedMatches = this.deduplicateAndSort(allMatches)

    return {
      friends: friendMatches,
      groupMembers: groupMemberMatches,
      all: sortedMatches,
      totalCount: sortedMatches.length
    }
  }

  /**
   * 精确搜索特定姓名
   * @param {string} name - 要搜索的姓名
   * @param {Array} friends - 好友列表
   * @param {Object} groupMembers - 群成员映射对象
   * @param {Object} groupInfo - 群信息映射对象
   * @returns {Array} 精确匹配结果
   */
  exactSearch(name, friends = [], groupMembers = {}, groupInfo = {}) {
    const extractedNames = [{ name, confidence: 1.0 }]

    // 提高匹配精度
    const originalThreshold = this.fuseOptions.threshold
    this.fuseOptions.threshold = 0.2 // 更严格的匹配

    const result = this.matchAll(extractedNames, friends, groupMembers, groupInfo)

    // 恢复原始阈值
    this.fuseOptions.threshold = originalThreshold

    return result.all
  }

  /**
   * 计算综合匹配分数
   * @param {number} fuseScore - Fuse.js的匹配分数（越小越好）
   * @param {number} confidence - OCR识别的置信度（越大越好）
   * @returns {number} 综合分数（0-1，越大越好）
   */
  calculateScore(fuseScore, confidence = 1.0) {
    // Fuse.js的分数是越小越好，需要转换
    const invertedFuseScore = 1 - fuseScore

    // 综合OCR置信度和模糊匹配分数
    const weightedScore = (invertedFuseScore * 0.7) + (confidence * 0.3)

    return Math.max(0, Math.min(1, weightedScore))
  }

  /**
   * 去重并排序匹配结果
   * @param {Array} matches - 匹配结果数组
   * @returns {Array} 去重排序后的匹配结果
   */
  deduplicateAndSort(matches) {
    // 使用Map去重，以user_id+type+group_id为key
    const uniqueMatches = new Map()

    matches.forEach(match => {
      const key = `${match.contact.user_id}_${match.type}_${match.group_id || ''}`

      if (!uniqueMatches.has(key) || uniqueMatches.get(key).score < match.score) {
        uniqueMatches.set(key, match)
      }
    })

    // 按分数降序排列
    return Array.from(uniqueMatches.values())
      .sort((a, b) => b.score - a.score)
  }

  /**
   * 设置匹配阈值
   * @param {number} threshold - 新的阈值（0-1）
   */
  setMatchThreshold(threshold) {
    this.matchThreshold = Math.max(0, Math.min(1, threshold))
  }

  /**
   * 设置Fuse.js搜索阈值
   * @param {number} threshold - 新的搜索阈值（0-1）
   */
  setSearchThreshold(threshold) {
    this.fuseOptions.threshold = Math.max(0, Math.min(1, threshold))
  }

  /**
   * 过滤匹配结果
   * @param {Array} matches - 匹配结果数组
   * @param {Object} filters - 过滤条件
   * @returns {Array} 过滤后的结果
   */
  filterMatches(matches, filters = {}) {
    return matches.filter(match => {
      // 按分数过滤
      if (filters.minScore && match.score < filters.minScore) {
        return false
      }

      // 按类型过滤
      if (filters.type && match.type !== filters.type) {
        return false
      }

      // 按群ID过滤
      if (filters.groupId && match.group_id !== filters.groupId) {
        return false
      }

      return true
    })
  }

  /**
   * 获取匹配统计信息
   * @param {Array} matches - 匹配结果数组
   * @returns {Object} 统计信息
   */
  getMatchStats(matches) {
    const stats = {
      total: matches.length,
      friends: 0,
      groupMembers: 0,
      highScore: 0, // >0.8
      mediumScore: 0, // 0.6-0.8
      lowScore: 0, // <0.6
      averageScore: 0
    }

    let totalScore = 0

    matches.forEach(match => {
      totalScore += match.score

      if (match.type === CONTACT_TYPES.FRIEND) {
        stats.friends++
      } else if (match.type === CONTACT_TYPES.GROUP_MEMBER) {
        stats.groupMembers++
      }

      if (match.score > 0.8) {
        stats.highScore++
      } else if (match.score > 0.6) {
        stats.mediumScore++
      } else {
        stats.lowScore++
      }
    })

    stats.averageScore = matches.length > 0 ? totalScore / matches.length : 0

    return stats
  }
}

// 创建单例实例
const fuzzyMatcher = new FuzzyMatcher()
export default fuzzyMatcher