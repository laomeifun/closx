import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { ConfigFile } from './types';
import { openaiApi } from './model-registry';
import { getModel, createClient } from './model-registry';
import { getDefaultModelId } from './settings';

/**
 * 获取最佳可用模型客户端
 * 优先级：
 * 1. 配置文件中指定的默认模型（settings.defaultModel）
 * 2. 指定的模型ID（作为参数传递）
 * 3. 环境变量中的默认OpenAI模型
 * 4. 默认openaiApi
 * @param customModelId 指定的模型ID（可选）
 * @param defaultModelName 默认模型名称，在未指定模型时使用
 * @returns 模型实例
 */
export const getBestAvailableModel = (customModelId?: string, defaultModelName: string = "gpt-4o") => {
  // 尝试获取模型
  
  // 1. 检查配置文件中是否指定了默认模型
  const defaultModelId = getDefaultModelId();
  if (defaultModelId) {
    const defaultClient = createClient(defaultModelId);
    const defaultModel = getModel(defaultModelId);
    if (defaultClient && defaultModel) {
      // 使用配置文件中指定的默认模型
      return defaultClient(defaultModel.model || defaultModelName);
    }
  }
  
  // 2. 如果指定了模型ID，尝试使用该模型
  if (customModelId) {
    const customClient = createClient(customModelId);
    const model = getModel(customModelId);
    if (customClient && model) {
      // 使用指定的模型
      return customClient(model.model || defaultModelName);
    }
  }
  
  // 3. 尝试使用环境变量中的默认OpenAI模型
  const envDefaultClient = createClient("openai-default");
  const envDefaultModel = getModel("openai-default");
  if (envDefaultClient && envDefaultModel) {
    // 使用环境变量中的默认OpenAI模型
    return envDefaultClient(envDefaultModel.model || defaultModelName);
  }
  
  // 4. 如果未指定模型，使用默认openaiApi
  // 使用默认openaiApi
  return openaiApi(defaultModelName);
};

/**
 * 从配置文件加载配置
 * @param configPath 配置文件路径，默认为~/.closx
 * @returns 配置是否成功加载
 */
export const loadFromConfigFile = async (configPath: string = '~/.closx'): Promise<boolean> => {
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
      JSON.parse(content);
      return true;
    } catch (error) {
      // 无效的JSON格式
      return false;
    }
  } catch (error) {
    // 读取配置文件失败
    return false;
  }
};

/**
 * 从多个位置加载配置文件
 * 将尝试从当前目录、src目录、用户主目录等加载配置
 * @returns 是否成功加载任何配置
 */
export const loadFromAllConfigLocations = async (): Promise<boolean> => {
  const configPaths = [
    './.closx',                  // 当前目录
    './.closx.json',             // 当前目录（显式后缀）
    './src/.closx',              // src目录
    './src/.closx.json',         // src目录（显式后缀）
    './src/closx.json',          // src目录（无点前缀）
    '~/.closx',                  // 用户主目录
    '~/.closx.json',             // 用户主目录（显式后缀）
    '~/.config/closx.json',      // 用户配置目录
    '~/.config/closx/closx.json' // 用户配置目录（应用特定）
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
 * @param configPath 配置文件路径，默认为~/.closx
 * @returns 模板是否成功创建
 */
export const createConfigTemplate = async (configPath: string = '~/.closx'): Promise<boolean> => {
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
    const template: ConfigFile = {
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
      
      // 其他配置
      settings: {
        defaultModel: 'openai-custom',  // 默认使用的模型ID
        logLevel: 'info',              // 日志级别
        allowAutoExecution: false,     // 是否允许自动执行命令
        // 命令执行白名单，允许自动执行的命令
        commandWhitelist: [
          'ls', 'cat', 'echo', 'pwd', 'find', 'grep',
          'npm list', 'npm run', 'npm start', 'npm test',
          'node --version', 'npm --version'
        ],
        // 命令执行黑名单，禁止执行的命令
        commandBlacklist: [
          'rm -rf', 'sudo', 'chmod 777', 'mkfs',
          'dd if=/dev/zero', 'mv /* /dev/null'
        ]
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
