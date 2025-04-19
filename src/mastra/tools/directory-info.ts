import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

/**
 * Directory information tool
 * Returns detailed information about the specified directory, including file list, subdirectories, and basic statistics
 */
export const directoryInfoTool = createTool({
  id: 'directory-info',
  description: 'Get detailed information about the specified directory',
  inputSchema: z.object({
    path: z.string().optional().describe('Directory path to get information for, defaults to current working directory'),
    includeHidden: z.boolean().optional().describe('Whether to include hidden files, defaults to false'),
    depth: z.number().optional().describe('Recursion depth, defaults to 1 (only direct children)'),
  }),
  outputSchema: z.object({
    path: z.string().describe('Absolute path of the directory'),
    exists: z.boolean().describe('Whether the directory exists'),
    isDirectory: z.boolean().describe('Whether the path is a directory'),
    items: z.array(z.object({
      name: z.string().describe('File or directory name'),
      type: z.enum(['file', 'directory', 'symlink', 'other']).describe('Item type'),
      size: z.number().optional().describe('File size (bytes)'),
      isHidden: z.boolean().describe('Whether it is a hidden file'),
      extension: z.string().optional().describe('File extension (if it is a file)'),
      modifiedTime: z.string().describe('Last modified time'),
    })).describe('List of items in the directory'),
    stats: z.object({
      totalItems: z.number().describe('Total number of items'),
      totalFiles: z.number().describe('Total number of files'),
      totalDirectories: z.number().describe('Total number of directories'),
      totalSize: z.number().describe('Total size of all files (bytes)'),
    }).describe('Directory statistics'),
  }),
  execute: async ({ context }) => {
    const targetPath = context.path || process.cwd();
    const includeHidden = context.includeHidden || false;
    const depth = context.depth || 1;

    try {
      // Check if path exists
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

      // Read directory contents
      const items = await getDirectoryContents(targetPath, includeHidden, depth);

      // Calculate statistics
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
      // Handle case where path doesn't exist
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
      
      // Re-throw other errors
      throw error;
    }
  },
});

/**
 * Helper function to get directory contents
 * @param dirPath - Directory path
 * @param includeHidden - Whether to include hidden files
 * @param depth - Recursion depth
 * @returns List of directory contents
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
    // Check if it's a hidden file
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
      // Ignore inaccessible files
      continue;
    }
  }
  
  return result;
}
