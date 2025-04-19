/**
 * Special Command Handler Module
 */
import { ChatMessage } from '../types/terminal-types';
import { ConsoleUtils } from '../utils/console-utils';
import { ShellExecutor } from '../utils/shell-executor';

/**
 * Special Command Handler
 */
export class SpecialCommandHandler {
  private readonly shellExecutor: ShellExecutor;

  constructor() {
    this.shellExecutor = new ShellExecutor();
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
    currentDir: string,
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
    }

    // Execute shell command
    if (cmd.startsWith('/exec ')) {
      await this.handleExecCommand(cmd.substring(6).trim(), currentDir);
      return true;
    }

    // Clear conversation history
    if (cmd === '/clear') {
      const systemMessages = messages.filter(msg => msg.role === 'system');
      messages.length = 0;
      systemMessages.forEach(msg => messages.push(msg));
      ConsoleUtils.showSuccess('Conversation history cleared');
      return true;
    }

    // Display environment information
    if (cmd === '/env') {
      await this.handleEnvCommand(currentDir);
      return true;
    }

    return false;
  }

  /**
   * Handle /exec command
   * @param shellCmd - Shell command
   * @param currentDir - Current working directory
   */
  private async handleExecCommand(shellCmd: string, currentDir: string): Promise<void> {
    try {
      const result = await this.shellExecutor.execute(shellCmd, currentDir);
      
      if (result.stdout) {
        ConsoleUtils.showInfo('Output:');
        console.log(result.stdout);
      }
      
      if (result.stderr) {
        ConsoleUtils.showError('Error:');
        console.log(result.stderr);
      }
    } catch (error: unknown) {
      ConsoleUtils.showError('Failed to execute command:', error as Error);
    }
  }

  /**
   * Handle /env command
   * @param currentDir - Current working directory
   */
  private async handleEnvCommand(currentDir: string): Promise<void> {
    try {
      const result = await this.shellExecutor.execute('printenv', currentDir);
      ConsoleUtils.showInfo('Environment variables:');
      console.log(result.stdout);
    } catch (error: unknown) {
      ConsoleUtils.showError('Failed to get environment variables:', error as Error);
    }
  }
}
