import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { spawn } from 'child_process';
import { promisify } from 'util';
import * as readline from 'readline';

/**
 * 交互式执行shell命令的工具
 * 允许用户与命令进行交互，并在命令完成后注入执行结果
 */
export const interactiveShellExecuteTool = createTool({
  id: 'interactive-shell-execute',
  description: '以交互式模式执行shell命令，允许用户与命令交互',
  inputSchema: z.object({
    command: z.string().describe('要执行的shell命令'),
    cwd: z.string().optional().describe('执行命令的工作目录'),
    timeout: z.number().optional().describe('命令执行超时时间(毫秒)'),
  }),
  outputSchema: z.object({
    stdout: z.string().describe('命令的标准输出（交互式模式下为特殊提示）'),
    stderr: z.string().describe('命令的标准错误输出'),
    exitCode: z.number().nullable().describe('命令的退出码，如果成功则为0'),
  }),
  execute: async ({ context }) => {
    return new Promise((resolve) => {
      // 解析命令和参数
      const args = context.command.split(' ');
      const cmd = args.shift() || '';
      
      // 设置选项
      const options: {
        cwd?: string;
        shell?: boolean;
        stdio?: any;
        detached?: boolean;
      } = {
        shell: true, // 使用shell执行命令
        stdio: 'inherit', // 直接继承父进程的标准输入输出，允许交互
        detached: false // 不分离进程，以便于控制
      };
      
      if (context.cwd) {
        options.cwd = context.cwd;
      }
      
      console.log(`执行交互式命令: ${context.command}`);
      
      // 使用spawn执行命令
      const childProcess = spawn(cmd, args, options);
      
      // 创建一个标记，表示命令是否已经结束
      let commandFinished = false;
      
      // 创建一个一次性的SIGINT处理器
      const sigintHandler = () => {
        if (!commandFinished) {
          console.log('\n用户中断了命令执行');
          childProcess.kill('SIGINT');
          // 清理事件监听器
          process.removeListener('SIGINT', sigintHandler);
          resolve({
            stdout: '[交互式命令被用户中断]',
            stderr: '',
            exitCode: 130, // 用户中断退出码
          });
        }
      };
      
      // 添加SIGINT处理器
      process.on('SIGINT', sigintHandler);
      
      // 命令执行完成后返回结果
      childProcess.on('close', (code) => {
        commandFinished = true;
        // 清理事件监听器
        process.removeListener('SIGINT', sigintHandler);
        
        // 交互式命令没有标准输出收集，使用特殊提示
        resolve({
          stdout: `[交互式命令已执行完成，退出码: ${code}]`,
          stderr: '',
          exitCode: code,
        });
      });
      
      // 处理错误
      childProcess.on('error', (error) => {
        commandFinished = true;
        // 清理事件监听器
        process.removeListener('SIGINT', sigintHandler);
        
        console.error(`命令执行错误: ${error.message}`);
        resolve({
          stdout: '',
          stderr: `命令执行错误: ${error.message}`,
          exitCode: 1,
        });
      });
      
      // 设置超时
      if (context.timeout) {
        setTimeout(() => {
          if (!commandFinished) {
            childProcess.kill();
            // 清理事件监听器
            process.removeListener('SIGINT', sigintHandler);
            
            resolve({
              stdout: '',
              stderr: `命令执行超时`,
              exitCode: 124, // 超时退出码
            });
          }
        }, context.timeout);
      }
    });
  },
});
