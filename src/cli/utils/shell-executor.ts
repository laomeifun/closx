/**
 * Shell command executor utility
 */
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import ora from 'ora';
import chalk from 'chalk';

/**
 * Result of a shell command execution
 */
export type ShellExecutionResult = {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
};

/**
 * Utility class for executing shell commands
 */
export class ShellExecutor {
  private readonly execPromise = promisify(exec);

  /**
   * Execute a shell command with real-time output
   * @param command - The command to execute
   * @param cwd - The current working directory
   */
  public async executeInteractive(command: string, cwd: string): Promise<number> {
    console.log(chalk.green(`Executing: ${command}`));
    
    try {
      const childProcess = spawn(command, { 
        shell: true, 
        cwd, 
        stdio: 'inherit' 
      });
      
      return await new Promise<number>((resolve) => {
        childProcess.on('close', (code) => {
          if (code !== 0) {
            console.log(chalk.red(`Command exit code: ${code || 0}`));
          }
          resolve(code || 0);
        });
        
        childProcess.on('error', (err) => {
          console.error(chalk.red('Command execution error:'), err);
          resolve(1);
        });
      });
    } catch (error: unknown) {
      const err = error as Error;
      console.error(chalk.red('Error executing command:'), err.message);
      return 1;
    }
  }
  
  /**
   * Execute a shell command and return output
   * @param command - The command to execute
   * @param cwd - The current working directory
   */
  public async execute(command: string, cwd: string): Promise<ShellExecutionResult> {
    try {
      const spinner = ora(`Executing command: ${command}`).start();
      const { stdout, stderr } = await this.execPromise(command, { cwd });
      spinner.stop();
      
      return {
        exitCode: 0,
        stdout,
        stderr
      };
    } catch (error: unknown) {
      const err = error as { message: string; code: number };
      return {
        exitCode: err.code || 1,
        stdout: '',
        stderr: err.message
      };
    }
  }
}
