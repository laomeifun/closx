/**
 * Session Management Service
 * Responsible for managing session state and message history
 */
import { ChatMessage, SessionState } from '../types/terminal-types';
import { AgentService } from './agent-service';

/**
 * Session Service Class
 * Responsible for managing session state and message history
 */
export class SessionService {
  private readonly agentService: AgentService;
  private state: SessionState;

  /**
   * Constructor
   */
  constructor() {
    this.agentService = new AgentService();
    this.state = {
      messages: [],
      currentDir: process.cwd(),
      resourceId: this.agentService.generateResourceId(),
      threadId: this.agentService.generateThreadId(),
    };
  }

  /**
   * Get current session state
   * @returns Session state
   */
  public getState(): SessionState {
    return this.state;
  }

  /**
   * Add system message
   */
  public addSystemMessage(): void {
    // Create new message array and add message
    this.state = {
      ...this.state,
      messages: [...this.state.messages, {
        role: 'system',
        content: `Current Session ID: ${this.state.threadId}
Current Time: ${new Date().toISOString()}`
      }]
    };
  }

  /**
   * Add user message
   * @param content - Message content
   */
  public addUserMessage(content: string): void {
    // Create new message array and add message
    this.state = {
      ...this.state,
      messages: [...this.state.messages, {
        role: 'user',
        content
      }]
    };
  }

  /**
   * Add assistant message
   * @param content - Message content
   */
  public addAssistantMessage(content: string): void {
    // Create new message array and add message
    this.state = {
      ...this.state,
      messages: [...this.state.messages, {
        role: 'assistant',
        content
      }]
    };
  }

  /**
   * Get message history
   * @returns Message history array
   */
  public getMessages(): readonly ChatMessage[] {
    return this.state.messages;
  }

  /**
   * Set current working directory
   * @param dir - Working directory path
   */
  public setCurrentDir(dir: string): void {
    // Create new state object
    this.state = {
      ...this.state,
      currentDir: dir
    };
  }

  /**
   * Get current working directory
   * @returns Current working directory
   */
  public getCurrentDir(): string {
    return this.state.currentDir;
  }

  /**
   * Get resource ID
   * @returns Resource ID
   */
  public getResourceId(): string {
    return this.state.resourceId;
  }

  /**
   * Get thread ID
   * @returns Thread ID
   */
  public getThreadId(): string {
    return this.state.threadId;
  }
}
