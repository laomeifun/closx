# CLOSX - 您的智能终端助手

![Version](https://img.shields.io/badge/版本-1.0.0-blue)
![License](https://img.shields.io/badge/许可证-MIT-green)
[![Powered by Mastra](https://img.shields.io/badge/强力驱动-Mastra-orange)](https://github.com/mastraai/mastra)

CLOSX 是一个基于 Mastra 框架和 AI SDK 构建的交互式命令行 AI 助手。它旨在理解您的自然语言指令，执行 Shell 命令，并提供智能化的终端交互体验。

## ✨ 特性

- 🤖 **智能交互:** 通过自然语言与 AI 进行对话，获取帮助或执行任务。
- 💻 **Shell 命令执行:** AI 可以生成并（在确认后）执行 Shell 命令。
- 🧠 **多模型支持:** 支持 OpenAI、Gemini、Claude 及其他兼容 OpenAI API 的自定义模型。
- ⚙️ **灵活配置:** 可通过环境变量或配置文件 (`.shellconfig.json`) 进行灵活配置。
- 🔄 **上下文保持:** 在交互式会话中保持对话上下文。
- 🎨 **友好界面:** 使用 `chalk` 和 `ora` 提供清晰、美观的终端输出和加载提示。
- 🚀 **两种模式:** 支持启动交互式会话或直接执行单个命令。

## 📦 安装

### 通过 npm 安装

```bash
npm install -g closx-cli
```

### 从源码安装

1.  **克隆仓库:**
    ```bash
    git clone https://github.com/laomeifun/closx.git
    cd closx
    ```
2.  **安装依赖并构建:**
    ```bash
    npm install
    npm run build:bundle
    ```
3.  **全局链接:**
    ```bash
    npm link
    ```

## ⚙️ 配置

CLOSX 可以通过环境变量或配置文件进行配置。

### 环境变量

以下是一些常用的环境变量：

-   `OPENAI_API_KEY`: 您的 OpenAI API 密钥。
-   `OPENAI_API_BASE_URL`: OpenAI API 的基础 URL (可选)。
-   `OPENAI_MODEL`: 使用的 OpenAI 模型名称 (可选, 默认 'gpt-4o')。
-   `GEMINI_API_KEY`, `GEMINI_API_BASE_URL`, `GEMINI_MODEL`: Gemini 相关配置。
-   `CLAUDE_API_KEY`, `CLAUDE_API_BASE_URL`, `CLAUDE_MODEL`: Claude 相关配置。

如果设置了环境变量，相应的默认模型将被自动注册。

### 配置文件

您可以在以下位置创建 `.shellconfig.json` 文件来提供更详细的配置：

-   项目根目录 (`./.shellconfig.json`)
-   `src` 目录 (`./src/.shellconfig.json`)
-   用户主目录 (`~/.shellconfig.json`)
-   用户配置目录 (`~/.config/shellconfig.json` 或 `~/.config/closx/shellconfig.json`)

配置文件结构示例：

```json
{
  "models": {
    "openai-custom": {
      "name": "OpenAI Custom",
      "provider": "openai",
      "apiKey": "your-openai-api-key",
      "baseURL": "https://api.openai.com/v1",
      "model": "gpt-4o",
      "temperature": 0.7,
      "maxTokens": 2048
    },
    "gemini-custom": {
      "name": "Gemini Custom",
      "provider": "gemini",
      "apiKey": "your-gemini-api-key",
      "baseURL": "https://generativelanguage.googleapis.com",
      "model": "gemini-pro"
    },
    "custom-openai-model": {
      "name": "Custom OpenAI Model",
      "provider": "custom",
      "apiKey": "your-api-key",
      "baseURL": "https://your-custom-endpoint.com/v1",
      "model": "your-model-name",
      "format": "openai" // 指定格式为 openai
    }
  },
  "settings": {
    "defaultModel": "openai-custom", // 指定默认使用的模型ID
    "logLevel": "info"
  }
}
```

**注意:** 您可以使用 `closx --create-config` (如果实现了该功能) 或手动创建此文件。CLOSX 会按照优先级选择模型（配置文件默认 > 指定 ID > 配置文件第一个 > 环境变量默认 > 硬编码默认）。

## 🚀 使用方法

### 启动交互式会话

```bash
closx
# 或者
closx -i
```

启动后，您可以直接输入自然语言指令或特殊命令。

### 直接执行单个命令

```bash
closx "你的问题或命令"
```

CLOSX 将处理您的请求，执行必要的 AI 调用或 Shell 命令，然后退出。

## 🛠️ 命令行选项

```bash
closx [选项] [命令]

选项:
  -v, --verbose      显示详细输出
  -i, --interactive  进入交互式界面 (如果未提供命令，则默认为此模式)
  -h, --help         显示帮助信息
```

## 📋 交互式命令

在交互式模式下，可以使用以下特殊命令：

-   `/help` - 显示帮助信息
-   `/quit` - 退出程序
-   `/exec <命令>` - 直接在本地执行 Shell 命令 (不通过 AI)
-   `/clear` - 清除当前对话历史
-   `/env` - 显示当前环境变量

## 🧩 项目结构

```
.
├── bin/                  # CLI 入口脚本
├── build.js              # esbuild 打包脚本
├── src/
│   ├── cli/              # 命令行界面相关代码
│   │   ├── handlers/     # 命令和响应处理器
│   │   ├── services/     # 核心服务 (Agent, 命令处理, 会话)
│   │   ├── types/        # 类型定义
│   │   ├── ui/           # 终端 UI 组件
│   │   └── utils/        # 工具函数
│   │   ├── index.ts      # CLI 主入口
│   │   └── terminal-agent.ts # 终端代理核心类
│   ├── mastra/           # Mastra Agent 和工具相关代码
│   │   ├── agents/       # Mastra Agent 定义
│   │   ├── tools/        # Mastra Agent 使用的工具
│   │   └── api.ts        # 与 Agent 交互的 API
│   ├── examples/         # 示例代码 (如果存在)
│   └── config.ts         # 配置加载和管理
├── .env.development      # 开发环境变量 (示例)
├── .shellconfig.json     # 配置文件 (示例)
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 开发

### 启动开发模式

```bash
# 可能需要先创建 .env.development 文件并填入 API 密钥
npm run cli
```

### 构建打包

使用 `esbuild` 将项目打包成单个可执行文件。

```bash
npm run build:bundle
```

打包后的文件位于 `dist` 目录。

## 📚 相关技术

-   [@mastra/core](https://github.com/mastraai/mastra), [@mastra/memory](https://github.com/mastraai/mastra) - AI 代理核心框架
-   [@ai-sdk/openai](https://sdk.vercel.ai/) - Vercel AI SDK (用于 OpenAI 等)
-   [Commander.js](https://github.com/tj/commander.js) - 命令行界面参数解析
-   [Inquirer.js](https://github.com/SBoudrias/Inquirer.js) - 交互式命令行用户界面
-   [Chalk](https://github.com/chalk/chalk) - 终端字符串样式
-   [Ora](https://github.com/sindresorhus/ora) - 终端加载动画
-   [Zod](https://zod.dev/) - TypeScript 优先的模式验证
-   [TypeScript](https://www.typescriptlang.org/)
-   [esbuild](https://esbuild.github.io/) - 高性能 JavaScript 打包器

## 📄 许可证

MIT
