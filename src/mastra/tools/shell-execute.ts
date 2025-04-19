import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { spawn } from 'child_process';
import { promisify } from 'util';
import * as readline from 'readline';

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
    interactive: z.boolean().optional().describe('是否以交互式模式执行命令'),
  }),
  outputSchema: z.object({
    stdout: z.string().describe('命令的标准输出'),
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
      } = {
        shell: true, // 使用shell执行命令
        stdio: context.interactive ? 'pipe' : 'pipe' // 交互式模式下使用pipe
      };
      
      if (context.cwd) {
        options.cwd = context.cwd;
      }
      
      // 使用spawn执行命令
      const childProcess = spawn(cmd, args, options);
      
      let stdoutData = '';
      let stderrData = '';
      
      // 创建一个标记，表示命令是否已经结束
      let commandFinished = false;
      
      // 处理用户中断
      process.on('SIGINT', () => {
        if (!commandFinished) {
          console.log('\n用户中断了命令执行');
          childProcess.kill('SIGINT');
          resolve({
            stdout: stdoutData.trim(),
            stderr: stderrData.trim() + '\n命令被用户中断',
            exitCode: 130, // 用户中断退出码
          });
        }
      });
      
      // 实时输出标准输出
      childProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdoutData += output;
        process.stdout.write(output); // 实时输出到控制台
      });
      
      // 实时输出标准错误
      childProcess.stderr.on('data', (data) => {
        const output = data.toString();
        stderrData += output;
        process.stderr.write(output); // 实时输出到控制台
      });
      
      // 如果是交互式命令，设置标准输入
      if (context.interactive) {
        // 创建readline接口
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
          terminal: true
        });
        
        // 监听用户输入
        rl.on('line', (input) => {
          if (childProcess.stdin.writable) {
            childProcess.stdin.write(input + '\n');
          }
        });
        
        // 命令结束时关闭readline
        childProcess.on('close', () => {
          rl.close();
        });
        
        // 当readline关闭时恢复标准输入
        rl.on('close', () => {
          process.stdin.resume();
        });
      }
      
      // 命令执行完成后返回结果
      childProcess.on('close', (code) => {
        commandFinished = true;
        resolve({
          stdout: stdoutData.trim(),
          stderr: stderrData.trim(),
          exitCode: code,
        });
      });
      
      // 设置超时
      if (context.timeout) {
        setTimeout(() => {
          if (!commandFinished) {
            childProcess.kill();
            resolve({
              stdout: stdoutData.trim(),
              stderr: stderrData.trim() + '\n命令执行超时',
              exitCode: 124, // 超时退出码
            });
          }
        }, context.timeout);
      }
    });
  },
});
