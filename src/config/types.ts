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
 * 应用设置接口
 */
export interface AppSettings {
  readonly defaultModel?: string;
  readonly logLevel?: 'debug' | 'info' | 'warn' | 'error';
  readonly allowAutoExecution?: boolean;
}

/**
 * 配置文件结构
 */
export interface ConfigFile {
  readonly models?: Record<string, Partial<ModelConfig>>;
  readonly settings?: AppSettings;
}
