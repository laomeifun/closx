import { exec, ExecOptions, ExecException } from 'child_process';
import { spawn, SpawnOptions } from 'child_process';
import { promisify } from 'util';

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

/**
 * 使用inherit模式执行shell命令
 * 该模式下，命令的stdio直接连接到父进程的stdio
 * @param command 要执行的命令
 * @param options spawn选项
 * @returns Promise包含退出码和命令信息
 */
export async function execInherit(
  command: string,
  options: SpawnOptions = {}
): Promise<{ exitCode: number; command: string }> {
  return new Promise((resolve, reject) => {
    // 设置默认选项：使用shell并继承stdio
    const mergedOptions: SpawnOptions = {
      shell: true,
      stdio: 'inherit',
      ...options
    };
    
    console.log(`\n执行命令: ${command}\n`);
    
    const childProcess = spawn(command, [], mergedOptions);
    
    childProcess.on('close', (code) => {
      const exitCode = code || 0;
      resolve({ 
        exitCode,
        command 
      });
    });
    
    childProcess.on('error', (err) => {
      reject(err);
    });
  });
}