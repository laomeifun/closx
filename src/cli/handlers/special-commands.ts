/**
 * Special Command Handler Module
 */
import { ChatMessage } from '../types/terminal-types';
import { ConsoleUtils } from '../utils/console-utils';
// Removed import for the deleted shell-executor
// import { ShellExecutor } from '../utils/shell-executor';

/**
 * Special Command Handler
 */
export class SpecialCommandHandler {
  // Removed shellExecutor property
  // private readonly shellExecutor: ShellExecutor;

  constructor() {
    // Removed instantiation of ShellExecutor
    // this.shellExecutor = new ShellExecutor();
  }

  /**
   * Handle special commands
   * @param command - User input command
   * @param currentDir - Current working directory
   * @param messages - Message history
   * @returns Whether the command was handled
   */
  public async handle(
    command: string,
    currentDir: string, // Kept currentDir in signature for potential future use, though unused now
    messages: ChatMessage[]
  ): Promise<boolean> {
    const cmd = command.trim().toLowerCase();

    // Help command
    if (cmd === '/help') {
      ConsoleUtils.showHelpInfo();
      return true;
    }

    // Exit command
    if (cmd === '/quit') {
      ConsoleUtils.showInfo('Goodbye!');
      process.exit(0);
      // No return needed after process.exit(0)
    }

    // --- Removed /exec command handling --- 
    // if (cmd.startsWith('/exec ')) { ... }

    // Clear conversation history
    if (cmd === '/clear') {
      const systemMessages = messages.filter(msg => msg.role === 'system');
      messages.length = 0;
      systemMessages.forEach(msg => messages.push(msg));
      ConsoleUtils.showSuccess('Conversation history cleared');
      return true;
    }

    // --- Removed /env command handling --- 
    // if (cmd === '/env') { ... }

    // If command was not handled, indicate it
    ConsoleUtils.showWarning(`Unknown special command: ${command}`);
    ConsoleUtils.showInfo('Type /help for available commands.');
    return false; // Return false as the command was not recognized/handled
  }

  // --- Removed handleExecCommand method --- 
  // private async handleExecCommand(...) { ... }

  // --- Removed handleEnvCommand method --- 
  // private async handleEnvCommand(...) { ... }
}
