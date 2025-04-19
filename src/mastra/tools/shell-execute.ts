import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { exec,spawn } from 'child_process';
import { promisify } from 'util';

/**
 * 执行shell命令的工具
 * 使用Node.js自带的child_process模块执行shell命令
 */
export const shellExecuteTool = createTool({
  id: 'shell-execute',
  description: '执行shell命令并返回结果',
  inputSchema: z.object({
    command: z.string().describe('要执行的shell命令'),
    cwd: z.string().optional().describe('执行命令的工作目录'),
    timeout: z.number().optional().describe('命令执行超时时间(毫秒)'),
  }),
  outputSchema: z.object({
    stdout: z.string().describe('命令的标准输出'),
    stderr: z.string().describe('命令的标准错误输出'),
    exitCode: z.number().nullable().describe('命令的退出码，如果成功则为0'),
  }),
  execute: async ({ context }) => {
    const execPromise = promisify(exec);
    
    try {
      const options: {
        cwd?: string;
        timeout?: number;
      } = {};
      
      if (context.cwd) {
        options.cwd = context.cwd;
      }
      
      if (context.timeout) {
        options.timeout = context.timeout;
      }
      
      const { stdout, stderr } = await execPromise(context.command, options);
      
      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
      };
    } catch (error) {
      const execError = error as {
        stdout?: string;
        stderr?: string;
        code?: number | null;
      };
      
      return {
        stdout: (execError.stdout || '').trim(),
        stderr: (execError.stderr || '').trim(),
        exitCode: execError.code || 1,
      };
    }
  },
});
