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
   * Display AI thinking animation with temporary message option
   * @param isTemporary - If true, the spinner will be replaced with empty text after a delay
   * @param tempDuration - Duration in ms before clearing spinner text (if temporary)
   * @returns Loading animation instance
   */
  public static showThinkingSpinner(isTemporary: boolean = false, tempDuration: number = 2000): Ora {
    // Use shorter text to avoid blocking subsequent input
    const spinner = ora('AI processing...').start();
    
    // If temporary, clear the text after specified duration
    if (isTemporary) {
      setTimeout(() => {
        if (spinner.isSpinning) {
          spinner.text = '';
        }
      }, tempDuration);
    }
    
    return spinner;
  }
  
  /**
   * Display command execution animation
   * @param command - Command being executed
   * @returns Loading animation instance
   */
  public static showCommandSpinner(command: string): Ora {
    return ora(`Running: ${command}`).start();
  }
  
  /**
   * Format command display
   * @param command - Command to format
   * @returns Formatted command string
   */
  public static formatCommand(command: string): string {
    return `\x1b[36mExecuting: ${command}\x1b[0m`;
  }
  
  /**
   * Display AI response header without line break
   */
  public static showResponseHeader(): void {
    process.stdout.write(chalk.blue('🤖 AI > '));
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
    console.log(`\n⚠️  WARNING: ${message}\n`);
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