import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { spawn } from 'child_process';

/**
 * 执行shell命令的工具
 * 使用Node.js自带的child_process模块执行shell命令
 * 只处理非交互式命令，但会将输出显示到终端
 */
export const shellExecuteTool = createTool({
  id: 'shell-execute',
  description: '执行非交互式shell命令并返回结果',
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
        stdio: 'pipe', // 使用pipe捕获输出
        detached: false // 不分离进程，以便于控制
      };
      
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
      
      // 命令执行完成后返回结果
      childProcess.on('close', (code) => {
        commandFinished = true;
        // 清理事件监听器
        process.removeListener('SIGINT', sigintHandler);
        
        // 返回捕获的输出
        resolve({
          stdout: stdoutData,
          stderr: stderrData,
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
