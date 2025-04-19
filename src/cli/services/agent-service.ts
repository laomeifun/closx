/**
 * AI Agent Interaction Service
 */
import { shell, createShellAgent } from '../../mastra/agents/index';
import { ChatMessage } from '../types/terminal-types';

/**
 * Agent Response Result
 */
export type AgentResponse = {
  readonly textStream: AsyncIterable<string>;
};

/**
 * Agent Request Options
 */
export type AgentRequestOptions = {
  readonly resourceId: string;
  readonly threadId: string;
};

/**
 * Agent Service Class
 * Responsible for handling interactions with AI agents
 */
export class AgentService {
  /**
   * Send messages to AI agent and receive streaming response
   * @param messages - Conversation history messages
   * @param options - Request options
   * @returns Agent response
   */
  public async streamResponse(
    messages: ChatMessage[], 
    options: AgentRequestOptions
  ): Promise<AgentResponse> {
    // Ensure shell is initialized
    if (!shell) {
      // Wait for shell initialization to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // If shell is still not initialized, throw error
      if (!shell) {
        throw new Error('Agent not yet initialized, please try again later');
      }
    }
    
    // Only send the latest user message, using the existing history from memory system
    const lastUserMessageIndex = [...messages].reverse().findIndex(msg => msg.role === 'user');
    
    if (lastUserMessageIndex !== -1) {
      const lastMessages = [
        // Include the latest system message (if any)
        ...messages.filter((msg, index) => 
          msg.role === 'system' && index > messages.length - lastUserMessageIndex - 2
        ),
        // Latest user message
        messages[messages.length - lastUserMessageIndex - 1]
      ];
      
      return shell.stream(lastMessages, options);
    }
    
    // If no user message found, send all messages (prevent errors)
    return shell.stream(messages, options);
  }
  
  /**
   * Generate unique resource ID
   * @returns Resource ID string
   */
  public generateResourceId(): string {
    return `resource-${Date.now()}`;
  }
  
  /**
   * Generate unique thread ID
   * @returns Thread ID string
   */
  public generateThreadId(): string {
    return `thread-${Date.now()}`;
  }
}
