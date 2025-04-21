/**
 * Shell Tag Processor Module
 */
import { ConsoleUtils } from '../utils/console-utils';
import { execInherit } from '../utils/exec-utils';
import chalk from 'chalk';

/**
 * 命令执行结果
 */
export type ShellCommandExecutionResult = {
  command: string;
  exitCode: number;
  prompt: string; // 要传递给agent的提示词
};

/**
 * Shell Tag Processor
 */
export class ShellTagProcessor {
  constructor() {}

  /**
   * 解析响应中的<shell>标签并提取命令
   * @param response - AI响应内容
   * @returns 提取的命令字符串数组
   */
  public async processShellTags(
    response: string
  ): Promise<string[]> {
    // 查找<shell></shell>标签内的内容
    const shellTagRegex = /<shell>([\s\S]*?)<\/shell>/g;
    let match;
    const commands: string[] = [];

    while ((match = shellTagRegex.exec(response)) !== null) {
      if (match[1]) {
        // 移除所有反引号和可能的Markdown格式
        const cmd = match[1].trim()
          .replace(/`/g, '')   // 移除所有反引号
          .trim();

        if (cmd) {
          commands.push(cmd);
        }
      }
    }

    // 保留简化版的命令显示
    if (commands.length > 0) {
      console.log(chalk.cyan('\n执行命令：'));
      for (let i = 0; i < commands.length; i++) {
        console.log(chalk.yellow(`> ${commands[i]}`));
      }
    }

    return commands;
  }

  /**
   * 使用inherit模式执行shell标签中的命令，并将结果作为提示词返回
   * @param command 要执行的命令
   * @returns 包含退出码和提示词的命令执行结果
   */
  public async executeShellTagCommand(command: string): Promise<ShellCommandExecutionResult> {
    try {
      // 使用继承模式执行命令，简化提示
      console.log(chalk.cyan(`\n$ ${command}`));
      
      const startTime = new Date();
      const result = await execInherit(command);
      const endTime = new Date();
      const executionTime = (endTime.getTime() - startTime.getTime()) / 1000;
      
      // 只显示简单的退出状态
      if (result.exitCode !== 0) {
        console.log(chalk.red(`\n命令退出码: ${result.exitCode} (${executionTime.toFixed(1)}s)`));
      }
      
      // 创建要传递给agent的提示词
      const prompt = `
## 命令执行结果
命令: \`${command}\`
退出码: ${result.exitCode}
${result.exitCode === 0 ? '命令执行成功。' : `命令执行失败，返回退出码 ${result.exitCode}。`}
      `.trim();
      
      return {
        command,
        exitCode: result.exitCode,
        prompt
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(chalk.red(`\n命令执行错误: ${errorMessage}`));
      
      // 简化错误提示词
      const prompt = `
## 命令执行错误
命令: \`${command}\`
错误: ${errorMessage}
      `.trim();
      
      return {
        command,
        exitCode: 1,
        prompt
      };
    }
  }
}
