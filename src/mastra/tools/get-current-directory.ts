import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * 获取当前工作目录的工具
 * 使用Node.js的process.cwd()方法获取当前工作目录
 */
export const getCurrentDirectoryTool = createTool({
  id: 'get-current-directory',
  description: '获取当前工作目录的路径',
  inputSchema: z.object({}).optional(),
  outputSchema: z.object({
    currentDirectory: z.string().describe('当前工作目录的绝对路径'),
  }),
  execute: async () => {
    try {
      const currentDirectory = process.cwd();
      return {
        currentDirectory,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`获取当前工作目录失败: ${errorMessage}`);
    }
  },
});
