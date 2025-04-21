/**
 * Interactive Terminal Agent
 * Provides command-line interface for interacting with AI agent
 */
import { Command } from 'commander';
import chalk from 'chalk';

import { TerminalAgentOptions } from './types/terminal-types';
import { SessionService } from './services/session-service';
import { CommandProcessorService } from './services/command-processor-service';
import { TerminalUI } from './ui/terminal-ui';

// Add signal handling for clean exit on Ctrl+C
process.on('SIGINT', () => {
  console.log('\nProgram terminated');
  process.exit(0);
});

/**
 * Terminal Agent Class
 * Integrates various modules to provide a complete interactive terminal experience
 */
export class TerminalAgent {
  private readonly program: Command;
  private readonly sessionService: SessionService;
  private readonly commandProcessor: CommandProcessorService;
  private readonly terminalUI: TerminalUI;

  /**
   * Constructor
   */
  constructor() {
    this.program = new Command();
    this.sessionService = new SessionService();
    this.terminalUI = new TerminalUI();
    this.commandProcessor = new CommandProcessorService(this.sessionService, this.terminalUI);

    this.setupCommands();
  }

  /**
   * Setup command-line arguments
   */
  private setupCommands(): void {
    this.program
      .name('closx')
      .description('Interactive Terminal Agent')
      .version('1.0.0')
      .option('-v, --verbose', 'Show detailed output')
      .option('-i, --interactive', 'Enter interactive mode')
      .argument('[command]', 'Execute command directly')
      .action(async (command, options) => {
        if (command) {
          // Check if command is a special command
          if (command.startsWith('/')) {
            await this.commandProcessor.handleSpecialCommand(command);
          } else {
            // Execute normal command (as AI input)
            await this.executeOneCommand(command, { verbose: options.verbose });
          }
        } else if (options.interactive || !command) {
          // Interactive mode
          await this.startInteractiveSession({ verbose: options.verbose });
        }
      });
  }

  /**
   * Parse command-line arguments and start the program
   * @param args - Command-line arguments
   */
  public async run(args: string[] = process.argv): Promise<void> {
    await this.program.parseAsync(args);
  }

  /**
   * Start interactive session
   * @param options - Terminal agent options
   */
  private async startInteractiveSession(options: TerminalAgentOptions = {}): Promise<void> {
    this.terminalUI.showWelcomeMessage(this.sessionService.getCurrentDir());

    // Add system message
    this.sessionService.addSystemMessage();

    await this.chatLoop(options);
  }

  /**
   * Main chat loop
   * @param options - Terminal agent options
   */
  private async chatLoop(options: TerminalAgentOptions): Promise<void> {
    while (true) {
      try {
        const userInput = await this.terminalUI.getUserInput();

        if (!userInput || userInput.trim() === '') {
          continue;
        }

        // Handle special commands
        if (userInput.startsWith('/')) {
          const handled = await this.commandProcessor.handleSpecialCommand(userInput);
          if (handled) continue;
        }

        // Add user message
        this.sessionService.addUserMessage(userInput);

        // Show thinking animation
        const thinkingSpinner = this.terminalUI.showThinkingAnimation();
        console.log(chalk.gray('AI 正在思考中...'));
        
        // Process user input and get agent response
        let needsProcessing = await this.commandProcessor.processAgentResponse(options);
        
        // Loop processing command results until no longer needed
        while (needsProcessing) {
          // Show thinking animation after each command execution
          console.log(chalk.gray('AI 正在分析执行结果...'));
          needsProcessing = await this.commandProcessor.processCommandResults(options);
        }
      } catch (error) {
        // If ExitPromptError, user pressed Ctrl+C, exit directly
        if (error && (error as any).name === 'ExitPromptError') {
          this.terminalUI.showExitMessage();
          process.exit(0);
          return; // Prevent subsequent code execution
        }
        
        // Handle other errors normally
        console.error('\n程序错误:', error);
      }
    }
  }

  /**
   * Execute a single command
   * @param command - Command to execute
   * @param options - Terminal agent options
   */
  private async executeOneCommand(command: string, options: TerminalAgentOptions = {}): Promise<void> {
    try {
      // 确保在非交互模式下也应用黑名单检查逻辑
      // 添加交互式参数，即使在非交互模式下也要求确认黑名单命令
      const enhancedOptions = {
        ...options,
        interactive: true, // 启用交互式确认
        blacklistCheck: true // 添加一个标记，表示需要检查黑名单
      };
      
      console.log(chalk.gray('AI 正在处理您的请求...'));
      await this.commandProcessor.executeOneCommand(command, enhancedOptions);
      
      // Automatically exit after executing one-time command
      // Use timeout to ensure all output is completed
      setTimeout(() => {
        this.terminalUI.showExitMessage('命令执行完成，程序将退出...');
        process.exit(0);
      }, 500);
    } catch (error) {
      console.error('命令执行失败:', error);
      process.exit(1);
    }
  }
}
