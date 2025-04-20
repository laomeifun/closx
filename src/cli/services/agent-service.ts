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
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!shell) {
        throw new Error('Agent not yet initialized, please try again later');
      }
    }

    // Determine messages to send
    const lastUserMessageIndex = [...messages].reverse().findIndex(msg => msg.role === 'user');
    let messagesToSend: ChatMessage[];
    if (lastUserMessageIndex !== -1) {
      messagesToSend = [
        ...messages.filter((msg, index) =>
          msg.role === 'system' && index > messages.length - lastUserMessageIndex - 2
        ),
        messages[messages.length - lastUserMessageIndex - 1]
      ];
    } else {
      messagesToSend = messages;
    }

    return shell.stream(messagesToSend, options);
  }
  
  /**
   * Send messages to AI agent and receive non-streaming response
   * @param messages - Conversation history messages
   * @param options - Request options
   * @returns Agent response text
   */
  public async generateResponse(
    messages: ChatMessage[],
    options: AgentRequestOptions
  ): Promise<string> {
    if (!shell) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!shell) {
        throw new Error('Agent not yet initialized, please try again later');
      }
    }

    const lastUserMessageIndex = [...messages].reverse().findIndex(msg => msg.role === 'user');
    let messagesToSend: ChatMessage[];
    if (lastUserMessageIndex !== -1) {
      messagesToSend = [
        ...messages.filter((msg, index) =>
          msg.role === 'system' && index > messages.length - lastUserMessageIndex - 2
        ),
        messages[messages.length - lastUserMessageIndex - 1]
      ];
    } else {
      messagesToSend = messages;
    }

    try {
      const response = await shell.generate(messagesToSend, options);
      return response?.text ?? '';
    } catch (error: any) {
      console.error(`Error calling shell.generate: ${error.message}`);
      return ''; // Return empty string on error
    }
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
