// 导出类型
export * from './types';

// 导出环境变量
export * from './env';

// 导出模型注册表
export * from './model-registry';

// 导出设置
export * from './settings';

// 导出工具函数
export * from './utils';

// 默认导出
import { openaiApi, createOpenAIClient, modelRegistry } from './model-registry';
import { settingsManager } from './settings';
import { getBestAvailableModel, loadFromConfigFile, loadFromAllConfigLocations, createConfigTemplate } from './utils';

export default {
  // 模型相关
  openaiApi,
  createOpenAIClient,
  modelRegistry,
  
  // 设置相关
  settingsManager,
  
  // 工具函数
  getBestAvailableModel,
  loadFromConfigFile,
  loadFromAllConfigLocations,
  createConfigTemplate
};
