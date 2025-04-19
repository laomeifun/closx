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

// 添加信号处理，使程序在 Ctrl+C 时干净地退出
// 这会覆盖 inquirer 的默认错误处理
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
          // 检查命令是否是特殊命令
          if (command.startsWith('/')) {
            // 处理特殊命令
            await this.specialCommandHandler.handle(
              command,
              this.state.currentDir,
              this.state.messages
            );
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
      try {
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
      } catch (error) {
        // 如果是 ExitPromptError，说明用户按了 Ctrl+C，直接退出
        if (error && (error as any).name === 'ExitPromptError') {
          console.log('\n程序已终止');
          process.exit(0);
          return; // 防止后续代码执行
        }
        
        // 其他错误正常处理
        console.error('\n程序运行出错:', error);
      }
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

      // 提取所有 <shell> 标签
      const shellCommands: {start: number; end: number; content: string}[] = [];
      let fullResponse = '';
      let tempResponse = '';
      
      // 首先收集完整响应
      for await (const chunk of response.textStream) {
        tempResponse += chunk;
      }
      
      // 提取所有 shell 标签及其位置
      const shellTagRegex = /<shell>([\s\S]*?)<\/shell>/g;
      let match;
      while ((match = shellTagRegex.exec(tempResponse)) !== null) {
        shellCommands.push({
          start: match.index,
          end: match.index + match[0].length,
          content: match[1].trim()
        });
      }
      
      // 移除原始标签并输出清理后的内容
      let lastIndex = 0;
      for (const cmd of shellCommands) {
        // 输出标签前的内容
        const beforeTag = tempResponse.substring(lastIndex, cmd.start);
        process.stdout.write(beforeTag);
        fullResponse += beforeTag;
        
        // 跳过标签内容
        lastIndex = cmd.end;
      }
      
      // 输出最后一个标签后的内容
      if (lastIndex < tempResponse.length) {
        const afterLastTag = tempResponse.substring(lastIndex);
        process.stdout.write(afterLastTag);
        fullResponse += afterLastTag;
      }
      
      console.log('\n');

      // 添加助手消息（使用原始完整响应）
      this.state.messages.push({
        role: 'assistant',
        content: tempResponse
      });

      // 处理<shell>标签并获取命令执行结果
      const commandResults = await this.shellTagProcessor.processShellTags(tempResponse, this.state.currentDir, { 
        executeCommands: true,
        interactive: true // 启用交互式确认
      });
      
      // 如果有命令执行结果，将其发送给 agent
      if (commandResults.length > 0) {
        // 构建命令结果消息
        let commandResultsMessage = '';
        
        for (const result of commandResults) {
          // 使用指定的提示词变量格式
          commandResultsMessage += `执行的命令<shell>${result.command}</shell>,这是结果:\n${result.output}\n\n`;
        }
        
        // 将命令结果添加到消息历史中
        this.state.messages.push({
          role: 'user',
          content: commandResultsMessage
        });
        
        // 再次请求 agent 响应（递归调用，但不显示“正在思考”）
        await this.processCommandResults(options);
      }

    } catch (error) {
      spinner.fail('发生错误');
      ConsoleUtils.showError('错误:', error as Error);
    }
  }
  
  /**
   * 处理命令执行结果并获取 agent 响应
   * @param options - 终端代理选项
   */
  private async processCommandResults(options: TerminalAgentOptions): Promise<void> {
    try {
      // 获取代理响应（不显示加载动画）
      const response = await this.agentService.streamResponse(
        this.state.messages,
        {
          resourceId: this.state.resourceId,
          threadId: this.state.threadId
        }
      );

      // 显示响应头
      ConsoleUtils.showResponseHeader();

      // 提取所有 <shell> 标签
      const shellCommands: {start: number; end: number; content: string}[] = [];
      let fullResponse = '';
      let tempResponse = '';
      
      // 首先收集完整响应
      for await (const chunk of response.textStream) {
        tempResponse += chunk;
      }
      
      // 提取所有 shell 标签及其位置
      const shellTagRegex = /<shell>([\s\S]*?)<\/shell>/g;
      let match;
      while ((match = shellTagRegex.exec(tempResponse)) !== null) {
        shellCommands.push({
          start: match.index,
          end: match.index + match[0].length,
          content: match[1].trim()
        });
      }
      
      // 移除原始标签并输出清理后的内容
      let lastIndex = 0;
      for (const cmd of shellCommands) {
        // 输出标签前的内容
        const beforeTag = tempResponse.substring(lastIndex, cmd.start);
        process.stdout.write(beforeTag);
        fullResponse += beforeTag;
        
        // 跳过标签内容
        lastIndex = cmd.end;
      }
      
      // 输出最后一个标签后的内容
      if (lastIndex < tempResponse.length) {
        const afterLastTag = tempResponse.substring(lastIndex);
        process.stdout.write(afterLastTag);
        fullResponse += afterLastTag;
      }
      
      console.log('\n');

      // 添加助手消息（使用原始完整响应）
      this.state.messages.push({
        role: 'assistant',
        content: tempResponse
      });

      // 处理<shell>标签并获取命令列表（不执行命令）
      const commandResults = await this.shellTagProcessor.processShellTags(tempResponse, this.state.currentDir, { 
        executeCommands: false,
        interactive: false // 在递归处理中不需要交互式确认
      });
      
      // 如果有命令，将其发送给 agent（递归处理）
      if (commandResults.length > 0) {
        // 构建命令结果消息
        let commandResultsMessage = '';
        
        for (const result of commandResults) {
          // 使用指定的提示词变量格式
          commandResultsMessage += `执行的命令<shell>${result.command}</shell>,这是结果:\n${result.output}\n\n`;
        }
        
        // 将命令结果添加到消息历史中
        this.state.messages.push({
          role: 'user',
          content: commandResultsMessage
        });
        
        // 再次请求 agent 响应
        await this.processCommandResults(options);
      }

    } catch (error) {
      ConsoleUtils.showError('处理命令结果时发生错误:', error as Error);
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

    try {
      await this.processAgentResponse(options);
      
      // 在一次性命令执行完成后自动退出
      // 使用延时确保所有输出已经完成
      setTimeout(() => {
        console.log('\n命令执行完成，程序即将退出...');
        process.exit(0);
      }, 500);
    } catch (error) {
      console.error('命令执行失败:', error);
      process.exit(1);
    }
  }
}
