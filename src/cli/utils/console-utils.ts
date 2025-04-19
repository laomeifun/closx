/**
 * Console output related utility functions
 */
import chalk from 'chalk';
import ora, { Ora } from 'ora';

/**
 * Console Utilities Class
 */
export class ConsoleUtils {
  /**
   * Display AI thinking animation
   * @returns Loading animation instance
   */
  public static showThinkingSpinner(): Ora {
    return ora('🤔 AI thinking...').start();
  }
  
  /**
   * Display command execution animation
   * @param command - Command being executed
   * @returns Loading animation instance
   */
  public static showCommandSpinner(command: string): Ora {
    return ora(`⚙️ Executing command: ${command}`).start();
  }
  
  /**
   * Format command display
   * @param command - Command to format
   * @returns Formatted command string
   */
  public static formatCommand(command: string): string {
    return chalk.green(`Executing: ${command}`);
  }
  
  /**
   * Display AI response header
   */
  public static showResponseHeader(): void {
    console.log(chalk.blue('🤖 AI > '));
  }
  
  /**
   * Display error message
   * @param message - Error message
   * @param error - Error object
   */
  public static showError(message: string, error?: Error | unknown): void {
    console.error(chalk.red(`❌ ${message}`), error);
  }
  
  /**
   * Display warning message
   * @param message - Warning message
   */
  public static showWarning(message: string): void {
    console.log(chalk.yellow(`⚠️ ${message}`));
  }
  
  /**
   * Display success message
   * @param message - Success message
   */
  public static showSuccess(message: string): void {
    console.log(chalk.green(`✅ ${message}`));
  }
  
  /**
   * Display info message
   * @param message - Info message
   */
  public static showInfo(message: string): void {
    console.log(chalk.gray(`ℹ️ ${message}`));
  }
  
  /**
   * Display help information
   */
  public static showHelpInfo(): void {
    console.log(chalk.yellow('\n📖 Available commands:'));
    console.log(chalk.yellow('❓ /help') + ' - Show this help information');
    console.log(chalk.yellow('🚪 /quit') + ' - Exit the program');
    console.log(chalk.yellow('💻 /exec <command>') + ' - Execute a shell command');
    console.log(chalk.yellow('🔄 /clear') + ' - Clear conversation history');
    console.log(chalk.yellow('🌐 /env') + ' - Show current environment information');
    console.log('\n');
  }
}
