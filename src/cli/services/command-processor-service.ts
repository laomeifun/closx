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
   * @returns Whether further command result processing is needed
   */
  public async processAgentResponse(options: TerminalAgentOptions = {}): Promise<boolean> {
    // Show loading animation
    const spinner = this.terminalUI.showThinkingAnimation();

    try {
      // Get agent response
      const response = await this.agentService.streamResponse(
        [...this.sessionService.getMessages()], // Convert to mutable array
        {
          resourceId: this.sessionService.getResourceId(),
          threadId: this.sessionService.getThreadId()
        }
      );

      spinner.stop();

      // Collect complete response
      let responseText = '';
      for await (const chunk of response.textStream) {
        responseText += chunk;
      }
      
      // Process response content
      const processedResponse = this.responseProcessor.processResponseForDisplay(responseText);
      
      // Display processed content
      this.terminalUI.displayAIResponse(processedResponse.displayText);

      // Add assistant message (using original complete response)
      this.sessionService.addAssistantMessage(responseText);

      // Process <shell> tags and get command execution results
      const commandResults = await this.responseProcessor.processShellCommands(
        responseText, 
        { 
          executeCommands: true,
          interactive: true, // Enable interactive confirmation
          interactiveCommand: true // Enable interactive command execution
        }
      );
      
      // If there are command execution results, send them to the agent
      if (commandResults.length > 0) {
        // Build command results message
        const commandResultsMessage = this.responseProcessor.buildCommandResultsMessage(
          commandResults, 
          options.verbose
        );
        
        // Add command results to message history
        this.sessionService.addUserMessage(commandResultsMessage);
        
        // Need to continue processing command results
        return true;
      }

      return false;
    } catch (error) {
      spinner.fail('Error occurred');
      this.terminalUI.showError('Error:', error as Error);
      return false;
    }
  }

  /**
   * Process command execution results and get agent response
   * @param options - Terminal agent options
   * @returns Whether further command result processing is needed
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
      
      // Process response content
      const processedResponse = this.responseProcessor.processResponseForDisplay(responseText);
      
      // Display processed content
      this.terminalUI.displayAIResponse(processedResponse.displayText);

      // Add assistant message (using original complete response)
      this.sessionService.addAssistantMessage(responseText);

      // Process <shell> tags and get command list (don't execute commands)
      const commandResults = await this.responseProcessor.processShellCommands(
        responseText, 
        { 
          executeCommands: false,
          interactive: false // No need for interactive confirmation in recursive processing
        }
      );
      
      // If there are commands, send them to the agent (recursive processing)
      if (commandResults.length > 0) {
        // Build command results message
        const commandResultsMessage = this.responseProcessor.buildCommandResultsMessage(
          commandResults
        );
        
        // Add command results to message history
        this.sessionService.addUserMessage(commandResultsMessage);
        
        // Need to continue processing command results
        return true;
      }

      return false;
    } catch (error) {
      this.terminalUI.showError('Error processing command results:', error as Error);
      return false;
    }
  }

  /**
   * Execute a single command
   * @param command - Command to execute
   * @param options - Terminal agent options
   */
  public async executeOneCommand(command: string, options: TerminalAgentOptions = {}): Promise<void> {
    // Add system message
    this.sessionService.addSystemMessage();

    // Add user message
    this.sessionService.addUserMessage(command);

    try {
      let needsProcessing = await this.processAgentResponse(options);
      
      // Process command results in a loop until no longer needed
      while (needsProcessing) {
        needsProcessing = await this.processCommandResults(options);
      }
    } catch (error) {
      this.terminalUI.showError('Command execution failed:', error as Error);
      throw error;
    }
  }
}
