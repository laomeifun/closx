/**
 * 交互式终端代理
 * 提供与 AI 代理交互的命令行界面
 */
import inquirer from 'inquirer';
import chalk from 'chalk';
import { Command } from 'commander';

import { ChatMessage, SessionState, TerminalAgentOptions } from './types/terminal-types';
import { ConsoleUtils } from './utils/console-utils';
import { PromptGenerator } from './utils/prompt-generator';
import { SpecialCommandHandler } from './handlers/special-commands';
import { ShellTagProcessor } from './handlers/shell-tag-processor';
import { AgentService } from './services/agent-service';

/**
 * 终端代理类
 * 整合各模块功能提供完整的交互式终端体验
 */
export class TerminalAgent {
  private readonly program: Command;
  private readonly state: SessionState;
  private readonly promptGenerator: PromptGenerator;
  private readonly specialCommandHandler: SpecialCommandHandler;
  private readonly shellTagProcessor: ShellTagProcessor;
  private readonly agentService: AgentService;

  /**
   * 构造函数
   */
  constructor() {
    this.program = new Command();
    this.promptGenerator = new PromptGenerator();
    this.specialCommandHandler = new SpecialCommandHandler();
    this.shellTagProcessor = new ShellTagProcessor();
    this.agentService = new AgentService();

    this.state = {
      messages: [],
      currentDir: process.cwd(),
      resourceId: this.agentService.generateResourceId(),
      threadId: this.agentService.generateThreadId(),
    };

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
          // 直接执行命令模式
          await this.executeOneCommand(command, { verbose: options.verbose });
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
    console.log(chalk.blue('💻 === 交互式终端代理 ==='));
    console.log(chalk.gray(`📂 工作目录: ${this.state.currentDir}`));
    console.log(chalk.yellow('\n💡 提示: 输入 /help 查看可用命令\n'));

    // 添加简单的系统消息（不包含环境信息，因为agent层已经包含）
    this.state.messages.push({
      role: 'system',
      content: `当前会话ID: ${this.state.threadId}
当前时间: ${new Date().toISOString()}`
    });

    await this.chatLoop(options);
  }

  /**
   * 主聊天循环
   * @param options - 终端代理选项
   */
  private async chatLoop(options: TerminalAgentOptions): Promise<void> {
    while (true) {
      const { userInput } = await inquirer.prompt({
        type: 'input',
        name: 'userInput',
        message: chalk.green('👤 用户 >')
      });

      if (!userInput || userInput.trim() === '') {
        continue;
      }

      // 处理特殊命令
      if (userInput.startsWith('/')) {
        const handled = await this.specialCommandHandler.handle(
          userInput,
          this.state.currentDir,
          this.state.messages
        );
        if (handled) continue;
      }

      // 添加用户消息
      this.state.messages.push({
        role: 'user',
        content: userInput
      });

      await this.processAgentResponse(options);
    }
  }

  /**
   * 处理代理响应
   * @param options - 终端代理选项
   */
  private async processAgentResponse(options: TerminalAgentOptions): Promise<void> {
    // 显示加载动画
    const spinner = ConsoleUtils.showThinkingSpinner();

    try {
      // 获取代理响应
      const response = await this.agentService.streamResponse(
        this.state.messages,
        {
          resourceId: this.state.resourceId,
          threadId: this.state.threadId
        }
      );

      spinner.stop();
      ConsoleUtils.showResponseHeader();

      let fullResponse = '';
      for await (const chunk of response.textStream) {
        process.stdout.write(chunk);
        fullResponse += chunk;
      }
      console.log('\n');

      // 添加助手消息
      this.state.messages.push({
        role: 'assistant',
        content: fullResponse
      });

      // 处理<shell>标签
      await this.shellTagProcessor.processShellTags(fullResponse, this.state.currentDir);

    } catch (error) {
      spinner.fail('发生错误');
      ConsoleUtils.showError('错误:', error as Error);
    }
  }

  /**
   * 一次性执行命令
   * @param command - 执行命令
   * @param options - 终端代理选项
   */
  private async executeOneCommand(command: string, options: TerminalAgentOptions = {}): Promise<void> {
    // 添加简单的系统消息（不包含环境信息，因为agent层已经包含）
    this.state.messages.push({
      role: 'system',
      content: `当前会话ID: ${this.state.threadId}
当前时间: ${new Date().toISOString()}`
    });

    // 添加用户消息
    this.state.messages.push({
      role: 'user',
      content: command
    });

    await this.processAgentResponse(options);
  }
}
