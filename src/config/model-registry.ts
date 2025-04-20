import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createOpenAI } from '@ai-sdk/openai';
import { ModelConfig, ProviderType } from './types';
import {
  OPENAI_API_KEY,
  OPENAI_API_BASE_URL,
  OPENAI_MODEL,
  GEMINI_API_KEY,
  GEMINI_API_BASE_URL,
  GEMINI_MODEL,
  CLAUDE_API_KEY,
  CLAUDE_API_BASE_URL,
  CLAUDE_MODEL
} from './env';

/**
 * 创建OpenAI格式API客户端
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
    // 注意：加载配置文件已移至getInstance方法以进行异步执行
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
      './.closx',                  // 当前目录
      './.closx.json',             // 当前目录（显式后缀）
      './src/.closx',              // src目录
      './src/.closx.json',         // src目录（显式后缀）
      './src/closx.json',          // src目录（无点前缀）
      '~/.closx',                  // 用户主目录
      '~/.closx.json',             // 用户主目录（显式后缀）
      '~/.config/closx.json',      // 用户配置目录
      '~/.config/closx/config.json' // 用户配置目录（应用特定）
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
    if (process.env.OPENAI_API_KEY) {
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
    if (process.env.GEMINI_API_KEY) {
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
    if (process.env.CLAUDE_API_KEY) {
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
   * @param configPath 配置文件路径，默认为~/.closx.json
   * @returns 配置是否成功加载
   */
  public async loadFromConfigFile(configPath: string = '~/.closx.json'): Promise<boolean> {
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
        
        // 如果有models配置，注册模型
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
