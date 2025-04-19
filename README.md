# CLOSX - 交互式终端AI代理

![Version](https://img.shields.io/badge/版本-1.0.0-blue)
![License](https://img.shields.io/badge/许可证-ISC-green)

CLOSX是一个基于@mastra/core构建的交互式终端AI代理，能够帮助用户执行命令和解答问题，提供流畅的命令行AI助手体验。

## ✨ 特性

- 🤖 智能终端代理，支持自然语言交流
- 💻 执行shell命令并实时显示结果
- 🔄 支持多轮对话，保持上下文连贯
- 🌐 收集并利用系统环境信息，提供更精准的帮助
- 💡 优雅的用户界面，包含丰富的表情符号提示
- ⚡ 支持直接执行和交互式两种模式

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式启动

```bash
npm run cli
```

### 直接执行命令

```bash
npm run cli "你的问题或命令"
```

## 🛠️ 命令行选项

CLOSX提供以下命令行选项：

```bash
closx [options] [命令]

选项:
  -v, --verbose      显示详细输出
  -i, --interactive  进入交互式界面
  -h, --help         显示帮助信息
```

## 📋 交互式命令

在交互式模式下，可以使用以下特殊命令：

- ❓ `/help` - 显示帮助信息
- 🚪 `/quit` - 退出程序
- 💻 `/exec <命令>` - 执行shell命令
- 🔄 `/clear` - 清除对话历史
- 🌐 `/env` - 显示当前环境信息

## 🧩 项目结构

```
src/cli/
├── types/            # 类型定义
├── utils/            # 工具函数
│   ├── shell-executor.ts    # Shell命令执行工具
│   ├── prompt-generator.ts  # 提示词生成工具
│   └── console-utils.ts     # 控制台输出工具
├── handlers/         # 处理器
│   ├── special-commands.ts    # 特殊命令处理
│   └── shell-tag-processor.ts # Shell标签处理
├── services/         # 服务
│   └── agent-service.ts       # AI代理交互服务
├── terminal-agent.ts # 主代理类
└── index.ts          # 入口文件
```

## 🔧 开发

### 构建项目

```bash
npm run build
```

### 启动示例

```bash
npm run start:example src/examples/你的示例文件.ts
```

### 直接启动

```bash
npm start
```

## 📝 使用示例

1. **交互式模式**

   ```bash
   npm run cli
   ```

   然后在提示符后输入您的问题或命令。

2. **直接执行模式**

   ```bash
   npm run cli "更新系统软件包"
   ```

   AI会直接处理您的请求并执行相应操作。

## 📚 相关技术

- [@mastra/core](https://github.com/mastraai/mastra) - AI代理核心框架
- [Commander.js](https://github.com/tj/commander.js) - 命令行界面工具
- [Inquirer.js](https://github.com/SBoudrias/Inquirer.js) - 交互式命令行用户界面
- [Chalk](https://github.com/chalk/chalk) - 终端样式工具
- [Ora](https://github.com/sindresorhus/ora) - 优雅的终端加载动画

## 📄 许可证

ISC

---

由 [@mastra/core](https://github.com/mastraai/mastra) 强力驱动
