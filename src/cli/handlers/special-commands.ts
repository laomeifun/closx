/**
 * 特殊命令处理模块
 */
import { ChatMessage } from '../types/terminal-types';
import { ConsoleUtils } from '../utils/console-utils';
import { ShellExecutor } from '../utils/shell-executor';

/**
 * 特殊命令处理器
 */
export class SpecialCommandHandler {
  private readonly shellExecutor: ShellExecutor;

  constructor() {
    this.shellExecutor = new ShellExecutor();
  }

  /**
   * 处理特殊命令
   * @param command - 用户输入的命令
   * @param currentDir - 当前工作目录
   * @param messages - 消息历史记录
   * @returns 是否处理了命令
   */
  public async handle(
    command: string, 
    currentDir: string,
    messages: ChatMessage[]
  ): Promise<boolean> {
    const cmd = command.trim().toLowerCase();

    // 帮助命令
    if (cmd === '/help') {
      ConsoleUtils.showHelpInfo();
      return true;
    }

    // 退出命令
    if (cmd === '/quit') {
      ConsoleUtils.showInfo('再见!');
      process.exit(0);
    }

    // 执行shell命令
    if (cmd.startsWith('/exec ')) {
      await this.handleExecCommand(cmd.substring(6).trim(), currentDir);
      return true;
    }

    // 清除对话历史
    if (cmd === '/clear') {
      const systemMessages = messages.filter(msg => msg.role === 'system');
      messages.length = 0;
      systemMessages.forEach(msg => messages.push(msg));
      ConsoleUtils.showSuccess('已清除对话历史');
      return true;
    }

    // 显示环境信息
    if (cmd === '/env') {
      await this.handleEnvCommand(currentDir);
      return true;
    }

    return false;
  }

  /**
   * 处理/exec命令
   * @param shellCmd - shell命令
   * @param currentDir - 当前工作目录
   */
  private async handleExecCommand(shellCmd: string, currentDir: string): Promise<void> {
    try {
      const result = await this.shellExecutor.execute(shellCmd, currentDir);
      
      if (result.stdout) {
        ConsoleUtils.showInfo('输出:');
        console.log(result.stdout);
      }
      
      if (result.stderr) {
        ConsoleUtils.showError('错误:');
        console.log(result.stderr);
      }
    } catch (error: unknown) {
      ConsoleUtils.showError('执行命令失败:', error as Error);
    }
  }

  /**
   * 处理/env命令
   * @param currentDir - 当前工作目录
   */
  private async handleEnvCommand(currentDir: string): Promise<void> {
    try {
      const result = await this.shellExecutor.execute('printenv', currentDir);
      ConsoleUtils.showInfo('环境变量:');
      console.log(result.stdout);
    } catch (error: unknown) {
      ConsoleUtils.showError('获取环境变量失败:', error as Error);
    }
  }
}
