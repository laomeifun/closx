import { exec, ExecOptions, ExecException } from 'child_process';

/**
 * Executes a shell command and returns the result as a Promise
 * @param command Command to execute
 * @param options Options for execution
 * @returns Promise with stdout and stderr
 */
export async function execAsync(
  command: string,
  options: ExecOptions = {}
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
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