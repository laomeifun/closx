import { createOpenAI } from '@ai-sdk/openai';
import { env } from 'process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { ConfigFile } from './mastra/tools/read-config';

// 环境变量配置
export const OPENAI_API_KEY = env.OPENAI_API_KEY || 'your-api-key';
export const OPENAI_API_BASE_URL = env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1';
export const GEMINI_API_KEY = env.GEMINI_API_KEY || 'your-gemini-api-key';
export const GEMINI_API_BASE_URL = env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com';
export const CLAUDE_API_KEY = env.CLAUDE_API_KEY || 'your-claude-api-key';
export const CLAUDE_API_BASE_URL = env.CLAUDE_API_BASE_URL || 'https://api.anthropic.com';

// 默认模型名称
export const OPENAI_MODEL = env.OPENAI_MODEL || 'gpt-4o';
export const GEMINI_MODEL = env.GEMINI_MODEL || 'gemini-pro';
export const CLAUDE_MODEL = env.CLAUDE_MODEL || 'claude-3-opus-20240229';

/**
 * 创建OpenAI格式的API客户端
 * @param apiKey API密钥
 * @param baseURL 基础URL
 * @returns OpenAI客户端
 */
export const createOpenAIClient = (apiKey: string, baseURL: string): ReturnType<typeof createOpenAI> => {
  return createOpenAI({
    apiKey,
    baseURL
  });
};

// 默认OpenAI客户端
export const openaiApi = createOpenAI({
  apiKey: OPENAI_API_KEY,
  baseURL: OPENAI_API_BASE_URL
});

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
  readonly additionalParams?: Record<string, unknown>;
}

/**
 * 模型配置注册表
 */
export class ModelRegistry {
  private static instance: ModelRegistry;
  private models: Map<string, ModelConfig>;

  /**
   * 私有构造函数
   */
  private constructor() {
    this.models = new Map<string, ModelConfig>();
    // 注意：加载配置文件的操作移到了getInstance方法中异步执行
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry();
      // 异步加载配置，不阻塞实例创建
      ModelRegistry.instance.loadDefaultModels().catch(error => {
        console.error('加载默认模型失败:', error);
      });
    }
    return ModelRegistry.instance;
  }

  /**
   * 加载默认模型
   */
  private async loadDefaultModels(): Promise<void> {
    // 尝试从多个位置加载配置文件
    const configPaths = [
      './.shellconfig',                  // 当前目录
      './.shellconfig.json',             // 当前目录（显式后缀）
      './src/.shellconfig',              // src目录
      './src/.shellconfig.json',         // src目录（显式后缀）
      './src/shellconfig.json',          // src目录（无点前缀）
      '~/.shellconfig',                  // 用户主目录
      '~/.shellconfig.json',             // 用户主目录（显式后缀）
      '~/.config/shellconfig.json',      // 用户配置目录
      '~/.config/closx/shellconfig.json' // 用户配置目录（应用特定）
    ];
    
    // 尝试加载每个配置文件
    let configLoaded = false;
    for (const configPath of configPaths) {
      const result = await this.loadFromConfigFile(configPath);
      if (result) {
        // 成功加载配置
        configLoaded = true;
        // 不中断，继续加载其他配置文件，允许配置合并
      }
    }
    
    if (!configLoaded) {
      console.log('未找到配置文件，使用环境变量配置');
    }
    
    // 添加默认OpenAI模型（如果环境变量存在）
    if (env.OPENAI_API_KEY) {
      this.registerModel({
        id: 'openai-default',
        name: 'OpenAI Default',
        provider: 'openai',
        apiKey: OPENAI_API_KEY,
        baseURL: OPENAI_API_BASE_URL,
        model: OPENAI_MODEL
      });
    }

    // 添加默认Gemini模型（如果环境变量存在）
    if (env.GEMINI_API_KEY) {
      this.registerModel({
        id: 'gemini-default',
        name: 'Gemini Default',
        provider: 'gemini',
        apiKey: GEMINI_API_KEY,
        baseURL: GEMINI_API_BASE_URL,
        model: GEMINI_MODEL
      });
    }

    // 添加默认Claude模型（如果环境变量存在）
    if (env.CLAUDE_API_KEY) {
      this.registerModel({
        id: 'claude-default',
        name: 'Claude Default',
        provider: 'claude',
        apiKey: CLAUDE_API_KEY,
        baseURL: CLAUDE_API_BASE_URL,
        model: CLAUDE_MODEL
      });
    }
  }
  
  /**
   * 从配置文件加载模型配置
   * @param configPath 配置文件路径，默认为~/.shellconfig
   * @returns 是否成功加载配置
   */
  public async loadFromConfigFile(configPath: string = '~/.shellconfig'): Promise<boolean> {
    try {
      // 处理路径中的~
      const expandedPath = configPath.startsWith('~') 
        ? path.join(os.homedir(), configPath.slice(1)) 
        : configPath;
      
      // 检查文件是否存在
      try {
        await fs.access(expandedPath);
      } catch (error) {
        // 尝试从配置文件加载
        return false;
      }
      
      // 读取文件内容
      const content = await fs.readFile(expandedPath, 'utf-8');
      
      // 解析JSON
      try {
        const config = JSON.parse(content);
        
        // 如果有models配置，则注册模型
        if (config.models && typeof config.models === 'object') {
          let modelsLoaded = 0;
          
          Object.entries(config.models).forEach(([id, modelConfig]) => {
            if (
              typeof modelConfig === 'object' && 
              modelConfig !== null &&
              'name' in modelConfig &&
              'provider' in modelConfig &&
              'apiKey' in modelConfig &&
              'baseURL' in modelConfig &&
              'model' in modelConfig
            ) {
              const provider = String(modelConfig.provider);
              
              // 检查provider是否有效
              if (!['openai', 'gemini', 'claude', 'custom'].includes(provider)) {
                // 模型provider无效
                return;
              }
              
              // 提取附加参数和format
              const additionalParams: Record<string, unknown> = {};
              let format: 'openai' | 'gemini' | 'claude' | undefined = undefined;
              
              Object.entries(modelConfig).forEach(([key, value]) => {
                if (key === 'format' && typeof value === 'string') {
                  if (['openai', 'gemini', 'claude'].includes(value)) {
                    format = value as 'openai' | 'gemini' | 'claude';
                  }
                } else if (!['name', 'provider', 'apiKey', 'baseURL', 'model'].includes(key)) {
                  additionalParams[key] = value;
                }
              });
              
              // 注册模型
              this.registerModel({
                id,
                name: String(modelConfig.name),
                provider: provider as ProviderType,
                apiKey: String(modelConfig.apiKey),
                baseURL: String(modelConfig.baseURL),
                model: String(modelConfig.model),
                format,
                additionalParams: Object.keys(additionalParams).length > 0 ? additionalParams : undefined
              });
              
              // 从配置文件加载模型
              modelsLoaded++;
            } else {
              // 模型配置不完整
            }
          });
          
          return modelsLoaded > 0;
        }
        
        // 配置文件中没有models配置
        return false;
      } catch (error) {
        // 无效的JSON格式
        return false;
      }
    } catch (error) {
      // 读取配置文件失败
      return false;
    }
  }

  /**
   * 注册模型
   * @param config 模型配置
   */
  public registerModel(config: ModelConfig): void {
    if (this.models.has(config.id)) {
      // 模型ID已存在，将被覆盖
    }
    this.models.set(config.id, config);
  }

  /**
   * 注册自定义OpenAI格式模型
   * @param id 模型ID
   * @param name 模型名称
   * @param apiKey API密钥
   * @param baseURL 基础URL
   * @param model 模型名称
   * @param additionalParams 附加参数
   */
  public registerCustomOpenAI(id: string, name: string, apiKey: string, baseURL: string, model: string, additionalParams?: Record<string, unknown>): void {
    this.registerModel({
      id,
      name,
      provider: 'custom',
      format: 'openai',
      apiKey,
      baseURL,
      model,
      additionalParams
    });
  }

  /**
   * 注册自定义Gemini格式模型
   * @param id 模型ID
   * @param name 模型名称
   * @param apiKey API密钥
   * @param baseURL 基础URL
   * @param model 模型名称
   * @param additionalParams 附加参数
   */
  public registerCustomGemini(id: string, name: string, apiKey: string, baseURL: string, model: string, additionalParams?: Record<string, unknown>): void {
    this.registerModel({
      id,
      name,
      provider: 'custom',
      format: 'gemini',
      apiKey,
      baseURL,
      model,
      additionalParams
    });
  }

  /**
   * 注册自定义Claude格式模型
   * @param id 模型ID
   * @param name 模型名称
   * @param apiKey API密钥
   * @param baseURL 基础URL
   * @param model 模型名称
   * @param additionalParams 附加参数
   */
  public registerCustomClaude(id: string, name: string, apiKey: string, baseURL: string, model: string, additionalParams?: Record<string, unknown>): void {
    this.registerModel({
      id,
      name,
      provider: 'custom',
      format: 'claude',
      apiKey,
      baseURL,
      model,
      additionalParams
    });
  }

  /**
   * 获取模型配置
   * @param id 模型ID
   * @returns 模型配置或undefined
   */
  public getModel(id: string): ModelConfig | undefined {
    return this.models.get(id);
  }

  /**
   * 获取所有模型配置
   * @returns 所有模型配置的数组
   */
  public getAllModels(): ModelConfig[] {
    return Array.from(this.models.values());
  }

  /**
   * 获取指定提供商的模型配置
   * @param provider 提供商类型
   * @returns 指定提供商的模型配置数组
   */
  public getModelsByProvider(provider: ProviderType): ModelConfig[] {
    return this.getAllModels().filter(model => model.provider === provider);
  }

  /**
   * 创建OpenAI客户端
   * @param id 模型ID
   * @returns OpenAI客户端或null
   */
  public createClient(id: string): ReturnType<typeof createOpenAI> | null {
    const config = this.getModel(id);
    
    if (!config) {
      // 未找到模型配置
      return null;
    }
    
    // 处理所有类型的模型，目前我们只支持OpenAI API格式
    // 对于其他格式，我们会尝试使用OpenAI格式处理
    try {
      // 创建模型客户端
      
      // 对于OpenAI和自定义OpenAI格式模型，使用createOpenAIClient
      if (config.provider === 'openai' || (config.provider === 'custom' && config.format === 'openai')) {
        // 使用OpenAI格式创建客户端
        return createOpenAIClient(config.apiKey, config.baseURL);
      }
      
      // 对于其他格式，尝试使用OpenAI格式处理
      // 这可能不是最佳实践，但对于很多兼容OpenAI API的服务来说是可行的
      // 尝试使用OpenAI格式创建其他类型的客户端
      return createOpenAIClient(config.apiKey, config.baseURL);
    } catch (error) {
      // 创建模型客户端失败
      return null;
    }
  }
}

// 导出单例实例
export const modelRegistry = ModelRegistry.getInstance();

// 便捷函数
export const registerCustomOpenAI = (id: string, name: string, apiKey: string, baseURL: string, model: string, additionalParams?: Record<string, unknown>): void => {
  modelRegistry.registerCustomOpenAI(id, name, apiKey, baseURL, model, additionalParams);
};

export const registerCustomGemini = (id: string, name: string, apiKey: string, baseURL: string, model: string, additionalParams?: Record<string, unknown>): void => {
  modelRegistry.registerCustomGemini(id, name, apiKey, baseURL, model, additionalParams);
};

export const registerCustomClaude = (id: string, name: string, apiKey: string, baseURL: string, model: string, additionalParams?: Record<string, unknown>): void => {
  modelRegistry.registerCustomClaude(id, name, apiKey, baseURL, model, additionalParams);
};

export const getModel = (id: string): ModelConfig | undefined => {
  return modelRegistry.getModel(id);
};

export const createClient = (id: string): ReturnType<typeof createOpenAI> | null => {
  return modelRegistry.createClient(id);
};

/**
 * 获取最佳可用模型客户端
 * 优先级：
 * 1. 配置文件中指定的默认模型（settings.defaultModel）
 * 2. 指定的模型ID（参数传入）
 * 3. 配置文件中的第一个模型
 * 4. 环境变量中的默认OpenAI模型
 * 5. 默认的openaiApi
 * @param customModelId 指定的模型ID（可选）
 * @param defaultModelName 默认模型名称，如果没有指定模型则使用该名称
 * @returns 模型实例
 */
export const getBestAvailableModel = (customModelId?: string, defaultModelName: string = "gpt-4o") => {
  // 尝试获取模型
  
  // 获取所有模型
  const allModels = modelRegistry.getAllModels();
  // 已加载模型配置
  
  // 1. 检查配置文件中是否有指定的默认模型
  // 注意：这里我们需要实现一个获取settings的方法，暂时略过
  
  // 2. 如果指定了模型ID，尝试使用该模型
  if (customModelId) {
    const customClient = createClient(customModelId);
    const model = getModel(customModelId);
    if (customClient && model) {
      // 使用指定模型
      return customClient(model.model || defaultModelName);
    }
  }
  
  // 3. 如果有配置文件中的模型，使用第一个模型
  if (allModels.length > 0) {
    const firstModel = allModels[0];
    const firstModelClient = createClient(firstModel.id);
    if (firstModelClient) {
      // 使用配置文件中的第一个模型
      return firstModelClient(firstModel.model || defaultModelName);
    }
  }
  
  // 4. 尝试使用环境变量中的默认OpenAI模型
  const defaultClient = createClient("openai-default");
  const defaultModel = getModel("openai-default");
  if (defaultClient && defaultModel) {
    // 使用环境变量中的默认OpenAI模型
    return defaultClient(defaultModel.model || defaultModelName);
  }
  
  // 5. 如果没有配置的模型，使用默认的openaiApi
  // 使用默认的openaiApi
  return openaiApi(defaultModelName);
};

/**
 * 从配置文件加载模型配置
 * @param configPath 配置文件路径，默认为~/.shellconfig
 * @returns 是否成功加载配置
 */
export const loadFromConfigFile = async (configPath: string = '~/.shellconfig'): Promise<boolean> => {
  return modelRegistry.loadFromConfigFile(configPath);
};

/**
 * 从多个位置加载配置文件
 * 会尝试从当前目录、src目录、用户主目录等位置加载配置
 * @returns 是否成功加载任何配置
 */
export const loadFromAllConfigLocations = async (): Promise<boolean> => {
  const configPaths = [
    './.shellconfig',                  // 当前目录
    './.shellconfig.json',             // 当前目录（显式后缀）
    './src/.shellconfig',              // src目录
    './src/.shellconfig.json',         // src目录（显式后缀）
    './src/shellconfig.json',          // src目录（无点前缀）
    '~/.shellconfig',                  // 用户主目录
    '~/.shellconfig.json',             // 用户主目录（显式后缀）
    '~/.config/shellconfig.json',      // 用户配置目录
    '~/.config/closx/shellconfig.json' // 用户配置目录（应用特定）
  ];
  
  let configLoaded = false;
  for (const configPath of configPaths) {
    const result = await loadFromConfigFile(configPath);
    if (result) {
      configLoaded = true;
    }
  }
  
  return configLoaded;
};

/**
 * 创建配置文件模板
 * @param configPath 配置文件路径，默认为~/.shellconfig
 * @returns 是否成功创建模板
 */
export const createConfigTemplate = async (configPath: string = '~/.shellconfig'): Promise<boolean> => {
  try {
    // 处理路径中的~
    const expandedPath = configPath.startsWith('~') 
      ? path.join(os.homedir(), configPath.slice(1)) 
      : configPath;
    
    // 检查文件是否存在
    try {
      await fs.access(expandedPath);
      console.log(`配置文件已存在: ${expandedPath}`);
      return false;
    } catch (error) {
      // 文件不存在，可以创建
    }
    
    // 创建模板
    const template = {
      // 模型配置
      models: {
        // OpenAI模型配置示例
        'openai-custom': {
          name: 'OpenAI Custom',
          provider: 'openai',
          apiKey: 'your-openai-api-key',
          baseURL: 'https://api.openai.com/v1',
          model: 'gpt-4o',
          temperature: 0.7,
          maxTokens: 2048
        },
        
        // Gemini模型配置示例
        'gemini-custom': {
          name: 'Gemini Custom',
          provider: 'gemini',
          apiKey: 'your-gemini-api-key',
          baseURL: 'https://generativelanguage.googleapis.com',
          model: 'gemini-pro',
          temperature: 0.7,
          maxOutputTokens: 2048
        },
        
        // Claude模型配置示例
        'claude-custom': {
          name: 'Claude Custom',
          provider: 'claude',
          apiKey: 'your-claude-api-key',
          baseURL: 'https://api.anthropic.com',
          model: 'claude-3-opus-20240229',
          temperature: 0.7,
          maxTokens: 2048
        },
        
        // 自定义模型配置示例（OpenAI格式）
        'custom-openai-model': {
          name: 'Custom OpenAI Model',
          provider: 'custom',
          apiKey: 'your-api-key',
          baseURL: 'https://your-custom-endpoint.com/v1',
          model: 'your-model-name',
          format: 'openai',  // 指定使用OpenAI格式
          temperature: 0.7,
          maxTokens: 2048
        },
        
        // 自定义模型配置示例（Gemini格式）
        'custom-gemini-model': {
          name: 'Custom Gemini Model',
          provider: 'custom',
          apiKey: 'your-api-key',
          baseURL: 'https://your-custom-endpoint.com',
          model: 'your-model-name',
          format: 'gemini',  // 指定使用Gemini格式
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      },
      
      // 其他配置（可以根据需要扩展）
      settings: {
        defaultModel: 'openai-custom',  // 默认使用的模型ID
        logLevel: 'info'               // 日志级别
      }
    };
    
    // 写入文件
    await fs.writeFile(expandedPath, JSON.stringify(template, null, 2), 'utf-8');
    console.log(`配置文件模板已创建: ${expandedPath}`);
    return true;
  } catch (error) {
    console.error(`创建配置文件模板失败: ${String(error)}`);
    return false;
  }
};

// 默认导出
export default {
  openaiApi,
  createOpenAIClient,
  modelRegistry,
  registerCustomOpenAI,
  registerCustomGemini,
  registerCustomClaude,
  getModel,
  createClient,
  getBestAvailableModel,
  loadFromConfigFile,
  loadFromAllConfigLocations,
  createConfigTemplate
};