import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { spawn } from 'child_process';
import { promisify } from 'util';
import * as readline from 'readline';

/**
 * Interactive shell command execution tool
 * Allows users to interact with commands and injects execution results after command completion
 */
export const interactiveShellExecuteTool = createTool({
  id: 'interactive-shell-execute',
  description: 'Execute shell commands in interactive mode, allowing user interaction with the command',
  inputSchema: z.object({
    command: z.string().describe('The shell command to execute'),
    cwd: z.string().optional().describe('Working directory for command execution'),
    timeout: z.number().optional().describe('Command execution timeout (milliseconds)'),
  }),
  outputSchema: z.object({
    stdout: z.string().describe('Standard output of the command (special message in interactive mode)'),
    stderr: z.string().describe('Standard error output of the command'),
    exitCode: z.number().nullable().describe('Exit code of the command, 0 if successful'),
  }),
  execute: async ({ context }) => {
    return new Promise((resolve) => {
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
        stdio: 'inherit', // Directly inherit parent process stdio for interaction
        detached: false // Don't detach process for better control
      };
      
      if (context.cwd) {
        options.cwd = context.cwd;
      }
      
      console.log(`Executing interactive command: ${context.command}`);
      
      // Use spawn to execute command
      const childProcess = spawn(cmd, args, options);
      
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
            stdout: '[Interactive command was interrupted by user]',
            stderr: '',
            exitCode: 130, // User interrupt exit code
          });
        }
      };
      
      // Add SIGINT handler
      process.on('SIGINT', sigintHandler);
      
      // Return result after command execution completes
      childProcess.on('close', (code) => {
        commandFinished = true;
        // Clean up event listeners
        process.removeListener('SIGINT', sigintHandler);
        
        // Interactive commands don't collect standard output, use special message
        resolve({
          stdout: `[Interactive command completed with exit code: ${code}]`,
          stderr: '',
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
          stdout: '',
          stderr: `Command execution error: ${error.message}`,
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
              stdout: '',
              stderr: `Command execution timed out`,
              exitCode: 124, // Timeout exit code
            });
          }
        }, context.timeout);
      }
    });
  },
});
