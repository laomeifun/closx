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

        console.log(`[DEBUG] ShellExecute: Mode=${mode}, Whitelisted=${isOnWhitelist}, Blacklisted=${isOnBlacklist}`);

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
            console.warn(`[DEBUG] ShellExecute: Unknown mode '${mode}', defaulting to WHITELIST behavior.`);
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
          console.log('\n\n' + chalk.yellow('╔════════════════════════════════════╗'));
          console.log(chalk.yellow('║       🔍 命令确认请求              ║'));
          console.log(chalk.yellow('╚════════════════════════════════════╝'));
          
          ConsoleUtils.showWarning(`Confirmation required for: ${ConsoleUtils.formatCommand(command)} (Reason: ${confirmationReason})`);
          
          const { action } = await inquirer.prompt({
            type: 'list',
            name: 'action',
            message: '请选择操作:',
            choices: [
              { name: '✅ 执行命令', value: 'execute' },
              { name: '🔄 修改并执行', value: 'modify' },
              { name: '❓ 查看命令详情', value: 'details' },
              { name: '❌ 拒绝执行', value: 'reject' }
            ],
            default: confirmDefault ? 'execute' : 'reject',
          });
          
          if (action === 'modify') {
            const { modifiedCommand } = await inquirer.prompt({
              type: 'input',
              name: 'modifiedCommand',
              message: '请修改命令:',
              default: command
            });
            if (modifiedCommand && modifiedCommand !== command) {
              confirmedToExecute = true;
              // 更新要执行的命令
              command = modifiedCommand;
            } else {
              // 用户没有修改命令或清空输入，回到选择菜单
              const { retry } = await inquirer.prompt({
                type: 'list',
                name: 'retry',
                message: '命令未更改，请选择:',
                choices: [
                  { name: '✅ 执行原命令', value: 'execute' },
                  { name: '❌ 拒绝执行', value: 'reject' }
                ]
              });
              confirmedToExecute = retry === 'execute';
            }
          } else if (action === 'details') {
            console.log('\n' + chalk.cyan('╔════════════════════════════════════╗'));
            console.log(chalk.cyan('║       ℹ️ 命令详细信息              ║'));
            console.log(chalk.cyan('╚════════════════════════════════════╝'));
            console.log(`命令: ${ConsoleUtils.formatCommand(command)}`);
            console.log(`工作目录: ${cwd || '当前目录'}`);
            console.log(`确认原因: ${confirmationReason}`);
            console.log(`超时设置: ${timeout ? timeout + 'ms' : '无'}`);
            
            // 显示详情后返回到选择菜单
            const { retry } = await inquirer.prompt({
              type: 'list',
              name: 'retry',
              message: '请选择操作:',
              choices: [
                { name: '✅ 执行命令', value: 'execute' },
                { name: '🔄 修改并执行', value: 'modify' },
                { name: '❌ 拒绝执行', value: 'reject' }
              ],
              default: confirmDefault ? 'execute' : 'reject',
            });
            
            if (retry === 'modify') {
              const { modifiedCommand } = await inquirer.prompt({
                type: 'input',
                name: 'modifiedCommand',
                message: '请修改命令:',
                default: command
              });
              
              if (modifiedCommand && modifiedCommand !== command) {
                confirmedToExecute = true;
                // 更新要执行的命令
                command = modifiedCommand;
              } else {
                // 用户没有修改命令，询问是否执行原命令
                const { execute } = await inquirer.prompt({
                  type: 'confirm',
                  name: 'execute',
                  message: '命令未更改，是否执行原命令?',
                  default: confirmDefault
                });
                confirmedToExecute = execute;
              }
            } else {
              confirmedToExecute = retry === 'execute';
            }
          } else {
            confirmedToExecute = action === 'execute';
          }
        } catch (error: any) {
          return resolve({
            stdout: '',
            stderr: `Failed to get user confirmation: ${error.message}. Execution cancelled.`,
            exitCode: 1,
          });
        }
      }

      if (!confirmedToExecute) {
        console.log('\n' + chalk.red('╔════════════════════════════════════╗'));
        console.log(chalk.red('║       ⛔ 命令执行已取消            ║'));
        console.log(chalk.red('╚════════════════════════════════════╝') + '\n');
        
        const reason = needsConfirmation ? `cancelled by user (${confirmationReason})` : 'permission check failed';
        return resolve({
          stdout: '',
          stderr: `Command execution ${reason}.`,
          exitCode: 1,
        });
      }

      console.log('\n' + chalk.green('╔════════════════════════════════════╗'));
      console.log(chalk.green('║       🚀 开始执行命令              ║'));
      console.log(chalk.green('╚════════════════════════════════════╝') + '\n');

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
        
        // 添加命令执行完成的视觉标识
        if (code === 0) {
          console.log('\n' + chalk.green('╔════════════════════════════════════╗'));
          console.log(chalk.green('║       ✅ 命令执行成功              ║'));
          console.log(chalk.green('╚════════════════════════════════════╝') + '\n');
        } else {
          console.log('\n' + chalk.red('╔════════════════════════════════════╗'));
          console.log(chalk.red(`║       ❌ 命令执行失败 (代码: ${code})      ║`));
          console.log(chalk.red('╚════════════════════════════════════╝') + '\n');
        }
        
        resolve({ stdout: stdoutData, stderr: stderrData, exitCode: code });
      });

      childProcess.on('error', (error: Error) => {
        if (commandFinished) return;
        commandFinished = true;
        if (timeoutId) clearTimeout(timeoutId);
        removeAllListeners();
        
        console.log('\n' + chalk.red('╔════════════════════════════════════╗'));
        console.log(chalk.red('║       ❌ 命令执行错误              ║'));
        console.log(chalk.red('╚════════════════════════════════════╝') + '\n');
        console.error(`错误信息: ${error.message}`);
        
        resolve({ stdout: stdoutData, stderr: `${stderrData}\nCommand execution error: ${error.message}`, exitCode: 1 });
      });

      if (timeout) {
        timeoutId = setTimeout(() => {
          if (!commandFinished) {
            commandFinished = true;
            removeAllListeners();
            
            console.log('\n' + chalk.yellow('╔════════════════════════════════════╗'));
            console.log(chalk.yellow(`║   ⏱️ 命令执行超时 (${timeout}ms)       ║`));
            console.log(chalk.yellow('╚════════════════════════════════════╝') + '\n');
            
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
    console.log('\n' + chalk.red('╔════════════════════════════════════╗'));
    console.log(chalk.red('║       ⚠️ 黑名单命令警告              ║'));
    console.log(chalk.red('╚════════════════════════════════════╝') + '\n');
    
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
    // 添加明显的分隔线和标题，提高确认提示的可见性
    console.log('\n' + chalk.yellow('╔════════════════════════════════════╗'));
    console.log(chalk.yellow('║       🔍 命令确认请求              ║'));
    console.log(chalk.yellow('╚════════════════════════════════════╝') + '\n');
    
    ConsoleUtils.showWarning(`Confirmation required for: ${ConsoleUtils.formatCommand(executionCommand)} (Reason: ${confirmationReason})`);
    
    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "请选择操作:",
        choices: [
          { name: "✅ 执行命令", value: "execute" },
          { name: "🔄 修改并执行", value: "modify" },
          { name: "❓ 查看命令详情", value: "details" },
          { name: "❌ 拒绝执行", value: "reject" }
        ],
        default: "reject",
      }
    ]);
    
    let executeCommand = false;
    
    if (action === "modify") {
      const { modifiedCommand } = await inquirer.prompt([
        {
          type: "input",
          name: "modifiedCommand",
          message: "请修改命令:",
          default: executionCommand
        }
      ]);
      
      if (modifiedCommand && modifiedCommand !== executionCommand) {
        executeCommand = true;
        executionCommand = modifiedCommand;
      } else {
        // 用户没有修改命令，询问是否执行原命令
        const { execute } = await inquirer.prompt([{
          type: "confirm",
          name: "execute",
          message: "命令未更改，是否执行原命令?",
          default: false
        }]);
        executeCommand = execute;
      }
    } else if (action === "details") {
      console.log('\n' + chalk.cyan('╔════════════════════════════════════╗'));
      console.log(chalk.cyan('║       ℹ️ 命令详细信息              ║'));
      console.log(chalk.cyan('╚════════════════════════════════════╝'));
      console.log(`命令: ${ConsoleUtils.formatCommand(executionCommand)}`);
      console.log(`工作目录: ${options.cwd || '当前目录'}`);
      console.log(`确认原因: ${confirmationReason}`);
      
      // 显示详情后返回到选择菜单
      const { retry } = await inquirer.prompt([{
        type: "list",
        name: "retry",
        message: "请选择操作:",
        choices: [
          { name: "✅ 执行命令", value: "execute" },
          { name: "🔄 修改并执行", value: "modify" },
          { name: "❌ 拒绝执行", value: "reject" }
        ],
        default: "reject",
      }]);
      
      if (retry === "modify") {
        const { modifiedCommand } = await inquirer.prompt([{
          type: "input",
          name: "modifiedCommand",
          message: "请修改命令:",
          default: executionCommand
        }]);
        
        if (modifiedCommand && modifiedCommand !== executionCommand) {
          executeCommand = true;
          executionCommand = modifiedCommand;
        } else {
          // 用户没有修改命令，询问是否执行原命令
          const { execute } = await inquirer.prompt([{
            type: "confirm",
            name: "execute",
            message: "命令未更改，是否执行原命令?",
            default: false
          }]);
          executeCommand = execute;
        }
      } else {
        executeCommand = retry === "execute";
      }
    } else {
      executeCommand = action === "execute";
    }

    if (!executeCommand) {
      console.log('\n' + chalk.red('╔════════════════════════════════════╗'));
      console.log(chalk.red('║       ⛔ 命令执行已取消            ║'));
      console.log(chalk.red('╚════════════════════════════════════╝') + '\n');
      
      return {
        success: false,
        stdout: "",
        stderr: "Command execution cancelled by user.",
      };
    }
  }

  try {
    // 添加明显的执行开始标识
    console.log('\n' + chalk.green('╔════════════════════════════════════╗'));
    console.log(chalk.green('║       🚀 开始执行命令              ║'));
    console.log(chalk.green('╚════════════════════════════════════╝') + '\n');
    
    const { stdout, stderr } = await execAsync(executionCommand, {
      cwd: options.cwd,
      ...(options.execOptions || {}),
    });

    // 添加执行完成标识
    console.log('\n' + chalk.green('╔════════════════════════════════════╗'));
    console.log(chalk.green('║       ✅ 命令执行完成              ║'));
    console.log(chalk.green('╚════════════════════════════════════╝') + '\n');
    
    return {
      success: true,
      stdout,
      stderr,
    };
  } catch (error) {
    // 添加错误标识
    console.log('\n' + chalk.red('╔════════════════════════════════════╗'));
    console.log(chalk.red('║       ❌ 命令执行失败              ║'));
    console.log(chalk.red('╚════════════════════════════════════╝') + '\n');
    
    const err = error as ExecException & { stdout?: string; stderr?: string };
    console.error(`错误信息: ${err.message}`);
    
    return {
      success: false,
      stdout: err.stdout || "",
      stderr: err.stderr || err.message,
    };
  }
}
