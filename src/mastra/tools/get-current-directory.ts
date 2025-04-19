import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Tool to get the current working directory
 * Uses Node.js process.cwd() method to get the current working directory
 */
export const getCurrentDirectoryTool = createTool({
  id: 'get-current-directory',
  description: 'Get the path of the current working directory',
  inputSchema: z.object({}).optional(),
  outputSchema: z.object({
    currentDirectory: z.string().describe('Absolute path of the current working directory'),
  }),
  execute: async () => {
    try {
      const currentDirectory = process.cwd();
      return {
        currentDirectory,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get current working directory: ${errorMessage}`);
    }
  },
});
