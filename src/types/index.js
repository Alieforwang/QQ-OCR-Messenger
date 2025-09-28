// 类型和常量定义

// 消息类型枚举
export const MESSAGE_TYPES = {
  PRIVATE: 'private',
  GROUP: 'group'
}

// 步骤枚举
export const STEPS = {
  UPLOAD: 1,
  OCR: 2,
  MATCH: 3,
  SEND: 4
}

// 角色枚举
export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member'
}

// 联系人类型枚举
export const CONTACT_TYPES = {
  FRIEND: 'friend',
  GROUP_MEMBER: 'group_member'
}

// 默认值
export const DEFAULT_VALUES = {
  CONFIDENCE_THRESHOLD: 0.7,
  MATCH_SCORE_THRESHOLD: 0.6,
  MAX_UPLOAD_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
}

// API 路径
export const API_PATHS = {
  SEND_PRIVATE_MSG: '/send_private_msg',
  SEND_GROUP_MSG: '/send_group_msg',
  GET_FRIEND_LIST: '/get_friend_list',
  GET_GROUP_LIST: '/get_group_list',
  GET_GROUP_MEMBER_LIST: '/get_group_member_list'
}

// 创建工厂函数
export function createOCRResult(text = '', confidence = 0, bbox = []) {
  return {
    text,
    confidence,
    bbox
  }
}

export function createExtractedName(name = '', confidence = 0, position = []) {
  return {
    name,
    confidence,
    position
  }
}

export function createContact(user_id = '', nickname = '', remark = '', avatar = '') {
  return {
    user_id,
    nickname,
    remark,
    avatar
  }
}

export function createGroupInfo(group_id = '', group_name = '', member_count = 0, max_member_count = 0) {
  return {
    group_id,
    group_name,
    member_count,
    max_member_count
  }
}

export function createGroupMember(user_id = '', nickname = '', card = '', role = ROLES.MEMBER) {
  return {
    user_id,
    nickname,
    card,
    role
  }
}

export function createMatchedContact(contact = null, score = 0, type = CONTACT_TYPES.FRIEND, group_id = '', group_name = '') {
  return {
    contact,
    score,
    type,
    group_id,
    group_name
  }
}

export function createMessageToSend(type = MESSAGE_TYPES.PRIVATE, target_id = '', message = '', at_users = []) {
  return {
    type,
    target_id,
    message,
    at_users
  }
}

export function createNapCatResponse(status = 'ok', retcode = 0, data = null, message = '', wording = '') {
  return {
    status,
    retcode,
    data,
    message,
    wording
  }
}

export function createAppState() {
  return {
    step: STEPS.UPLOAD,
    loading: false,
    uploadedImage: null,
    ocrResults: [],
    extractedNames: [],
    contacts: [],
    groupMembers: {},
    matchedContacts: [],
    selectedContacts: [],
    messageContent: ''
  }
}