/**
 * Prompt Generator Tool
 * Used to generate prompts containing system environment information
 */
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

/**
 * System Environment Information Structure
 */
export type SystemEnvironmentInfo = {
  readonly shell: string;
  readonly osVersion: string;
  readonly platform: string;
  readonly initialDir: string;
  readonly currentDir: string;
  readonly username: string;
  readonly hostname: string;
  readonly path: string;
  readonly locale: string;
  readonly architecture: string;
  readonly nodeVersion: string;
};

/**
 * Prompt Generator Class
 */
export class PromptGenerator {
  private readonly execPromise = promisify(exec);
  
  /**
   * Get system environment information
   */
  public async getSystemEnvironmentInfo(): Promise<SystemEnvironmentInfo> {
    // Get Shell information
    let shell = process.env.SHELL || '';
    try {
      const { stdout } = await this.execPromise('echo $SHELL');
      shell = stdout.trim();
    } catch (error) {
      // Ignore error
    }
    
    // Get Node.js version
    let nodeVersion = process.version;
    try {
      const { stdout } = await this.execPromise('node -v');
      nodeVersion = stdout.trim();
    } catch (error) {
      // Ignore error
    }
    
    return {
      shell,
      osVersion: os.release(),
      platform: os.platform(),
      initialDir: process.env.PWD || process.cwd(),
      currentDir: process.cwd(),
      username: os.userInfo().username,
      hostname: os.hostname(),
      path: process.env.PATH || '',
      locale: process.env.LANG || '',
      architecture: os.arch(),
      nodeVersion,
    };
  }
  
  /**
   * Generate system prompt with environment information
   */
  public async generateShellPromptWithEnv(): Promise<string> {
    const envInfo = await this.getSystemEnvironmentInfo();
    
    return `You are an interactive terminal agent that can help users execute commands and answer questions.
Environment information:
- Shell: ${envInfo.shell}
- Operating System: ${envInfo.platform} ${envInfo.osVersion}
- Architecture: ${envInfo.architecture}
- Initial Directory: ${envInfo.initialDir}
- Current Directory: ${envInfo.currentDir}
- User: ${envInfo.username}@${envInfo.hostname}
- PATH: ${envInfo.path}
- Locale: ${envInfo.locale}
- Node.js Version: ${envInfo.nodeVersion}

Current Time: ${new Date().toISOString()}
You can execute commands and have conversations with users.`;
  }
}
