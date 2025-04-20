/**
 * 模型提供商类型
 */
export type ProviderType = 'openai' | 'gemini' | 'claude' | 'custom';

/**
 * 模型配置接口
 */
export interface ModelConfig {
  readonly id: string;
  readonly name: string;
  readonly provider: ProviderType;
  readonly apiKey: string;
  readonly baseURL: string;
  readonly model: string;
  readonly format?: 'openai' | 'gemini' | 'claude';
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly maxOutputTokens?: number; // 添加对Gemini模型的maxOutputTokens支持
  readonly additionalParams?: Record<string, unknown>;
}

/**
 * 命令执行模式
 */
export enum CommandExecutionMode {
  /** 白名单模式: 白名单内命令自动执行，其他命令询问 */
  WHITELIST = 'whitelist',
  /** 黑名单模式: 黑名单内命令询问，其他命令自动执行 */
  BLACKLIST = 'blacklist',
  /** 全自动模式: 所有命令都自动执行 */
  AUTO = 'auto',
  /** 消息模式: 不执行任何命令，只输出 */
  MESSAGE = 'message'
}

/**
 * 应用设置接口
 */
export interface AppSettings {
  readonly defaultModel?: string;
  readonly logLevel?: 'debug' | 'info' | 'warn' | 'error';
  readonly allowAutoExecution?: boolean;
  readonly commandWhitelist?: string[];
  readonly commandBlacklist?: string[];
  readonly commandExecutionMode?: CommandExecutionMode;
}

/**
 * 配置文件结构
 */
export interface ConfigFile {
  readonly models?: Record<string, Partial<ModelConfig>>;
  readonly settings?: AppSettings;
}
