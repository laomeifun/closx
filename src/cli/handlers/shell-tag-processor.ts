/**
 * Shell Tag Processor Module
 */
// Remove unused imports related to execution and confirmation
// import { ShellExecutor, ShellExecutionResult } from '../utils/shell-executor';
import { ConsoleUtils } from '../utils/console-utils';
// import inquirer from 'inquirer';
// import { AgentService } from '../services/agent-service';
// import { ChatMessage } from '../types/terminal-types';
// import { CommandExecutionMode } from '../../config/types';
// import { getCommandExecutionMode, shouldConfirmCommand, isCommandAllowed, settingsManager } from '../../config/settings';

// Remove CommandExecutionResult type if it's defined here and no longer needed
// export type CommandExecutionResult = { ... };

/**
 * Shell Tag Processor
 */
export class ShellTagProcessor {
  // Remove properties no longer needed
  // private readonly shellExecutor: ShellExecutor;
  // private readonly agentService: AgentService;

  constructor() {
    // Remove initialization of removed properties
    // this.shellExecutor = new ShellExecutor();
    // this.agentService = new AgentService();
  }

  /**
   * Parses <shell> tags in response and extracts commands.
   * Does NOT execute commands.
   * @param response - AI response content
   * @returns Array of command strings found within <shell> tags.
   */
  public async processShellTags(
    response: string
    // Remove options parameter as it's no longer used for execution control
    // options: { ... } = { ... }
  ): Promise<string[]> { // Return type changed to Promise<string[]>
    // Find content inside <shell></shell> tags
    const shellTagRegex = /<shell>([\s\S]*?)<\/shell>/g;
    let match;
    const commands: string[] = [];

    while ((match = shellTagRegex.exec(response)) !== null) {
      if (match[1]) {
        // Remove all backticks and possible Markdown formatting
        const cmd = match[1].trim()
          .replace(/`/g, '')   // Remove all backticks
          .trim();

        if (cmd) {
          commands.push(cmd);
        }
      }
    }

    // Keep this block to inform the user that tags were found, but remove execution logic
    if (commands.length > 0) {
      ConsoleUtils.showInfo('\nFound <shell> tags in response (commands below). These are NOT executed by the CLI directly.');
      ConsoleUtils.showInfo('Agent should use the \'shell-execute\' tool for execution.');
      // Show extracted commands for informational purposes
      for (let i = 0; i < commands.length; i++) {
        console.log(`  ${i + 1}. ${ConsoleUtils.formatCommand(commands[i])}`);
      }
    }
    // --- Ensure no stray characters like '<shell>, execute>' remain here ---

    // --- Removed the large block of code related to options.executeCommands ---
    // This includes:
    // - CommandExecutionMode checks
    // - Blacklist checks within this processor
    // - inquirer prompts for confirmation
    // - isCommandAllowed checks
    // - Calls to shellExecutor.execute or executeInteractive
    // - Building the results array with exit codes and output

    // Return only the extracted command strings
    return commands;
  }

  // Ensure CommandExecutionResult type definition is removed if it was here
}
