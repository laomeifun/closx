/**
 * 终端界面组件
 * 负责终端UI交互和显示
 */
import inquirer from 'inquirer';
import chalk from 'chalk';
import { ConsoleUtils } from '../utils/console-utils';

/**
 * 终端界面组件类
 * 负责处理终端UI交互和显示
 */
export class TerminalUI {
  /**
   * 显示欢迎信息
   * @param workingDir - 当前工作目录
   */
  public showWelcomeMessage(workingDir: string): void {
    console.log(chalk.blue('💻 === 交互式终端代理 ==='));
    console.log(chalk.gray(`📂 工作目录: ${workingDir}`));
    console.log(chalk.yellow('\n💡 提示: 输入 /help 查看可用命令\n'));
  }

  /**
   * 获取用户输入
   * @returns 用户输入的内容
   */
  public async getUserInput(): Promise<string> {
    const { userInput } = await inquirer.prompt({
      type: 'input',
      name: 'userInput',
      message: chalk.green('👤 用户 >')
    });
    
    return userInput ? userInput.trim() : '';
  }

  /**
   * 显示AI响应
   * @param text - 响应文本
   */
  public displayAIResponse(text: string): void {
    ConsoleUtils.showResponseHeader();
    process.stdout.write(text);
    console.log('\n');
  }

  /**
   * 显示错误信息
   * @param message - 错误消息
   * @param error - 错误对象
   */
  public showError(message: string, error: Error): void {
    ConsoleUtils.showError(message, error);
  }

  /**
   * 显示思考中动画
   * @returns 动画控制器
   */
  public showThinkingAnimation() {
    return ConsoleUtils.showThinkingSpinner();
  }

  /**
   * 显示程序退出消息
   * @param message - 退出消息
   */
  public showExitMessage(message = '程序已终止'): void {
    console.log(`\n${message}`);
  }

  /**
   * 显示命令行帮助信息
   */
  public showCommandLineHelp(): void {
    console.log(chalk.cyan('\n===== 命令行帮助 ====='));
    console.log(chalk.yellow('用法: closx [options] [command]'));
    console.log('\n选项:');
    console.log('  -v, --verbose     显示详细输出');
    console.log('  -i, --interactive 进入交互式界面');
    console.log('  -h, --help        显示帮助信息');
    console.log('\n示例:');
    console.log('  closx                    - 进入交互式界面');
    console.log('  closx "帮我查看当前目录文件"  - 执行单个命令');
    console.log(chalk.cyan('=====================\n'));
  }
}
