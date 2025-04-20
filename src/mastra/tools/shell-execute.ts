import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { spawn } from 'child_process';
import inquirer from 'inquirer';
import { isCommandAllowed, getCommandBlacklist } from '../../config/settings';
import { ConsoleUtils } from '../../cli/utils/console-utils';

/**
 * Shell command execution tool
 * Uses Node.js built-in child_process module to execute shell commands
 * Handles only non-interactive commands, but displays output to the terminal
 */
export const shellExecuteTool = createTool({
  id: 'shell-execute',
  description: 'Execute non-interactive shell commands and return results',
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
      // 检查命令是否在黑名单中
      const blacklist = getCommandBlacklist();
      const isBlacklisted = blacklist.some(blackCmd => context.command.includes(blackCmd));
      
      // 如果命令在黑名单中，需要用户确认
      if (isBlacklisted) {
        ConsoleUtils.showWarning(`命令包含黑名单关键字: ${context.command}`);
        const { confirmBlacklisted } = await inquirer.prompt({
          type: 'confirm',
          name: 'confirmBlacklisted',
          message: `该命令包含黑名单关键字，是否仍然执行？`,
          default: false
        });
        
        if (!confirmBlacklisted) {
          return resolve({
            stdout: '',
            stderr: '命令执行已取消（黑名单原因）',
            exitCode: 1
          });
        }
      } else if (!isCommandAllowed(context.command)) {
        ConsoleUtils.showWarning(`命令被禁止执行: ${context.command}`);
        return resolve({
          stdout: '',
          stderr: '此命令被禁止执行',
          exitCode: 1
        });
      }
      
      // Parse command and arguments
      const args = context.command.split(' ');
      const cmd = args.shift() || '';
      
      // Set options
      const options: {
        cwd?: string;
        shell?: boolean;
        stdio?: any;
        detached?: boolean;
      } = {
        shell: true, // Use shell to execute command
        stdio: 'pipe', // Use pipe to capture output
        detached: false // Don't detach process for better control
      };
      
      if (context.cwd) {
        options.cwd = context.cwd;
      }
      
      console.log(`Executing: ${context.command}`);
      
      // Use spawn to execute command
      const childProcess = spawn(cmd, args, options);
      
      let stdoutData = '';
      let stderrData = '';
      
      // Create a flag indicating if the command has finished
      let commandFinished = false;
      
      // Create a one-time SIGINT handler
      const sigintHandler = () => {
        if (!commandFinished) {
          console.log('\nUser interrupted command execution');
          childProcess.kill('SIGINT');
          // Clean up event listeners
          process.removeListener('SIGINT', sigintHandler);
          resolve({
            stdout: stdoutData,
            stderr: stderrData + '\nCommand was interrupted by user',
            exitCode: 130, // User interrupt exit code
          });
        }
      };
      
      // Add SIGINT handler
      process.on('SIGINT', sigintHandler);
      
      // Collect standard output
      childProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        stdoutData += output;
        process.stdout.write(output); // Also display in terminal
      });
      
      // Collect standard error
      childProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        stderrData += output;
        process.stderr.write(output); // Also display in terminal
      });
      
      // Return result after command execution completes
      childProcess.on('close', (code) => {
        commandFinished = true;
        // Clean up event listeners
        process.removeListener('SIGINT', sigintHandler);
        
        // Return captured output
        resolve({
          stdout: stdoutData,
          stderr: stderrData,
          exitCode: code,
        });
      });
      
      // Handle errors
      childProcess.on('error', (error) => {
        commandFinished = true;
        // Clean up event listeners
        process.removeListener('SIGINT', sigintHandler);
        
        console.error(`Command execution error: ${error.message}`);
        resolve({
          stdout: stdoutData,
          stderr: `${stderrData}\nCommand execution error: ${error.message}`,
          exitCode: 1,
        });
      });
      
      // Set timeout
      if (context.timeout) {
        setTimeout(() => {
          if (!commandFinished) {
            childProcess.kill();
            // Clean up event listeners
            process.removeListener('SIGINT', sigintHandler);
            
            resolve({
              stdout: stdoutData,
              stderr: `${stderrData}\nCommand execution timed out`,
              exitCode: 124, // Timeout exit code
            });
          }
        }, context.timeout);
      }
    });
  },
});
