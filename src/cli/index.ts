#!/usr/bin/env node
import { TerminalAgent } from './terminal-agent.js';

// Export components for use in other modules
export * from './types/terminal-types';
// Remove export for the deleted file
// export * from './utils/shell-executor';
export * from './utils/prompt-generator';
export * from './utils/console-utils';
export * from './handlers/special-commands';
export * from './handlers/shell-tag-processor';
export * from './services/agent-service';
export * from './terminal-agent.js';

// Create and start terminal agent instance
const terminalAgent = new TerminalAgent();

// Start interactive terminal agent
terminalAgent.run().catch((error: Error) => {
  console.error('Program execution error:', error);
  process.exit(1);
});
