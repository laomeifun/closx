/**
 * 配置文件入口
 * 
 * 该文件导出所有配置相关的类型、常量和函数
 * 配置已被重构为模块化结构，位于 src/config/ 目录下
 */

// 导出所有配置模块
export * from './config/types';
export * from './config/env';
export * from './config/model-registry';
export * from './config/settings';
export * from './config/utils';

// 导入各个模块的默认导出
import { openaiApi, createOpenAIClient, modelRegistry } from './config/model-registry';
import { settingsManager } from './config/settings';
import { getBestAvailableModel, loadFromConfigFile, loadFromAllConfigLocations, createConfigTemplate } from './config/utils';

// 这些类型已移至 src/config/types.ts

// ModelRegistry 类已移至 src/config/model-registry.ts

// 这些便捷函数已移至 src/config/model-registry.ts

// getBestAvailableModel 函数已移至 src/config/utils.ts

// 这些配置加载函数已移至 src/config/utils.ts

// createConfigTemplate 函数已移至 src/config/utils.ts

// 默认导出
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