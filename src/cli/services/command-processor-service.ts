/**
 * Command Processing Service
 * Responsible for handling user commands and agent responses
 */
import { TerminalAgentOptions } from '../types/terminal-types';
import { AgentService } from './agent-service';
import { SessionService } from './session-service';
import { ResponseProcessor } from '../handlers/response-processor';
import { SpecialCommandHandler } from '../handlers/special-commands';
import { TerminalUI } from '../ui/terminal-ui';

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
   * Process agent responses
   * @param options - Terminal agent options
   * @returns Boolean indicating if further processing *related to tool calls* might be needed (always false for <shell> tags).
   */
  public async processAgentResponse(options: TerminalAgentOptions = {}): Promise<boolean> {
    // Show loading animation
    const spinner = this.terminalUI.showThinkingAnimation();

    try {
      // Get agent response (non-streaming for testing)
      const responseText = await this.agentService.generateResponse(
        [...this.sessionService.getMessages()], // Convert to mutable array
        {
          resourceId: this.sessionService.getResourceId(),
          threadId: this.sessionService.getThreadId()
        }
      );

      spinner.stop();

      // Process response content for display
      const processedResponse = this.responseProcessor.processResponseForDisplay(responseText);

      // Display processed content
      this.terminalUI.displayAIResponse(processedResponse.displayText);

      // Add assistant message (using original complete response) to history
      this.sessionService.addAssistantMessage(responseText);

      // Process <shell> tags just to *log* them if found (doesn't execute)
      // The returned command strings are ignored here as we don't act on them.
      await this.responseProcessor.processShellCommands(
        responseText
      );

      // Always return false as we no longer loop based on <shell> tag processing.
      // Further processing loop might be triggered by actual tool call results, handled elsewhere.
      return false;
    } catch (error) {
      spinner.fail('Error occurred');
      this.terminalUI.showError('Error:', error as Error);
      return false;
    }
  }

  /**
   * Process command execution results and get agent response
   * NOTE: This method's original purpose was tied to <shell> tag execution.
   * It might be redundant or need refactoring depending on how tool call results are handled.
   * Keep simplified version for now.
   * @param options - Terminal agent options
   * @returns Boolean indicating if further processing is needed (always false for <shell> tags).
   */
  public async processCommandResults(options: TerminalAgentOptions = {}): Promise<boolean> {
    try {
      // Get agent response (without showing loading animation)
      const response = await this.agentService.streamResponse(
        [...this.sessionService.getMessages()], // Convert to mutable array
        {
          resourceId: this.sessionService.getResourceId(),
          threadId: this.sessionService.getThreadId()
        }
      );

      // Collect complete response
      let responseText = '';
      for await (const chunk of response.textStream) {
        responseText += chunk;
      }

      // Process response content for display
      const processedResponse = this.responseProcessor.processResponseForDisplay(responseText);

      // Display processed content
      this.terminalUI.displayAIResponse(processedResponse.displayText);

      // Add assistant message (using original complete response) to history
      this.sessionService.addAssistantMessage(responseText);

      // Process <shell> tags just to log them if found (doesn't execute)
      await this.responseProcessor.processShellCommands(
        responseText
      );

      // Always return false as we no longer loop based on <shell> tag processing.
      return false;
    } catch (error) {
      this.terminalUI.showError('Error processing command results:', error as Error);
      return false;
    }
  }

  /**
   * Execute a single command (initial user input)
   * @param command - Command to execute
   * @param options - Terminal agent options
   */
  public async executeOneCommand(command: string, options: TerminalAgentOptions = {}): Promise<void> {
    // Add system message
    this.sessionService.addSystemMessage();

    // Add user message
    this.sessionService.addUserMessage(command);

    try {
      // Call processAgentResponse once. It now returns false regarding <shell> looping.
      let needsProcessing = await this.processAgentResponse(options);

      // This loop might become redundant or only run if processAgentResponse/processCommandResults
      // were changed to return true for other reasons (e.g., specific tool call patterns requiring follow-up).
      // As per current logic focusing on removing <shell> loop, it won't loop based on <shell> tags.
      while (needsProcessing) {
        // processCommandResults also returns false regarding <shell> looping.
        needsProcessing = await this.processCommandResults(options);
      }
    } catch (error) {
      this.terminalUI.showError('Command execution failed:', error as Error);
      throw error; // Re-throw to be caught by the caller in index.ts or terminal-agent.ts
    }
  }
}
