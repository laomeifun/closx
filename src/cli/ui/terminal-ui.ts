/**
 * Terminal Interface Component
 * Responsible for terminal UI interaction and display
 */
import inquirer from 'inquirer';
import chalk from 'chalk';
import { ConsoleUtils } from '../utils/console-utils';

/**
 * Terminal Interface Component Class
 * Responsible for handling terminal UI interaction and display
 */
export class TerminalUI {
  /**
   * Display welcome message
   * @param workingDir - Current working directory
   */
  public showWelcomeMessage(workingDir: string): void {
    console.log(chalk.blue('💻 === Interactive Terminal Agent ==='));
    console.log(chalk.gray(`📂 Working Directory: ${workingDir}`));
    console.log(chalk.yellow('\n💡 Tip: Type /help to see available commands\n'));
  }

  /**
   * Get user input
   * @returns User input content
   */
  public async getUserInput(): Promise<string> {
    const { userInput } = await inquirer.prompt({
      type: 'input',
      name: 'userInput',
      message: chalk.green('👤 User >')
    });
    
    return userInput ? userInput.trim() : '';
  }

  /**
   * Display AI response
   * @param text - Response text
   */
  public displayAIResponse(text: string): void {
    ConsoleUtils.showResponseHeader();
    process.stdout.write(text);
    console.log('\n');
  }

  /**
   * Display error message
   * @param message - Error message
   * @param error - Error object
   */
  public showError(message: string, error: Error): void {
    ConsoleUtils.showError(message, error);
  }

  /**
   * Display thinking animation
   * @returns Animation controller
   */
  public showThinkingAnimation() {
    return ConsoleUtils.showThinkingSpinner();
  }

  /**
   * Display program exit message
   * @param message - Exit message
   */
  public showExitMessage(message = 'Program terminated'): void {
    console.log(`\n${message}`);
  }

  /**
   * Display command line help information
   */
  public showCommandLineHelp(): void {
    console.log(chalk.cyan('\n===== Command Line Help ====='));
    console.log(chalk.yellow('Usage: closx [options] [command]'));
    console.log('\nOptions:');
    console.log('  -v, --verbose     Show detailed output');
    console.log('  -i, --interactive Enter interactive mode');
    console.log('  -h, --help        Show help information');
    console.log('\nExamples:');
    console.log('  closx                      - Enter interactive mode');
    console.log('  closx "Show files in current directory"  - Execute a single command');
    console.log(chalk.cyan('=====================\n'));
  }
}
