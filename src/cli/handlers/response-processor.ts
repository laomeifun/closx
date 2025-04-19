/**
 * 响应处理器
 * 负责处理AI代理的响应内容
 */
import { ShellTagProcessor } from './shell-tag-processor';
import { SessionService } from '../services/session-service';
import { TerminalAgentOptions } from '../types/terminal-types';

/**
 * 处理后的响应内容
 */
export type ProcessedResponse = {
  readonly displayText: string;
  readonly shellCommands: readonly {
    readonly start: number;
    readonly end: number;
    readonly content: string;
  }[];
};

/**
 * 响应处理器类
 * 负责解析和处理AI代理的响应
 */
export class ResponseProcessor {
  private readonly shellTagProcessor: ShellTagProcessor;
  private readonly sessionService: SessionService;

  /**
   * 构造函数
   * @param sessionService - 会话服务
   */
  constructor(sessionService: SessionService) {
    this.shellTagProcessor = new ShellTagProcessor();
    this.sessionService = sessionService;
  }

  /**
   * 从响应文本中提取shell命令
   * @param responseText - 响应文本
   * @returns 提取到的shell命令数组
   */
  public extractShellCommands(responseText: string): {start: number; end: number; content: string}[] {
    const shellCommands: {start: number; end: number; content: string}[] = [];
    const shellTagRegex = /<shell>([\s\S]*?)<\/shell>/g;
    let match;
    
    while ((match = shellTagRegex.exec(responseText)) !== null) {
      shellCommands.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[1].trim()
      });
    }
    
    return shellCommands;
  }

  /**
   * 处理响应文本并准备显示内容
   * @param responseText - 原始响应文本
   * @returns 处理后的响应内容
   */
  public processResponseForDisplay(responseText: string): ProcessedResponse {
    const shellCommands = this.extractShellCommands(responseText);
    let displayText = '';
    let lastIndex = 0;
    
    // 移除原始标签并准备显示内容
    for (const cmd of shellCommands) {
      // 添加标签前的内容
      const beforeTag = responseText.substring(lastIndex, cmd.start);
      displayText += beforeTag;
      
      // 跳过标签内容
      lastIndex = cmd.end;
    }
    
    // 添加最后一个标签后的内容
    if (lastIndex < responseText.length) {
      const afterLastTag = responseText.substring(lastIndex);
      displayText += afterLastTag;
    }
    
    return {
      displayText,
      shellCommands
    };
  }

  /**
   * 处理Shell命令并返回执行结果
   * @param responseText - 原始响应文本
   * @param options - 终端代理选项
   * @returns 命令执行结果
   */
  public async processShellCommands(
    responseText: string, 
    options: {
      executeCommands: boolean;
      interactive: boolean;
      interactiveCommand?: boolean;
    }
  ): Promise<{command: string; output: string; exitCode?: number}[]> {
    return this.shellTagProcessor.processShellTags(
      responseText, 
      this.sessionService.getCurrentDir(), 
      options
    );
  }

  /**
   * 构建命令执行结果消息
   * @param commandResults - 命令执行结果
   * @param verbose - 是否显示详细信息
   * @returns 格式化的命令结果消息
   */
  public buildCommandResultsMessage(
    commandResults: {command: string; output: string; exitCode?: number}[],
    verbose = false
  ): string {
    let commandResultsMessage = '';
    
    for (const result of commandResults) {
      // 记录命令执行过程和结果
      const executionProcess = verbose ? 
        `执行过程:\n命令在目录 ${this.sessionService.getCurrentDir()} 中执行\n退出码: ${result.exitCode}\n` : 
        '';

      // 使用指定的提示词变量格式，注入执行过程和结果
      commandResultsMessage += `执行的命令<shell>${result.command}</shell>\n${executionProcess}这是结果:\n${result.output}\n\n`;
    }
    
    return commandResultsMessage;
  }
}
