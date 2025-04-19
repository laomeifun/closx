/**
 * 提示词生成工具
 * 用于生成包含系统环境信息的提示词
 */
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

/**
 * 系统环境信息结构
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
 * 提示词生成器类
 */
export class PromptGenerator {
  private readonly execPromise = promisify(exec);
  
  /**
   * 获取系统环境信息
   */
  public async getSystemEnvironmentInfo(): Promise<SystemEnvironmentInfo> {
    // 获取Shell信息
    let shell = process.env.SHELL || '';
    try {
      const { stdout } = await this.execPromise('echo $SHELL');
      shell = stdout.trim();
    } catch (error) {
      // 忽略错误
    }
    
    // 获取Node.js版本
    let nodeVersion = process.version;
    try {
      const { stdout } = await this.execPromise('node -v');
      nodeVersion = stdout.trim();
    } catch (error) {
      // 忽略错误
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
   * 生成带有环境信息的系统提示词
   */
  public async generateShellPromptWithEnv(): Promise<string> {
    const envInfo = await this.getSystemEnvironmentInfo();
    
    return `你是一个交互式终端代理，可以帮助用户执行命令和解答问题。
环境信息:
- Shell: ${envInfo.shell}
- 操作系统: ${envInfo.platform} ${envInfo.osVersion}
- 架构: ${envInfo.architecture}
- 初始目录: ${envInfo.initialDir}
- 当前目录: ${envInfo.currentDir}
- 用户: ${envInfo.username}@${envInfo.hostname}
- PATH: ${envInfo.path}
- 语言环境: ${envInfo.locale}
- Node.js 版本: ${envInfo.nodeVersion}

当前时间: ${new Date().toISOString()}
你可以执行命令并与用户进行对话。`;
  }
}
