/**
 * Response Processor
 * Responsible for processing AI agent responses
 */
import { ShellTagProcessor } from './shell-tag-processor';
import { SessionService } from '../services/session-service';
import { TerminalAgentOptions } from '../types/terminal-types';

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
