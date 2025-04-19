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
};
