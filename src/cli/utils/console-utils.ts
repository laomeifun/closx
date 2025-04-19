/**
 * 控制台输出相关工具函数
 */
import chalk from 'chalk';
import ora, { Ora } from 'ora';

/**
 * 控制台工具类
 */
export class ConsoleUtils {
  /**
   * 显示AI思考中的加载动画
   * @returns 加载动画实例
   */
  public static showThinkingSpinner(): Ora {
    return ora('🤔 AI 思考中...').start();
  }
  
  /**
   * 显示命令执行中的加载动画
   * @param command - 正在执行的命令
   * @returns 加载动画实例
   */
  public static showCommandSpinner(command: string): Ora {
    return ora(`⚙️ 执行命令: ${command}`).start();
  }
  
  /**
   * 格式化命令显示
   * @param command - 要格式化的命令
   * @returns 格式化后的命令字符串
   */
  public static formatCommand(command: string): string {
    return chalk.green(`执行: ${command}`);
  }
  
  /**
   * 显示AI响应头
   */
  public static showResponseHeader(): void {
    console.log(chalk.blue('🤖 AI > '));
  }
  
  /**
   * 显示错误信息
   * @param message - 错误消息
   * @param error - 错误对象
   */
  public static showError(message: string, error?: Error | unknown): void {
    console.error(chalk.red(`❌ ${message}`), error);
  }
  
  /**
   * 显示警告信息
   * @param message - 警告消息
   */
  public static showWarning(message: string): void {
    console.log(chalk.yellow(`⚠️ ${message}`));
  }
  
  /**
   * 显示成功信息
   * @param message - 成功消息
   */
  public static showSuccess(message: string): void {
    console.log(chalk.green(`✅ ${message}`));
  }
  
  /**
   * 显示信息
   * @param message - 信息消息
   */
  public static showInfo(message: string): void {
    console.log(chalk.gray(`ℹ️ ${message}`));
  }
  
  /**
   * 显示帮助信息
   */
  public static showHelpInfo(): void {
    console.log(chalk.yellow('\n📖 可用命令:'));
    console.log(chalk.yellow('❓ /help') + ' - 显示此帮助信息');
    console.log(chalk.yellow('🚪 /quit') + ' - 退出程序');
    console.log(chalk.yellow('💻 /exec <命令>') + ' - 执行 shell 命令');
    console.log(chalk.yellow('🔄 /clear') + ' - 清除对话历史');
    console.log(chalk.yellow('🌐 /env') + ' - 显示当前环境信息');
    console.log('\n');
  }
}
