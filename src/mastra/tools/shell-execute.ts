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
      // 根据是否交互式选择不同的stdio模式
      const options: {
        cwd?: string;
        shell?: boolean;
        stdio?: any;
        detached?: boolean;
      } = {
        shell: true, // 使用shell执行命令
        detached: false // 不分离进程，以便于控制
      };
      
      // 如果是交互式模式，使用inherit模式来允许直接交互
      if (context.interactive) {
        options.stdio = 'inherit';
      } else {
        // 非交互式模式使用pipe捕获输出
        options.stdio = 'pipe';
      }
      
      if (context.cwd) {
        options.cwd = context.cwd;
      }
      
      console.log(`执行: ${context.command}`);
      
      // 使用spawn执行命令
      const childProcess = spawn(cmd, args, options);
      
      let stdoutData = '';
      let stderrData = '';
      
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
            stdout: stdoutData,
            stderr: stderrData + '\n命令被用户中断',
            exitCode: 130, // 用户中断退出码
          });
        }
      };
      
      // 添加SIGINT处理器
      process.on('SIGINT', sigintHandler);
      
      // 如果不是交互式模式，才收集输出
      if (!context.interactive) {
        // 收集标准输出
        childProcess.stdout?.on('data', (data) => {
          const output = data.toString();
          stdoutData += output;
          process.stdout.write(output); // 同时显示在终端上
        });
        
        // 收集标准错误
        childProcess.stderr?.on('data', (data) => {
          const output = data.toString();
          stderrData += output;
          process.stderr.write(output); // 同时显示在终端上
        });
      }
      
      // 如果是交互式模式，我们需要将标准输入传递给子进程
      if (context.interactive && process.stdin.isTTY) {
        // 设置原始模式，以便捕获每个按键
        process.stdin.setRawMode?.(true);
        process.stdin.resume();
        
        // 将用户输入传递给子进程
        const stdinHandler = (data: Buffer) => {
          // 如果按下 Ctrl+C，则发送 SIGINT 信号
          if (data.length === 1 && data[0] === 0x03) {
            process.emit('SIGINT', 'SIGINT');
            return;
          }
          
          // 将输入传递给子进程
          childProcess.stdin?.write(data);
        };
        
        process.stdin.on('data', stdinHandler);
        
        // 在命令结束时清理
        childProcess.on('close', () => {
          process.stdin.setRawMode?.(false);
          process.stdin.pause();
          process.stdin.removeListener('data', stdinHandler);
        });
      }
      
      // 命令执行完成后返回结果
      childProcess.on('close', (code) => {
        commandFinished = true;
        // 清理事件监听器
        process.removeListener('SIGINT', sigintHandler);
        
        // 如果是交互式模式，我们无法捕获输出，所以返回一个特殊的提示
        if (context.interactive) {
          resolve({
            stdout: '交互式命令执行完成',
            stderr: '',
            exitCode: code,
          });
        } else {
          // 非交互式模式返回捕获的输出
          resolve({
            stdout: stdoutData,
            stderr: stderrData,
            exitCode: code,
          });
        }
      });
      
      // 处理错误
      childProcess.on('error', (error) => {
        commandFinished = true;
        // 清理事件监听器
        process.removeListener('SIGINT', sigintHandler);
        
        console.error(`命令执行错误: ${error.message}`);
        resolve({
          stdout: stdoutData,
          stderr: `${stderrData}\n命令执行错误: ${error.message}`,
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
              stdout: stdoutData,
              stderr: `${stderrData}\n命令执行超时`,
              exitCode: 124, // 超时退出码
            });
          }
        }, context.timeout);
      }
    });
  },
});
