/**
 * Shell Tag Processor Module
 */
import { ShellExecutor, ShellExecutionResult } from '../utils/shell-executor';
import { ConsoleUtils } from '../utils/console-utils';
import inquirer from 'inquirer';
import { AgentService } from '../services/agent-service';
import { ChatMessage } from '../types/terminal-types';
import { CommandExecutionMode } from '../../config/types';
import { getCommandExecutionMode, shouldConfirmCommand, isCommandAllowed, settingsManager } from '../../config/settings';

/**
 * Command Execution Result
 */
export type CommandExecutionResult = {
  readonly command: string;
  readonly output: string;
  readonly exitCode: number;
};

/**
 * Shell Tag Processor
 */
export class ShellTagProcessor {
  private readonly shellExecutor: ShellExecutor;
  private readonly agentService: AgentService;
  
  constructor() {
    this.shellExecutor = new ShellExecutor();
    this.agentService = new AgentService();
  }
  
  /**
   * Process <shell> tags in response
   * @param response - AI response content
   * @param currentDir - Current working directory
   * @param options - Options
   * @returns Array of command execution results
   */
  public async processShellTags(
    response: string, 
    currentDir: string, 
    options: { 
      executeCommands?: boolean; 
      interactive?: boolean;
      interactiveCommand?: boolean; // Whether to execute commands in interactive mode
      blacklistCheck?: boolean; // Whether to check blacklist even in non-interactive mode
    } = { executeCommands: true, interactive: true, interactiveCommand: false, blacklistCheck: false }
  ): Promise<CommandExecutionResult[]> {
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
  
    if (commands.length === 0) {
      return [];
    }
  
    // Collect command results
    const results: CommandExecutionResult[] = [];
    
    // If commands need to be executed
    if (options.executeCommands) {
      ConsoleUtils.showWarning('\nCommands detected:');
      
      // Show all commands to be executed
      for (let i = 0; i < commands.length; i++) {
        console.log(`${i + 1}. ${ConsoleUtils.formatCommand(commands[i])}`);
      }

      // 获取当前的命令执行模式
      const executionMode = getCommandExecutionMode();

      // 检查是否有黑名单命令
      const blacklist: string[] = settingsManager.getCommandBlacklist();
      const hasBlacklistedCommands = commands.some((cmd: string) =>
        blacklist.some((blackCmd: string) => cmd.includes(blackCmd))
      );

      // 初始化执行标志
      let shouldExecute = true;

      // 首先检查是否有黑名单命令
      if (hasBlacklistedCommands) {
        // 如果有黑名单命令，始终需要确认
        ConsoleUtils.showWarning('⚠️ 检测到黑名单命令！');
        const { confirm } = await inquirer.prompt({
          type: 'confirm',
          name: 'confirm',
          message: '检测到黑名单命令，是否继续执行？',
          default: false, // 默认不执行黑名单命令
        });
        
        shouldExecute = confirm;
      } else if (executionMode === CommandExecutionMode.MESSAGE) {
        // 如果是消息模式，不执行任何命令
        ConsoleUtils.showInfo('当前处于消息模式，命令将仅显示而不执行');
        shouldExecute = false;
      } else if (executionMode === CommandExecutionMode.AUTO) {
        // 如果是全自动模式且没有黑名单命令，自动执行
        shouldExecute = true;
      } else if (options.interactive) {
        // 如果要求交互式确认
        if (executionMode === CommandExecutionMode.WHITELIST || executionMode === CommandExecutionMode.BLACKLIST) {
          // 检查是否所有命令都需要确认
          const needConfirmation = commands.some(cmd => shouldConfirmCommand(cmd));
          
          if (needConfirmation) {
            const { confirm } = await inquirer.prompt({
              type: 'confirm',
              name: 'confirm',
              message: '执行这些命令？',
              default: true,
            });
            
            shouldExecute = confirm;
          } else {
            // 如果所有命令都不需要确认，则自动执行
            shouldExecute = true;
          }
        } else {
          // 其他模式下的默认行为
          const { confirm } = await inquirer.prompt({
            type: 'confirm',
            name: 'confirm',
            message: '执行这些命令？',
            default: true,
          });
          
          shouldExecute = confirm;
        }
      }

      if (shouldExecute) {
        // Execute all commands
        for (const cmd of commands) {
          // 检查命令是否允许执行
          // 首先检查黑名单
          const isBlacklisted = blacklist.some((blackCmd: string) => cmd.includes(blackCmd));
          
          if (isBlacklisted) {
            ConsoleUtils.showWarning(`命令包含黑名单关键字: ${cmd}`);
            const { confirmBlacklisted } = await inquirer.prompt({
              type: 'confirm',
              name: 'confirmBlacklisted',
              message: `该命令包含黑名单关键字，是否仍然执行？`,
              default: false
            });
            
            if (!confirmBlacklisted) {
              results.push({
                command: cmd,
                output: '命令执行已取消（黑名单原因）',
                exitCode: 1
              });
              continue;
            }
          } else if (!isCommandAllowed(cmd)) {
            ConsoleUtils.showWarning(`命令被禁止执行: ${cmd}`);
            results.push({
              command: cmd,
              output: '此命令被禁止执行',
              exitCode: 1
            });
            continue;
          }
          
          // 如果是白名单或黑名单模式，可能需要单独确认每个命令
          const mode = getCommandExecutionMode();
          if ((mode === CommandExecutionMode.WHITELIST || mode === CommandExecutionMode.BLACKLIST) && 
              options.interactive && shouldConfirmCommand(cmd)) {
            const { confirmCmd } = await inquirer.prompt({
              type: 'confirm',
              name: 'confirmCmd',
              message: `执行命令: ${cmd}?`,
              default: true
            });
            
            if (!confirmCmd) {
              results.push({
                command: cmd,
                output: '命令执行已取消',
                exitCode: 0
              });
              continue;
            }
          }
          let result: ShellExecutionResult;
          let output: string;
          
          // Based on whether to execute in interactive mode
          if (options.interactiveCommand) {
            // Use interactive mode to execute command
            console.log(ConsoleUtils.formatCommand(cmd));
            
            try {
              // First send command to AI via Agent service
              // Create a special message to tell agent to execute interactive command
              const message: ChatMessage = {
                role: 'user',
                content: `Please execute the following interactive command:\n\n\`\`\`\n${cmd}\n\`\`\`\n\nThis is an interactive command, please use interactive-shell-execute tool to execute.`
              };
              
              // Generate temporary resource ID and thread ID
              const resourceId = this.agentService.generateResourceId();
              const threadId = this.agentService.generateThreadId();
              
              // Call agent to execute command
              const response = await this.agentService.streamResponse([message], { resourceId, threadId });
              
              // Collect all output
              let agentOutput = '';
              for await (const chunk of response.textStream) {
                agentOutput += chunk;
                // Display output in real-time
                process.stdout.write(chunk);
              }
              
              // After completion, use local executor to execute command
              const exitCode = await this.shellExecutor.executeInteractive(cmd, currentDir);
              
              // Record command execution result
              output = `[Interactive command completed, exit code: ${exitCode}]`;
              
              result = {
                exitCode: exitCode,
                stdout: output,
                stderr: ''
              };
            } catch (error) {
              ConsoleUtils.showError('Failed to execute command through agent', error);
              // On failure, directly use local executor to execute command
              const exitCode = await this.shellExecutor.executeInteractive(cmd, currentDir);
              output = `[Interactive command completed, exit code: ${exitCode}]`;
              
              result = {
                exitCode: exitCode,
                stdout: output,
                stderr: ''
              };
            }
          } else {
            // Use non-interactive execution to collect output
            result = await this.shellExecutor.execute(cmd, currentDir);
            
            // Collect command execution result
            output = result.stdout + (result.stderr ? `\n${result.stderr}` : '');
            
            // Display command and output
            console.log(ConsoleUtils.formatCommand(cmd));
            console.log(output);
          }
          
          // Add to results array
          results.push({
            command: cmd,
            output: output,
            exitCode: result.exitCode || 0
          });
        }
      } else {
        ConsoleUtils.showInfo('Command execution cancelled');
        
        // If user chooses not to execute, return empty output
        for (const cmd of commands) {
          results.push({
            command: cmd,
            output: 'Command execution cancelled',
            exitCode: 0
          });
        }
      }
    } else {
      // If commands don't need to be executed, just collect them
      for (const cmd of commands) {
        results.push({
          command: cmd,
          output: '',  // Empty output, because command was not executed
          exitCode: 0
        });
      }
    }
    
    return results;
  }
}
