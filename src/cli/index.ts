#!/usr/bin/env node
import { TerminalAgent } from './terminal-agent.js';

// 导出各个组件以供其他模块使用
export * from './types/terminal-types';
export * from './utils/shell-executor';
export * from './utils/prompt-generator';
export * from './utils/console-utils';
export * from './handlers/special-commands';
export * from './handlers/shell-tag-processor';
export * from './services/agent-service';
export * from './terminal-agent.js';

// 创建并启动终端代理实例
const terminalAgent = new TerminalAgent();

// 启动交互式终端代理
terminalAgent.run().catch((error: Error) => {
  console.error('程序运行出错:', error);
  process.exit(1);
});
