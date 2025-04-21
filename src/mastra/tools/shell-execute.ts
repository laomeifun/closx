import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { spawn, SpawnOptions, ExecOptions, ExecException } from 'child_process';
import inquirer from 'inquirer';
import { getCommandWhitelist, getCommandBlacklist, getCommandExecutionMode } from '../../config/settings';
import { CommandExecutionMode } from '../../config/types';
import { ConsoleUtils } from '../../cli/utils/console-utils';
import chalk from 'chalk';

/**
 * Options for shell command execution
 */
export interface ShellExecuteOptions {
  /** Skip blacklist check */
  skipBlacklistCheck?: boolean;
  /** Skip whitelist check */
  skipWhitelistCheck?: boolean;
  /** Skip confirmation prompt */
  skipConfirmation?: boolean;
  /** Execution options for child_process.exec */
  execOptions?: ExecOptions;
  /** Working directory */
  cwd?: string;
}

/**
 * Result of a shell command execution
 */
export interface ExecutionResult {
  /** Whether the command execution was successful */
  success: boolean;
  /** Standard output of the command */
  stdout: string;
  /** Standard error output of the command */
  stderr: string;
}

/**
 * Shell command execution tool
 * Uses Node.js built-in child_process module to execute shell commands
 * Confirms execution based on whitelist/blacklist/default policy.
 */
export const shellExecuteTool = createTool({
  id: 'shell-execute',
  description: 'Executes shell commands. Whitelisted commands run silently. Blacklisted and other commands require user confirmation.',
  inputSchema: z.object({
    command: z.string().describe('The shell command to execute'),
    cwd: z.string().optional().describe('Working directory for command execution'),
    timeout: z.number().optional().describe('Command execution timeout (milliseconds)'),
  }),
  outputSchema: z.object({
    stdout: z.string().describe('Standard output of the command'),
    stderr: z.string().describe('Standard error output of the command'),
    exitCode: z.number().nullable().describe('Exit code of the command, 0 if successful'),
  }),
  execute: async ({ context }) => {
    return new Promise(async (resolve) => {
      let command = context.command;
      const cwd = context.cwd;
      const timeout = context.timeout;

      let needsConfirmation = false;
      let confirmationMessage = `Execute this command: ${ConsoleUtils.formatCommand(command)}?`;
      let confirmDefault = true;
      let confirmationReason = '';

      try {
        const mode = getCommandExecutionMode();
        const whitelist: ReadonlyArray<string> = getCommandWhitelist();
        const blacklist: ReadonlyArray<string> = getCommandBlacklist();
        
        const isOnWhitelist = whitelist.some(wlCmd => command.startsWith(wlCmd) || command === wlCmd);
        const isOnBlacklist = blacklist.some(blCmd => command.includes(blCmd));



        if (mode === CommandExecutionMode.MESSAGE) {
            console.log(`[INFO] ShellExecute: Command blocked by MESSAGE mode: ${ConsoleUtils.formatCommand(command)}`);
            return resolve({
                stdout: '',
                stderr: `Command not executed (MESSAGE mode).`,
                exitCode: 0
            });
        } else if (mode === CommandExecutionMode.AUTO) {
            needsConfirmation = false;
            confirmationReason = 'auto';
            if (isOnBlacklist) {
                ConsoleUtils.showWarning(`Executing blacklisted command in AUTO mode: ${ConsoleUtils.formatCommand(command)}`);
            }
        } else if (mode === CommandExecutionMode.WHITELIST) {
          if (isOnWhitelist) {
             needsConfirmation = false;
             confirmationReason = 'whitelist';
          } else {
             needsConfirmation = true;
             confirmationReason = isOnBlacklist ? 'blacklist' : 'other';
             if (isOnBlacklist) {
                confirmationMessage = `⚠️ WARNING: Command contains blacklisted keyword. Execute "${ConsoleUtils.formatCommand(command)}"?`;
                confirmDefault = false;
             }
          }
        } else if (mode === CommandExecutionMode.BLACKLIST) {
            if (isOnBlacklist) {
               needsConfirmation = true;
               confirmationReason = 'blacklist';
               confirmationMessage = `⚠️ WARNING: Command contains blacklisted keyword. Execute "${ConsoleUtils.formatCommand(command)}"?`;
               confirmDefault = false;
            } else {
               needsConfirmation = false;
               confirmationReason = isOnWhitelist ? 'whitelist' : 'other';
            }
        } else {
       
            if (isOnWhitelist) {
               needsConfirmation = false;
               confirmationReason = 'whitelist';
            } else {
               needsConfirmation = true;
               confirmationReason = isOnBlacklist ? 'blacklist' : 'other';
               if (isOnBlacklist) {
                   confirmationMessage = `⚠️ WARNING: Command contains blacklisted keyword. Execute "${ConsoleUtils.formatCommand(command)}"?`;
                   confirmDefault = false;
               }
            }
        }

      } catch (error: any) {
         console.error(`[ERROR] ShellExecute: Error checking command lists/mode: ${error.message}`);
         return resolve({
            stdout: '',
            stderr: `Error checking command permissions: ${error.message}. Execution cancelled.`,
            exitCode: 1,
         });
      }

      let confirmedToExecute = !needsConfirmation;

      if (needsConfirmation) {
        try {
          console.log(chalk.yellow('Command confirmation required'));
          
          ConsoleUtils.showWarning(`Confirm execution: `);
          console.log(`Command: ${ConsoleUtils.formatCommand(command)}`);
          
          const { confirm } = await inquirer.prompt({
            type: 'confirm',
            name: 'confirm',
            message: 'Execute this command?',
            default: confirmDefault,
          });
          
          confirmedToExecute = confirm;
        } catch (error: any) {
          return resolve({
            stdout: '',
            stderr: `Failed to get user confirmation: ${error.message}. Execution cancelled.`,
            exitCode: 1,
          });
        }
      }

      if (!confirmedToExecute) {
        console.log(chalk.red('Command execution cancelled'));
        
        const reason = needsConfirmation ? `cancelled by user (${confirmationReason})` : 'permission check failed';
        return resolve({
          stdout: '',
          stderr: `Command execution ${reason}.`,
          exitCode: 1,
        });
      }

      console.log(chalk.green('Starting command execution'));

      const options: SpawnOptions = {
        shell: true,
        stdio: 'pipe',
        detached: false,
        cwd: cwd,
      };

      const childProcess = spawn(command, [], options);

      let stdoutData: string = '';
      let stderrData: string = '';
      let commandFinished: boolean = false;
      let timeoutId: NodeJS.Timeout | null = null;

      const removeAllListeners = (): void => {
          process.removeListener('SIGINT', sigintHandler);
          childProcess.stdout?.removeAllListeners();
          childProcess.stderr?.removeAllListeners();
          childProcess.removeAllListeners('close');
          childProcess.removeAllListeners('error');
      };

      const sigintHandler = (): void => {
        if (!commandFinished) {
          commandFinished = true;
          console.log('\n' + chalk.yellow('╔════════════════════════════════════╗'));
          console.log(chalk.yellow('║   🛑 用户中断了命令执行          ║'));
          console.log(chalk.yellow('╚════════════════════════════════════╝') + '\n');
          
          removeAllListeners();

          if (childProcess && typeof childProcess.kill === 'function') {
             try {
                childProcess.kill('SIGINT');
             } catch (killError: any) {
                 console.error(`Error attempting to send SIGINT to child process: ${killError.message}`);
             }
          }

          resolve({
            stdout: stdoutData,
            stderr: stderrData + '\nCommand was interrupted by user',
            exitCode: 130,
          });
        }
      };
      process.on('SIGINT', sigintHandler);

      childProcess.stdout?.on('data', (data: Buffer) => {
        const output: string = data.toString();
        stdoutData += output;
        process.stdout.write(output);
      });

      childProcess.stderr?.on('data', (data: Buffer) => {
        const output: string = data.toString();
        stderrData += output;
        process.stderr.write(output);
      });

      childProcess.on('close', (code: number | null) => {
        if (commandFinished) return;
        commandFinished = true;
        if (timeoutId) clearTimeout(timeoutId);
        removeAllListeners();
        
        if (code === 0) {
          console.log(chalk.green('Command executed successfully'));
        } else {
          console.log(chalk.red(`Command failed with code: ${code}`));
        }
        
        resolve({ stdout: stdoutData, stderr: stderrData, exitCode: code });
      });

      childProcess.on('error', (error: Error) => {
        if (commandFinished) return;
        commandFinished = true;
        if (timeoutId) clearTimeout(timeoutId);
        removeAllListeners();
        
        console.log(chalk.red('Command execution error'));
        console.error(`Error: ${error.message}`);
        
        resolve({ stdout: stdoutData, stderr: `${stderrData}\nCommand execution error: ${error.message}`, exitCode: 1 });
      });

      if (timeout) {
        timeoutId = setTimeout(() => {
          if (!commandFinished) {
            commandFinished = true;
            removeAllListeners();
            
            console.log(chalk.yellow(`Command timed out after ${timeout}ms`));
            
            if (childProcess && typeof childProcess.kill === 'function') {
              try {
                childProcess.kill();
              } catch (killError: any) {
                console.error(`Error attempting to kill child process on timeout: ${killError.message}`);
              }
            }
            resolve({ stdout: stdoutData, stderr: `${stderrData}\nCommand execution timed out after ${timeout}ms`, exitCode: 124 });
          }
        }, timeout);
      }
    });
  },
});

/**
 * 检查命令是否在黑名单中
 * @param command 要检查的命令
 * @param blacklist 黑名单列表
 * @returns 是否在黑名单中
 */
function isCommandBlacklisted(command: string, blacklist: ReadonlyArray<string>): boolean {
  return blacklist.some(blCmd => command.includes(blCmd));
}

/**
 * 检查命令是否在白名单中
 * @param command 要检查的命令
 * @param whitelist 白名单列表
 * @returns 检查结果
 */
function isCommandWhitelisted(command: string, whitelist: ReadonlyArray<string>): { whitelisted: boolean; reason?: string } {
  const isWhitelisted = whitelist.some(wlCmd => command.startsWith(wlCmd) || command === wlCmd);
  return {
    whitelisted: isWhitelisted,
    reason: isWhitelisted ? undefined : "Command not in whitelist"
  };
}

/**
 * 封装的exec函数，返回Promise
 */
async function execAsync(command: string, options: ExecOptions = {}): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process');
    exec(command, options, (error: ExecException | null, stdout: string, stderr: string) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

/**
 * 执行shell命令
 * @param command 要执行的命令
 * @param options 执行选项
 * @returns 命令执行结果
 */
export async function executeShellCommand(
  command: string,
  options: ShellExecuteOptions = {}
): Promise<ExecutionResult> {
  let executionCommand = command;
  const blacklist: ReadonlyArray<string> = getCommandBlacklist();
  const whitelist: ReadonlyArray<string> = getCommandWhitelist();
  
  // 检查命令是否在黑名单中
  if (
    !options.skipBlacklistCheck &&
    isCommandBlacklisted(executionCommand, blacklist)
  ) {
    console.log(chalk.red('Blacklisted command warning'));
    
    ConsoleUtils.showWarning(
      `Command '${executionCommand}' is blacklisted and cannot be executed.`
    );
    return {
      success: false,
      stdout: "",
      stderr: "Command is blacklisted and cannot be executed.",
    };
  }

  // 白名单检查和确认逻辑
  let needsConfirmation = false;
  let confirmationReason = "";

  if (!options.skipWhitelistCheck) {
    const whitelistResult = isCommandWhitelisted(executionCommand, whitelist);
    if (!whitelistResult.whitelisted) {
      needsConfirmation = true;
      confirmationReason = whitelistResult.reason || "Command not in whitelist";
    }
  }

  if (needsConfirmation && !options.skipConfirmation) {
    console.log(chalk.yellow('Command confirmation required'));
    
    ConsoleUtils.showWarning(`Confirm execution: (Reason: ${confirmationReason})`);
    console.log(`Command: ${ConsoleUtils.formatCommand(executionCommand)}`);
    
    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: "Execute this command?",
        default: false,
      }
    ]);
    
    if (!confirm) {
      console.log(chalk.red('Command execution cancelled'));
      
      return {
        success: false,
        stdout: "",
        stderr: "Command execution cancelled by user.",
      };
    }
  }

  try {
    console.log(chalk.green('Starting command execution'));
    
    const { stdout, stderr } = await execAsync(executionCommand, {
      cwd: options.cwd,
      ...(options.execOptions || {}),
    });

    console.log(chalk.green('Command executed successfully'));
    
    return {
      success: true,
      stdout,
      stderr,
    };
  } catch (error) {
    console.log(chalk.red('Command execution failed'));
    
    const err = error as ExecException & { stdout?: string; stderr?: string };
    console.error(`Error: ${err.message}`);
    
    return {
      success: false,
      stdout: err.stdout || "",
      stderr: err.stderr || err.message,
    };
  }
}
