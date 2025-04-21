/**
 * Response Processor
 * Responsible for processing AI agent responses
 */
import { ShellTagProcessor, ShellCommandExecutionResult } from './shell-tag-processor';
import { SessionService } from '../services/session-service';
import { TerminalAgentOptions } from '../types/terminal-types';
import { ConsoleUtils } from '../utils/console-utils';

/**
 * Processed response content
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
 * Shell标签执行结果
 */
export type ShellTagExecutionResults = {
  readonly commands: string[];          // 执行的命令
  readonly results: ShellCommandExecutionResult[]; // 执行结果
  readonly promptForAgent: string;      // 发送给agent的提示词
};

/**
 * Response Processor Class
 * Responsible for parsing and processing AI agent responses
 */
export class ResponseProcessor {
  private readonly shellTagProcessor: ShellTagProcessor;
  private readonly sessionService: SessionService;

  /**
   * Constructor
   * @param sessionService - Session service
   */
  constructor(sessionService: SessionService) {
    this.shellTagProcessor = new ShellTagProcessor();
    this.sessionService = sessionService;
  }

  /**
   * Extract shell commands from response text
   * @param responseText - Response text
   * @returns Array of extracted shell commands
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
   * Process response text and prepare display content
   * @param responseText - Raw response text
   * @returns Processed response content
   */
  public processResponseForDisplay(responseText: string): ProcessedResponse {
    const shellCommands = this.extractShellCommands(responseText);
    let displayText = '';
    let lastIndex = 0;
    
    // Remove original tags and prepare display content
    for (const cmd of shellCommands) {
      // Add content before tag
      const beforeTag = responseText.substring(lastIndex, cmd.start);
      displayText += beforeTag;
      
      // Skip tag content
      lastIndex = cmd.end;
    }
    
    // Add content after the last tag
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
   * Process shell commands and return execution results
   * @param responseText - Raw response text
   * @returns Command execution results
   */
  public async processShellCommands(
    responseText: string
  ): Promise<string[]> {
    return this.shellTagProcessor.processShellTags(
      responseText
    );
  }

  /**
   * 执行响应中的<shell>标签命令，并返回执行结果
   * @param responseText - AI响应内容 
   * @returns Shell标签执行结果
   */
  public async executeShellCommands(
    responseText: string
  ): Promise<ShellTagExecutionResults> {
    // 先提取所有命令
    const commands = await this.shellTagProcessor.processShellTags(responseText);
    
    if (commands.length === 0) {
      return {
        commands: [],
        results: [],
        promptForAgent: ''
      };
    }

    // 执行每个命令并收集结果
    const results: ShellCommandExecutionResult[] = [];
    let combinedPrompt = '# <shell>标签命令执行结果\n\n';
    
    for (let i = 0; i < commands.length; i++) {
      ConsoleUtils.showInfo(`\n执行命令 ${i + 1}/${commands.length}`);
      const commandResult = await this.shellTagProcessor.executeShellTagCommand(commands[i]);
      results.push(commandResult);
      
      // 将这个命令的提示词添加到组合提示词中
      combinedPrompt += `## 命令 ${i + 1}/${commands.length}\n`;
      combinedPrompt += `${commandResult.prompt}\n\n`;
    }

    return {
      commands,
      results,
      promptForAgent: combinedPrompt.trim()
    };
  }

  /**
   * Build command execution results message
   * NOTE: This method might need adjustment as commandResults are now just strings, not objects with output/exitCode.
   * @param commandResults - Array of command strings extracted from <shell> tags.
   * @param verbose - Whether to show detailed information
   * @returns Formatted command results message
   */
  public buildCommandResultsMessage(
    commandResults: string[],
    verbose = false
  ): string {
    let commandResultsMessage = '';
    
    for (const result of commandResults) {
      const executionProcess = verbose ?
        `Note: Command found in <shell> tag in directory ${this.sessionService.getCurrentDir()}. Agent should execute via tool.` :
        '';

      commandResultsMessage += `Command identified: <shell>${result}</shell>\n${executionProcess}\n`;
    }
    
    return commandResultsMessage;
  }
}
