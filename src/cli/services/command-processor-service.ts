/**
 * Command Processing Service
 * Responsible for handling user commands and agent responses
 */
import { TerminalAgentOptions, ChatMessage } from '../types/terminal-types';
import { AgentService } from './agent-service';
import { SessionService } from './session-service';
import { ResponseProcessor } from '../handlers/response-processor';
import { SpecialCommandHandler } from '../handlers/special-commands';
import { TerminalUI } from '../ui/terminal-ui';
import { ConsoleUtils } from '../utils/console-utils';
import chalk from 'chalk';

/**
 * Command Processing Service Class
 * Responsible for handling user commands and agent response processing flow
 */
export class CommandProcessorService {
  private readonly agentService: AgentService;
  private readonly sessionService: SessionService;
  private readonly responseProcessor: ResponseProcessor;
  private readonly specialCommandHandler: SpecialCommandHandler;
  private readonly terminalUI: TerminalUI;

  /**
   * Constructor
   * @param sessionService - Session service instance
   * @param terminalUI - Terminal UI component instance
   */
  constructor(sessionService: SessionService, terminalUI: TerminalUI) {
    this.agentService = new AgentService();
    this.sessionService = sessionService;
    this.responseProcessor = new ResponseProcessor(sessionService);
    this.specialCommandHandler = new SpecialCommandHandler();
    this.terminalUI = terminalUI;
  }

  /**
   * Handle special commands
   * @param input - User input
   * @returns Whether the command was handled
   */
  public async handleSpecialCommand(input: string): Promise<boolean> {
    if (input.startsWith('/')) {
      return this.specialCommandHandler.handle(
        input,
        this.sessionService.getCurrentDir(),
        [...this.sessionService.getMessages()] // Convert to mutable array
      );
    }
    return false;
  }

  /**
   * 处理agent的响应
   * @param options - 终端agent选项
   * @returns 布尔值表示是否需要进一步处理
   */
  public async processAgentResponse(options: TerminalAgentOptions = {}): Promise<boolean> {
    // 显示加载动画
    const spinner = this.terminalUI.showThinkingAnimation();

    try {
      // 获取agent响应
      const responseText = await this.agentService.generateResponse(
        [...this.sessionService.getMessages()], // 转换为可变数组
        {
          resourceId: this.sessionService.getResourceId(),
          threadId: this.sessionService.getThreadId()
        }
      );

      spinner.stop();

      // 处理响应内容以便显示
      const processedResponse = this.responseProcessor.processResponseForDisplay(responseText);

      // 显示处理后的内容
      this.terminalUI.displayAIResponse(processedResponse.displayText);

      // 添加助手消息到历史记录（使用原始完整响应）
      this.sessionService.addAssistantMessage(responseText);

      // 检查响应中是否包含<shell>标签
      const hasShellTags = processedResponse.shellCommands.length > 0;
      
      // 如果存在<shell>标签，则执行命令并将结果发送回agent
      if (hasShellTags) {
        // 执行所有<shell>标签命令
        const shellResults = await this.responseProcessor.executeShellCommands(responseText);
        
        if (shellResults.commands.length > 0 && shellResults.promptForAgent) {
          // 将执行结果作为用户消息添加到历史记录中
          this.sessionService.addUserMessage(shellResults.promptForAgent);
          
          // 需要继续获取agent对执行结果的响应
          return true;
        }
      }

      // 如果没有<shell>标签，或者标签处理完成但无需进一步响应，则返回false
      return false;
    } catch (error) {
      spinner.fail('发生错误');
      this.terminalUI.showError('错误:', error as Error);
      return false;
    }
  }

  /**
   * 处理命令执行结果并获取agent响应
   * @param options - 终端agent选项
   * @returns 布尔值表示是否需要进一步处理
   */
  public async processCommandResults(options: TerminalAgentOptions = {}): Promise<boolean> {
    try {
      // 显示加载动画（命令结果处理时也显示）
      const spinner = this.terminalUI.showThinkingAnimation();
      console.log(chalk.gray("正在分析执行结果..."));
      
      // 获取agent响应（命令执行结果后的回复）
      const response = await this.agentService.streamResponse(
        [...this.sessionService.getMessages()], // 转换为可变数组
        {
          resourceId: this.sessionService.getResourceId(),
          threadId: this.sessionService.getThreadId()
        }
      );

      spinner.stop();

      // 收集完整响应
      let responseText = '';
      for await (const chunk of response.textStream) {
        responseText += chunk;
      }

      // 处理响应内容以便显示
      const processedResponse = this.responseProcessor.processResponseForDisplay(responseText);

      // 显示处理后的内容
      this.terminalUI.displayAIResponse(processedResponse.displayText);

      // 添加助手消息到历史记录（使用原始完整响应）
      this.sessionService.addAssistantMessage(responseText);

      // 检查新响应中是否又包含了<shell>标签
      const hasShellTags = processedResponse.shellCommands.length > 0;
      
      // 如果存在<shell>标签，则执行命令并将结果发送回agent
      if (hasShellTags) {
        // 执行所有<shell>标签命令
        const shellResults = await this.responseProcessor.executeShellCommands(responseText);
        
        if (shellResults.commands.length > 0 && shellResults.promptForAgent) {          
          // 将执行结果作为用户消息添加到历史记录中
          this.sessionService.addUserMessage(shellResults.promptForAgent);
          
          // 需要继续获取agent对执行结果的响应
          return true;
        }
      }

      // 如果没有<shell>标签，或者标签处理完成但无需进一步响应，则返回false
      return false;
    } catch (error) {
      this.terminalUI.showError('处理命令结果时发生错误:', error as Error);
      return false;
    }
  }

  /**
   * 执行单条命令（用户初始输入）
   * @param command - 要执行的命令
   * @param options - 终端agent选项
   */
  public async executeOneCommand(command: string, options: TerminalAgentOptions = {}): Promise<void> {
    // 添加系统消息
    this.sessionService.addSystemMessage();

    // 添加用户消息
    this.sessionService.addUserMessage(command);

    try {
      // 调用processAgentResponse，可能会返回true表示需要进一步处理<shell>标签
      let needsProcessing = await this.processAgentResponse(options);

      // 如果需要进一步处理（有<shell>标签被执行），则循环获取agent响应
      while (needsProcessing) {
        needsProcessing = await this.processCommandResults(options);
      }
    } catch (error) {
      this.terminalUI.showError('命令执行失败:', error as Error);
      throw error; // 重新抛出异常，由调用者在index.ts或terminal-agent.ts捕获
    }
  }
}
