import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

/**
 * 获取目录信息的工具
 * 返回指定目录的详细信息，包括文件列表、子目录和基本统计信息
 */
export const directoryInfoTool = createTool({
  id: 'directory-info',
  description: '获取指定目录的详细信息',
  inputSchema: z.object({
    path: z.string().optional().describe('要获取信息的目录路径，默认为当前工作目录'),
    includeHidden: z.boolean().optional().describe('是否包含隐藏文件，默认为false'),
    depth: z.number().optional().describe('递归深度，默认为1（只显示直接子项）'),
  }),
  outputSchema: z.object({
    path: z.string().describe('目录的绝对路径'),
    exists: z.boolean().describe('目录是否存在'),
    isDirectory: z.boolean().describe('路径是否为目录'),
    items: z.array(z.object({
      name: z.string().describe('文件或目录名称'),
      type: z.enum(['file', 'directory', 'symlink', 'other']).describe('项目类型'),
      size: z.number().optional().describe('文件大小（字节）'),
      isHidden: z.boolean().describe('是否为隐藏文件'),
      extension: z.string().optional().describe('文件扩展名（如果是文件）'),
      modifiedTime: z.string().describe('最后修改时间'),
    })).describe('目录中的项目列表'),
    stats: z.object({
      totalItems: z.number().describe('项目总数'),
      totalFiles: z.number().describe('文件总数'),
      totalDirectories: z.number().describe('目录总数'),
      totalSize: z.number().describe('所有文件的总大小（字节）'),
    }).describe('目录统计信息'),
  }),
  execute: async ({ context }) => {
    const targetPath = context.path || process.cwd();
    const includeHidden = context.includeHidden || false;
    const depth = context.depth || 1;

    try {
      // 检查路径是否存在
      const stat = await promisify(fs.stat)(targetPath);
      const isDirectory = stat.isDirectory();

      if (!isDirectory) {
        return {
          path: path.resolve(targetPath),
          exists: true,
          isDirectory: false,
          items: [],
          stats: {
            totalItems: 0,
            totalFiles: 0,
            totalDirectories: 0,
            totalSize: 0,
          },
        };
      }

      // 读取目录内容
      const items = await getDirectoryContents(targetPath, includeHidden, depth);

      // 计算统计信息
      const stats = {
        totalItems: items.length,
        totalFiles: items.filter(item => item.type === 'file').length,
        totalDirectories: items.filter(item => item.type === 'directory').length,
        totalSize: items.reduce((sum, item) => sum + (item.size || 0), 0),
      };

      return {
        path: path.resolve(targetPath),
        exists: true,
        isDirectory: true,
        items,
        stats,
      };
    } catch (error) {
      // 处理路径不存在的情况
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          path: path.resolve(targetPath),
          exists: false,
          isDirectory: false,
          items: [],
          stats: {
            totalItems: 0,
            totalFiles: 0,
            totalDirectories: 0,
            totalSize: 0,
          },
        };
      }
      
      // 重新抛出其他错误
      throw error;
    }
  },
});

/**
 * 获取目录内容的辅助函数
 * @param dirPath - 目录路径
 * @param includeHidden - 是否包含隐藏文件
 * @param depth - 递归深度
 * @returns 目录内容列表
 */
async function getDirectoryContents(
  dirPath: string, 
  includeHidden: boolean, 
  depth: number
): Promise<Array<{
  name: string;
  type: 'file' | 'directory' | 'symlink' | 'other';
  size?: number;
  isHidden: boolean;
  extension?: string;
  modifiedTime: string;
}>> {
  const readdir = promisify(fs.readdir);
  const stat = promisify(fs.stat);
  const lstat = promisify(fs.lstat);
  
  const fileNames = await readdir(dirPath);
  const result: Array<{
    name: string;
    type: 'file' | 'directory' | 'symlink' | 'other';
    size?: number;
    isHidden: boolean;
    extension?: string;
    modifiedTime: string;
  }> = [];
  
  for (const name of fileNames) {
    // 检查是否为隐藏文件
    const isHidden = name.startsWith('.');
    if (isHidden && !includeHidden) {
      continue;
    }
    
    const fullPath = path.join(dirPath, name);
    try {
      const lstats = await lstat(fullPath);
      const stats = await stat(fullPath);
      
      let type: 'file' | 'directory' | 'symlink' | 'other';
      if (lstats.isSymbolicLink()) {
        type = 'symlink';
      } else if (stats.isDirectory()) {
        type = 'directory';
      } else if (stats.isFile()) {
        type = 'file';
      } else {
        type = 'other';
      }
      
      const item: {
        name: string;
        type: 'file' | 'directory' | 'symlink' | 'other';
        size?: number;
        isHidden: boolean;
        extension?: string;
        modifiedTime: string;
      } = {
        name,
        type,
        isHidden,
        modifiedTime: stats.mtime.toISOString(),
      };
      
      if (type === 'file') {
        item.size = stats.size;
        item.extension = path.extname(name).replace(/^\./, '');
      }
      
      result.push(item);
    } catch (error) {
      // 忽略无法访问的文件
      continue;
    }
  }
  
  return result;
}
