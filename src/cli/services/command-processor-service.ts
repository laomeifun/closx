/**
 * 命令处理服务
 * 负责处理用户命令和代理响应
 */
import { TerminalAgentOptions } from '../types/terminal-types';
import { AgentService } from './agent-service';
import { SessionService } from './session-service';
import { ResponseProcessor } from '../handlers/response-processor';
import { SpecialCommandHandler } from '../handlers/special-commands';
import { TerminalUI } from '../ui/terminal-ui';

/**
 * 命令处理服务类
 * 负责处理用户命令和代理响应流程
 */
export class CommandProcessorService {
  private readonly agentService: AgentService;
  private readonly sessionService: SessionService;
  private readonly responseProcessor: ResponseProcessor;
  private readonly specialCommandHandler: SpecialCommandHandler;
  private readonly terminalUI: TerminalUI;

  /**
   * 构造函数
   * @param sessionService - 会话服务实例
   * @param terminalUI - 终端UI组件实例
   */
  constructor(sessionService: SessionService, terminalUI: TerminalUI) {
    this.agentService = new AgentService();
    this.sessionService = sessionService;
    this.responseProcessor = new ResponseProcessor(sessionService);
    this.specialCommandHandler = new SpecialCommandHandler();
    this.terminalUI = terminalUI;
  }

  /**
   * 处理特殊命令
   * @param input - 用户输入
   * @returns 是否处理了命令
   */
  public async handleSpecialCommand(input: string): Promise<boolean> {
    if (input.startsWith('/')) {
      return this.specialCommandHandler.handle(
        input,
        this.sessionService.getCurrentDir(),
        [...this.sessionService.getMessages()] // 转换成可变数组
      );
    }
    return false;
  }

  /**
   * 处理代理响应
   * @param options - 终端代理选项
   * @returns 是否需要继续处理命令结果
   */
  public async processAgentResponse(options: TerminalAgentOptions = {}): Promise<boolean> {
    // 显示加载动画
    const spinner = this.terminalUI.showThinkingAnimation();

    try {
      // 获取代理响应
      const response = await this.agentService.streamResponse(
        [...this.sessionService.getMessages()], // 转换成可变数组
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
      
      // 处理响应内容
      const processedResponse = this.responseProcessor.processResponseForDisplay(responseText);
      
      // 显示处理后的内容
      this.terminalUI.displayAIResponse(processedResponse.displayText);

      // 添加助手消息（使用原始完整响应）
      this.sessionService.addAssistantMessage(responseText);

      // 处理<shell>标签并获取命令执行结果
      const commandResults = await this.responseProcessor.processShellCommands(
        responseText, 
        { 
          executeCommands: true,
          interactive: true, // 启用交互式确认
          interactiveCommand: true // 启用交互式命令执行
        }
      );
      
      // 如果有命令执行结果，将其发送给 agent
      if (commandResults.length > 0) {
        // 构建命令结果消息
        const commandResultsMessage = this.responseProcessor.buildCommandResultsMessage(
          commandResults, 
          options.verbose
        );
        
        // 将命令结果添加到消息历史中
        this.sessionService.addUserMessage(commandResultsMessage);
        
        // 需要继续处理命令结果
        return true;
      }

      return false;
    } catch (error) {
      spinner.fail('发生错误');
      this.terminalUI.showError('错误:', error as Error);
      return false;
    }
  }

  /**
   * 处理命令执行结果并获取 agent 响应
   * @param options - 终端代理选项
   * @returns 是否需要继续处理命令结果
   */
  public async processCommandResults(options: TerminalAgentOptions = {}): Promise<boolean> {
    try {
      // 获取代理响应（不显示加载动画）
      const response = await this.agentService.streamResponse(
        [...this.sessionService.getMessages()], // 转换成可变数组
        {
          resourceId: this.sessionService.getResourceId(),
          threadId: this.sessionService.getThreadId()
        }
      );

      // 收集完整响应
      let responseText = '';
      for await (const chunk of response.textStream) {
        responseText += chunk;
      }
      
      // 处理响应内容
      const processedResponse = this.responseProcessor.processResponseForDisplay(responseText);
      
      // 显示处理后的内容
      this.terminalUI.displayAIResponse(processedResponse.displayText);

      // 添加助手消息（使用原始完整响应）
      this.sessionService.addAssistantMessage(responseText);

      // 处理<shell>标签并获取命令列表（不执行命令）
      const commandResults = await this.responseProcessor.processShellCommands(
        responseText, 
        { 
          executeCommands: false,
          interactive: false // 在递归处理中不需要交互式确认
        }
      );
      
      // 如果有命令，将其发送给 agent（递归处理）
      if (commandResults.length > 0) {
        // 构建命令结果消息
        const commandResultsMessage = this.responseProcessor.buildCommandResultsMessage(
          commandResults
        );
        
        // 将命令结果添加到消息历史中
        this.sessionService.addUserMessage(commandResultsMessage);
        
        // 需要继续处理命令结果
        return true;
      }

      return false;
    } catch (error) {
      this.terminalUI.showError('处理命令结果时发生错误:', error as Error);
      return false;
    }
  }

  /**
   * 执行单个命令
   * @param command - 执行命令
   * @param options - 终端代理选项
   */
  public async executeOneCommand(command: string, options: TerminalAgentOptions = {}): Promise<void> {
    // 添加系统消息
    this.sessionService.addSystemMessage();

    // 添加用户消息
    this.sessionService.addUserMessage(command);

    try {
      let needsProcessing = await this.processAgentResponse(options);
      
      // 循环处理命令结果，直到不再需要
      while (needsProcessing) {
        needsProcessing = await this.processCommandResults(options);
      }
    } catch (error) {
      this.terminalUI.showError('命令执行失败:', error as Error);
      throw error;
    }
  }
}
