import { createOpenAI } from '@ai-sdk/openai';
import { env } from 'process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Environment variable configuration
export const OPENAI_API_KEY = env.OPENAI_API_KEY || 'your-api-key';
export const OPENAI_API_BASE_URL = env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1';
export const GEMINI_API_KEY = env.GEMINI_API_KEY || 'your-gemini-api-key';
export const GEMINI_API_BASE_URL = env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com';
export const CLAUDE_API_KEY = env.CLAUDE_API_KEY || 'your-claude-api-key';
export const CLAUDE_API_BASE_URL = env.CLAUDE_API_BASE_URL || 'https://api.anthropic.com';

// Default model names
export const OPENAI_MODEL = env.OPENAI_MODEL || 'gpt-4o';
export const GEMINI_MODEL = env.GEMINI_MODEL || 'gemini-pro';
export const CLAUDE_MODEL = env.CLAUDE_MODEL || 'claude-3-opus-20240229';

/**
 * Create an OpenAI format API client
 * @param apiKey API key
 * @param baseURL Base URL
 * @returns OpenAI client
 */
export const createOpenAIClient = (apiKey: string, baseURL: string): ReturnType<typeof createOpenAI> => {
  return createOpenAI({
    apiKey,
    baseURL
  });
};

// Default OpenAI client
export const openaiApi = createOpenAI({
  apiKey: OPENAI_API_KEY,
  baseURL: OPENAI_API_BASE_URL
});

/**
 * Model provider type
 */
export type ProviderType = 'openai' | 'gemini' | 'claude' | 'custom';

/**
 * Model configuration interface
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
 * Model configuration registry
 */
export class ModelRegistry {
  private static instance: ModelRegistry;
  private models: Map<string, ModelConfig>;

  /**
   * Private constructor
   */
  private constructor() {
    this.models = new Map<string, ModelConfig>();
    // Note: Loading configuration files has been moved to the getInstance method for asynchronous execution
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry();
      // Asynchronously load configuration without blocking instance creation
      ModelRegistry.instance.loadDefaultModels().catch(error => {
        console.error('Failed to load default models:', error);
      });
    }
    return ModelRegistry.instance;
  }

  /**
   * Load default models
   */
  private async loadDefaultModels(): Promise<void> {
    // Try to load configuration files from multiple locations
    const configPaths = [
      './.shellconfig',                  // Current directory
      './.shellconfig.json',             // Current directory (explicit suffix)
      './src/.shellconfig',              // src directory
      './src/.shellconfig.json',         // src directory (explicit suffix)
      './src/shellconfig.json',          // src directory (no dot prefix)
      '~/.shellconfig',                  // User home directory
      '~/.shellconfig.json',             // User home directory (explicit suffix)
      '~/.config/shellconfig.json',      // User config directory
      '~/.config/closx/shellconfig.json' // User config directory (application specific)
    ];
    
    // Try to load each configuration file
    let configLoaded = false;
    for (const configPath of configPaths) {
      const result = await this.loadFromConfigFile(configPath);
      if (result) {
        // Successfully loaded configuration
        configLoaded = true;
        // Don't break, continue loading other configuration files, allow configuration merging
      }
    }
    
    if (!configLoaded) {
      console.log('No configuration file found, using environment variable configuration');
    }
    
    // Add default OpenAI model (if environment variable exists)
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

    // Add default Gemini model (if environment variable exists)
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

    // Add default Claude model (if environment variable exists)
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
   * Load model configuration from configuration file
   * @param configPath Configuration file path, defaults to ~/.shellconfig
   * @returns Whether the configuration was successfully loaded
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
        // Try to load from configuration file
        return false;
      }
      
      // Read file content
      const content = await fs.readFile(expandedPath, 'utf-8');
      
      // Parse JSON
      try {
        const config = JSON.parse(content);
        
        // If there is a models configuration, register the models
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
              
              // Check if provider is valid
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

// Export singleton instance
export const modelRegistry = ModelRegistry.getInstance();

// Convenience functions
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
 * Get the best available model client
 * Priority:
 * 1. Default model specified in the configuration file (settings.defaultModel)
 * 2. Specified model ID (passed as parameter)
 * 3. First model in the configuration file
 * 4. Default OpenAI model from environment variables
 * 5. Default openaiApi
 * @param customModelId Specified model ID (optional)
 * @param defaultModelName Default model name, used if no model is specified
 * @returns Model instance
 */
export const getBestAvailableModel = (customModelId?: string, defaultModelName: string = "gpt-4o") => {
  // Try to get model
  
  // Get all models
  const allModels = modelRegistry.getAllModels();
  // Loaded model configurations
  
  // 1. Check if there is a default model specified in the configuration file
  // Note: We need to implement a method to get settings, temporarily omitted
  
  // 2. If a model ID is specified, try to use that model
  if (customModelId) {
    const customClient = createClient(customModelId);
    const model = getModel(customModelId);
    if (customClient && model) {
      // Use specified model
      return customClient(model.model || defaultModelName);
    }
  }
  
  // 3. If there are models in the configuration file, use the first one
  if (allModels.length > 0) {
    const firstModel = allModels[0];
    const firstModelClient = createClient(firstModel.id);
    if (firstModelClient) {
      // Use the first model in the configuration file
      return firstModelClient(firstModel.model || defaultModelName);
    }
  }
  
  // 4. Try to use the default OpenAI model from environment variables
  const defaultClient = createClient("openai-default");
  const defaultModel = getModel("openai-default");
  if (defaultClient && defaultModel) {
    // Use the default OpenAI model from environment variables
    return defaultClient(defaultModel.model || defaultModelName);
  }
  
  // 5. If no model is specified, use the default openaiApi
  // Use the default openaiApi
  return openaiApi(defaultModelName);
};

/**
 * Load model configuration from configuration file
 * @param configPath Configuration file path, defaults to ~/.shellconfig
 * @returns Whether the configuration was successfully loaded
 */
export const loadFromConfigFile = async (configPath: string = '~/.shellconfig'): Promise<boolean> => {
  return modelRegistry.loadFromConfigFile(configPath);
};

/**
 * Load configuration files from multiple locations
 * Will try to load configuration from current directory, src directory, user home directory, etc.
 * @returns Whether any configuration was successfully loaded
 */
export const loadFromAllConfigLocations = async (): Promise<boolean> => {
  const configPaths = [
    './.shellconfig',                  // Current directory
    './.shellconfig.json',             // Current directory (explicit suffix)
    './src/.shellconfig',              // src directory
    './src/.shellconfig.json',         // src directory (explicit suffix)
    './src/shellconfig.json',          // src directory (no dot prefix)
    '~/.shellconfig',                  // User home directory
    '~/.shellconfig.json',             // User home directory (explicit suffix)
    '~/.config/shellconfig.json',      // User configuration directory
    '~/.config/closx/shellconfig.json' // User configuration directory (application specific)
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
 * Create configuration file template
 * @param configPath Configuration file path, defaults to ~/.shellconfig
 * @returns Whether the template was successfully created
 */
export const createConfigTemplate = async (configPath: string = '~/.shellconfig'): Promise<boolean> => {
  try {
    // Handle ~ in path
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

// Default export
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