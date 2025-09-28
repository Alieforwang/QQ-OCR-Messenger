# QQ OCR Messenger

一个基于Vue 3的智能截图识别QQ消息发送工具，能够自动从截图中提取人名并匹配QQ联系人，实现批量消息发送。

## ✨ 功能特点

- 🖼️ **智能截图识别** - 支持拖拽上传，自动OCR识别文字
- 🔍 **人名提取** - 智能提取截图中的人名信息
- 👥 **模糊匹配** - 使用Fuse.js算法智能匹配QQ好友和群成员
- 💬 **批量发送** - 支持向多个联系人同时发送消息
- 🎯 **群聊@功能** - 自动生成CQ码格式的@消息
- 🎨 **蓝白主题** - 清新简洁的用户界面
- 📱 **响应式设计** - 完美适配各种屏幕尺寸

## 🚀 技术栈

- **前端框架**: Vue 3 + Composition API
- **构建工具**: Vite
- **UI组件**: Element Plus
- **状态管理**: Pinia
- **路由管理**: Vue Router
- **HTTP客户端**: Axios
- **模糊搜索**: Fuse.js
- **代码规范**: ESLint + Prettier

## 📋 前置要求

在运行项目之前，请确保以下服务正在运行：

1. **OCR服务** - 运行在 `http://127.0.0.1:1224/api/ocr`
2. **NapCatQQ** - 运行在 `http://127.0.0.1:3000`
3. **QQ客户端** - 已登录并连接到NapCatQQ

## 🔧 安装与运行

### 1. 克隆项目
```bash
git clone <repository-url>
cd qq-ocr-messenger
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
复制 `.env` 文件并根据需要修改配置：
```bash
cp .env .env.local
```

编辑 `.env.local` 文件：
```env
VITE_NAPCAT_API_URL=http://127.0.0.1:3000
VITE_OCR_API_URL=http://127.0.0.1:1224/api/ocr
VITE_NAPCAT_TOKEN=your_token_here
```

### 4. 启动开发服务器
```bash
npm run dev
```

### 5. 构建生产版本
```bash
npm run build
```

## 📖 使用指南

### 基本流程

1. **上传截图** - 点击或拖拽上传包含人名的截图
2. **OCR识别** - 系统自动识别截图中的文字并提取人名
3. **匹配联系人** - 根据识别的人名模糊匹配QQ好友和群成员
4. **编辑消息** - 输入要发送的消息内容
5. **批量发送** - 确认后向选中的联系人发送消息

### 高级功能

- **匹配阈值调整** - 在设置中调整模糊匹配的严格程度
- **消息预览** - 发送前预览私聊和群聊消息格式
- **发送结果** - 查看详细的发送成功/失败统计
- **服务状态检测** - 实时检测OCR和NapCatQQ服务状态

## 🔌 API集成

### OCR服务
项目通过HTTP POST请求调用本地OCR服务：
```javascript
POST http://127.0.0.1:1224/api/ocr
Content-Type: multipart/form-data

// FormData with image file
```

### NapCatQQ API
基于OneBot 11标准的QQ机器人API：
```javascript
// 发送私聊消息
POST http://127.0.0.1:3000/send_private_msg
{
  "user_id": "123456789",
  "message": "Hello!"
}

// 发送群聊消息（带@）
POST http://127.0.0.1:3000/send_group_msg
{
  "group_id": "987654321",
  "message": "[CQ:at,qq=123456789] Hello!"
}
```

## 📁 项目结构

```
src/
├── components/          # Vue组件
│   ├── ImageUpload.vue     # 图片上传组件
│   ├── OCRResults.vue      # OCR结果显示
│   ├── ContactMatcher.vue  # 联系人匹配
│   └── MessageSender.vue   # 消息发送
├── services/           # 服务层
│   ├── ocrService.js       # OCR服务集成
│   ├── napCatService.js    # NapCatQQ API
│   └── fuzzyMatcher.js     # 模糊匹配算法
├── stores/             # 状态管理
│   └── app.js              # 应用主状态
├── utils/              # 工具函数
│   └── messageFormatter.js # 消息格式化
├── types/              # 类型定义
│   └── index.js            # 类型和常量
├── assets/             # 静态资源
│   └── css/
│       └── main.css        # 全局样式
└── views/              # 页面组件
    └── MainView.vue        # 主页面
```

## ⚙️ 配置说明

### 环境变量
- `VITE_NAPCAT_API_URL` - NapCatQQ API地址
- `VITE_OCR_API_URL` - OCR服务地址
- `VITE_NAPCAT_TOKEN` - NapCatQQ认证令牌（可选）

### 默认配置
```javascript
// 文件大小限制
MAX_UPLOAD_SIZE: 10MB

// 支持的图片格式
ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

// 匹配阈值
MATCH_SCORE_THRESHOLD: 0.6

// OCR置信度阈值
CONFIDENCE_THRESHOLD: 0.7
```

## 🛠️ 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 代码检查
npm run lint

# 代码格式化
npm run format
```

## 🐛 常见问题

### Q: OCR识别不准确怎么办？
A: 请确保截图清晰，字体工整，避免复杂背景。可以尝试重新截图或使用更高质量的图片。

### Q: 找不到匹配的联系人？
A: 可以在设置中降低匹配阈值，或者检查联系人昵称、备注是否与截图中的姓名相符。

### Q: 消息发送失败？
A: 请检查：
1. NapCatQQ是否正常运行
2. QQ客户端是否已登录
3. 是否有发送权限
4. 网络连接是否正常

### Q: 服务连接失败？
A: 请确认：
1. OCR服务运行在正确的端口（默认1224）
2. NapCatQQ运行在正确的端口（默认3000）
3. 防火墙设置是否允许访问

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

本项目的实现离不开以下优秀的开源项目：

- **[Umi-OCR](https://github.com/hiroi-sora/Umi-OCR)** - 强大的离线OCR文字识别工具，为本项目提供了可靠的图像文字识别服务
- **[NapCatQQ](https://github.com/NapNeko/NapCatQQ)** - 现代化的无头QQ机器人框架，基于OneBot 11标准，为本项目提供了QQ消息发送能力

**重要声明**：本项目未对 [NapCatQQ](https://github.com/NapNeko/NapCatQQ) 和 [Umi-OCR](https://github.com/hiroi-sora/Umi-OCR) 的代码进行任何修改，仅通过标准API接口调用其提供的服务。本项目是一个独立的前端应用，作为这些服务的客户端使用。

感谢这些项目的开发者们为开源社区做出的贡献！

## 🤝 贡献

欢迎提交Issue和Pull Request来改进项目！

## 📞 支持

如有问题或建议，请通过以下方式联系：

- 提交 [GitHub Issue](issues)
- 查看 [项目文档](docs)

---

⚠️ **免责声明**: 本工具仅供学习和研究使用，请遵守相关法律法规和平台使用条款。使用本工具发送消息的行为由用户自行承担责任。