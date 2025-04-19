/**
 * Shell Tag Processor Module
 */
import { ShellExecutor, ShellExecutionResult } from '../utils/shell-executor';
import { ConsoleUtils } from '../utils/console-utils';
import inquirer from 'inquirer';
import { AgentService } from '../services/agent-service';
import { ChatMessage } from '../types/terminal-types';

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
    } = { executeCommands: true, interactive: true, interactiveCommand: false }
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
      
      // If in interactive mode, ask user for confirmation
      let shouldExecute = true;
      if (options.interactive && commands.length > 0) {
        const { confirm } = await inquirer.prompt({
          type: 'confirm',
          name: 'confirm',
          message: 'Execute these commands?',
          default: true
        });
        
        shouldExecute = confirm;
      }
      
      if (shouldExecute) {
        // Execute all commands
        for (const cmd of commands) {
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
