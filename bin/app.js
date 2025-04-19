#!/usr/bin/env node

// 根据环境选择正确的入口文件格式
import { createRequire } from 'module';

/**
 * 创建一个require函数，用于在ESM环境中加载CJS模块
 * @type {NodeRequire}
 */
const require = createRequire(import.meta.url);

try {
  // 首先尝试ESM方式导入
  await import('../dist/index.mjs');
} catch (error) {
  try {
    // 如果ESM导入失败，尝试CJS方式导入
    require('../dist/index.cjs');
  } catch (innerError) {
    console.error('无法加载应用程序:', innerError);
    process.exit(1);
  }
}
