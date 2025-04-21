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

    // 保留此块以通知用户找到了标签
    if (commands.length > 0) {
      ConsoleUtils.showInfo('\n' + chalk.blue('📌 在响应中找到<shell>标签命令：'));
      // 显示提取的命令（仅供参考）
      for (let i = 0; i < commands.length; i++) {
        console.log(`  ${chalk.cyan(`[${i + 1}/${commands.length}]`)} ${chalk.yellow(ConsoleUtils.formatCommand(commands[i]))}`);
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
      // 使用inherit模式执行命令，这样用户可以看到实时输出并进行交互
      console.log('\n' + chalk.cyan('╭─────────────────────────────────────────────'));
      console.log(chalk.cyan('│') + chalk.yellow(' 执行命令: ') + chalk.green(command));
      console.log(chalk.cyan('╰─────────────────────────────────────────────\n'));
      
      // 显示命令开始执行的时间戳
      const startTime = new Date();
      console.log(chalk.gray(`[${startTime.toLocaleTimeString()}] 命令开始执行...\n`));
      
      const result = await execInherit(command);
      
      // 显示命令结束执行的时间戳和耗时
      const endTime = new Date();
      const executionTime = (endTime.getTime() - startTime.getTime()) / 1000; // 转换为秒
      
      console.log('\n' + chalk.gray(`[${endTime.toLocaleTimeString()}] 命令执行${result.exitCode === 0 ? chalk.green('完成') : chalk.red('失败')} (耗时: ${executionTime.toFixed(2)}秒)`));
      console.log(chalk.cyan('╭─────────────────────────────────────────────'));
      console.log(chalk.cyan('│') + chalk.yellow(' 退出码: ') + (result.exitCode === 0 ? chalk.green(result.exitCode) : chalk.red(result.exitCode)));
      console.log(chalk.cyan('╰─────────────────────────────────────────────\n'));
      
      // 创建要传递给agent的提示词
      const prompt = `
## 命令执行结果
以下是您请求执行的命令的结果:

命令: \`${command}\`
退出码: ${result.exitCode}
执行时间: ${executionTime.toFixed(2)}秒

请注意，命令已经以交互模式执行完成，输出已经显示给用户。
${result.exitCode === 0 ? '命令执行成功。' : `命令执行失败，返回退出码 ${result.exitCode}。请分析可能的原因并提供解决方案。`}
      `.trim();
      
      return {
        command,
        exitCode: result.exitCode,
        prompt
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      ConsoleUtils.showError(`命令执行失败: ${errorMessage}`);
      
      // 创建错误提示词
      const prompt = `
## 命令执行错误
尝试执行以下命令时发生错误:

命令: \`${command}\`
错误: ${errorMessage}

请检查命令语法或尝试不同的方法。分析错误原因并提供解决方案。
      `.trim();
      
      return {
        command,
        exitCode: 1,
        prompt
      };
    }
  }
}
