/**
 * 交互式终端代理
 * 提供与 AI 代理交互的命令行界面
 */
import { Command } from 'commander';
import chalk from 'chalk';

import { TerminalAgentOptions } from './types/terminal-types';
import { SessionService } from './services/session-service';
import { CommandProcessorService } from './services/command-processor-service';
import { TerminalUI } from './ui/terminal-ui';

// 添加信号处理，使程序在 Ctrl+C 时干净地退出
process.on('SIGINT', () => {
  console.log('\n程序已终止');
  process.exit(0);
});

/**
 * 终端代理类
 * 整合各模块功能提供完整的交互式终端体验
 */
export class TerminalAgent {
  private readonly program: Command;
  private readonly sessionService: SessionService;
  private readonly commandProcessor: CommandProcessorService;
  private readonly terminalUI: TerminalUI;

  /**
   * 构造函数
   */
  constructor() {
    this.program = new Command();
    this.sessionService = new SessionService();
    this.terminalUI = new TerminalUI();
    this.commandProcessor = new CommandProcessorService(this.sessionService, this.terminalUI);

    this.setupCommands();
  }

  /**
   * 设置命令行参数
   */
  private setupCommands(): void {
    this.program
      .name('closx')
      .description('交互式终端代理')
      .version('1.0.0')
      .option('-v, --verbose', '显示详细输出')
      .option('-i, --interactive', '进入交互式界面')
      .argument('[command]', '直接执行命令')
      .action(async (command, options) => {
        if (command) {
          // 检查命令是否是特殊命令
          if (command.startsWith('/')) {
            await this.commandProcessor.handleSpecialCommand(command);
          } else {
            // 直接执行普通命令（作为AI输入）
            await this.executeOneCommand(command, { verbose: options.verbose });
          }
        } else if (options.interactive || !command) {
          // 交互式界面模式
          await this.startInteractiveSession({ verbose: options.verbose });
        }
      });
  }

  /**
   * 解析命令行参数并启动程序
   * @param args - 命令行参数
   */
  public async run(args: string[] = process.argv): Promise<void> {
    await this.program.parseAsync(args);
  }

  /**
   * 启动交互式会话
   * @param options - 终端代理选项
   */
  private async startInteractiveSession(options: TerminalAgentOptions = {}): Promise<void> {
    this.terminalUI.showWelcomeMessage(this.sessionService.getCurrentDir());

    // 添加系统消息
    this.sessionService.addSystemMessage();

    await this.chatLoop(options);
  }

  /**
   * 主聊天循环
   * @param options - 终端代理选项
   */
  private async chatLoop(options: TerminalAgentOptions): Promise<void> {
    while (true) {
      try {
        const userInput = await this.terminalUI.getUserInput();

        if (!userInput || userInput.trim() === '') {
          continue;
        }

        // 处理特殊命令
        if (userInput.startsWith('/')) {
          const handled = await this.commandProcessor.handleSpecialCommand(userInput);
          if (handled) continue;
        }

        // 添加用户消息
        this.sessionService.addUserMessage(userInput);

        // 处理用户输入，获取代理响应
        let needsProcessing = await this.commandProcessor.processAgentResponse(options);
        
        // 循环处理命令结果，直到不再需要
        while (needsProcessing) {
          needsProcessing = await this.commandProcessor.processCommandResults(options);
        }
      } catch (error) {
        // 如果是 ExitPromptError，说明用户按了 Ctrl+C，直接退出
        if (error && (error as any).name === 'ExitPromptError') {
          this.terminalUI.showExitMessage();
          process.exit(0);
          return; // 防止后续代码执行
        }
        
        // 其他错误正常处理
        console.error('\n程序运行出错:', error);
      }
    }
  }

  /**
   * 一次性执行命令
   * @param command - 执行命令
   * @param options - 终端代理选项
   */
  private async executeOneCommand(command: string, options: TerminalAgentOptions = {}): Promise<void> {
    try {
      await this.commandProcessor.executeOneCommand(command, options);
      
      // 在一次性命令执行完成后自动退出
      // 使用延时确保所有输出已经完成
      setTimeout(() => {
        this.terminalUI.showExitMessage('命令执行完成，程序即将退出...');
        process.exit(0);
      }, 500);
    } catch (error) {
      console.error('命令执行失败:', error);
      process.exit(1);
    }
  }
}
