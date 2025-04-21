/**
 * Types used in the terminal agent implementation
 */

/**
 * Message structure for chat interactions
 */
export type ChatMessage = {
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string;
};

/**
 * State maintained throughout a terminal session
 */
export type SessionState = {
  readonly messages: ChatMessage[];
  readonly currentDir: string;
  readonly resourceId: string;
  readonly threadId: string;
};

/**
 * Options for terminal agent operations
 */
export type TerminalAgentOptions = {
  readonly verbose?: boolean;
  readonly interactive?: boolean; // 是否启用交互式确认
  readonly blacklistCheck?: boolean; // 是否需要检查黑名单
};

/**
 * Custom error class for handling prompt exit
 */
export class ExitPromptError extends Error {
  /**
   * Constructor for ExitPromptError
   * @param message - Error message
   */
  constructor(message: string = 'User terminated prompt') {
    super(message);
    this.name = 'ExitPromptError';
    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ExitPromptError);
    }
  }
}
