import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { AppSettings } from './types';
import { ALLOW_AUTO_EXECUTION } from './env';

/**
 * 设置管理类
 */
export class SettingsManager {
  private static instance: SettingsManager;
  private settings: AppSettings;

  /**
   * 私有构造函数
   */
  private constructor() {
    this.settings = {
      logLevel: 'info',
      allowAutoExecution: ALLOW_AUTO_EXECUTION,
      commandWhitelist: [
        'ls', 'cat', 'echo', 'pwd', 'find', 'grep',
        'npm list', 'npm run', 'npm start', 'npm test',
        'node --version', 'npm --version'
      ],
      commandBlacklist: [
        'rm -rf', 'sudo', 'chmod 777', 'mkfs',
        'dd if=/dev/zero', 'mv /* /dev/null'
      ]
    };
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
      // 异步加载设置，不阻塞实例创建
      SettingsManager.instance.loadSettings().catch(error => {
        console.error('加载设置失败:', error);
      });
    }
    return SettingsManager.instance;
  }

  /**
   * 加载设置
   */
  private async loadSettings(): Promise<void> {
    // 尝试从多个位置加载配置文件
    const configPaths = [
      './.closx',                  // 当前目录
      './.closx.json',             // 当前目录（显式后缀）
      './src/.closx',              // src目录
      './src/.closx.json',         // src目录（显式后缀）
      './src/closx.json',          // src目录（无点前缀）
      '~/.closx',                  // 用户主目录
      '~/.closx.json',             // 用户主目录（显式后缀）
      '~/.config/closx.json',      // 用户配置目录
      '~/.config/closx/closx.json' // 用户配置目录（应用特定）
    ];
    
    // 尝试加载每个配置文件
    for (const configPath of configPaths) {
      const result = await this.loadFromConfigFile(configPath);
      if (result) {
        // 成功加载配置
        // 不中断，继续加载其他配置文件，允许配置合并
      }
    }
  }
  
  /**
   * 从配置文件加载设置
   * @param configPath 配置文件路径，默认为~/.closx
   * @returns 配置是否成功加载
   */
  public async loadFromConfigFile(configPath: string = '~/.closx'): Promise<boolean> {
    try {
      // 处理路径中的~
      const expandedPath = configPath.startsWith('~') 
        ? path.join(os.homedir(), configPath.slice(1)) 
        : configPath;
      
      // 检查文件是否存在
      try {
        await fs.access(expandedPath);
      } catch (error) {
        // 尝试从配置文件加载
        return false;
      }
      
      // 读取文件内容
      const content = await fs.readFile(expandedPath, 'utf-8');
      
      // 解析JSON
      try {
        const config = JSON.parse(content);
        
        // 如果有settings配置，更新设置
        if (config.settings && typeof config.settings === 'object') {
          // 更新设置
          this.updateSettings(config.settings);
          return true;
        }
        
        // 配置文件中没有settings配置
        return false;
      } catch (error) {
        // 无效的JSON格式
        return false;
      }
    } catch (error) {
      // 读取配置文件失败
      return false;
    }
  }

  /**
   * 更新设置
   * @param newSettings 新设置
   */
  public updateSettings(newSettings: Partial<AppSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * 获取设置
   * @returns 当前设置
   */
  public getSettings(): AppSettings {
    return { ...this.settings };
  }

  /**
   * 获取是否允许自动执行
   * @returns 是否允许自动执行
   */
  public isAutoExecutionAllowed(): boolean {
    return !!this.settings.allowAutoExecution;
  }

  /**
   * 设置是否允许自动执行
   * @param allow 是否允许
   */
  public setAllowAutoExecution(allow: boolean): void {
    this.settings = { ...this.settings, allowAutoExecution: allow };
  }

  /**
   * 获取默认模型ID
   * @returns 默认模型ID
   */
  public getDefaultModelId(): string | undefined {
    return this.settings.defaultModel;
  }

  /**
   * 设置默认模型ID
   * @param modelId 模型ID
   */
  public setDefaultModelId(modelId: string): void {
    this.settings = { ...this.settings, defaultModel: modelId };
  }

  /**
   * 获取日志级别
   * @returns 日志级别
   */
  public getLogLevel(): string {
    return this.settings.logLevel || 'info';
  }

  /**
   * 设置日志级别
   * @param level 日志级别
   */
  public setLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    this.settings = { ...this.settings, logLevel: level };
  }

  /**
   * 获取命令白名单
   * @returns 命令白名单数组
   */
  public getCommandWhitelist(): string[] {
    return this.settings.commandWhitelist || [];
  }

  /**
   * 设置命令白名单
   * @param commands 命令白名单数组
   */
  public setCommandWhitelist(commands: string[]): void {
    this.settings = { ...this.settings, commandWhitelist: commands };
  }

  /**
   * 向命令白名单添加命令
   * @param command 要添加的命令
   */
  public addToCommandWhitelist(command: string): void {
    const currentWhitelist = this.getCommandWhitelist();
    if (!currentWhitelist.includes(command)) {
      this.setCommandWhitelist([...currentWhitelist, command]);
    }
  }

  /**
   * 从命令白名单移除命令
   * @param command 要移除的命令
   */
  public removeFromCommandWhitelist(command: string): void {
    const currentWhitelist = this.getCommandWhitelist();
    this.setCommandWhitelist(currentWhitelist.filter(cmd => cmd !== command));
  }

  /**
   * 获取命令黑名单
   * @returns 命令黑名单数组
   */
  public getCommandBlacklist(): string[] {
    return this.settings.commandBlacklist || [];
  }

  /**
   * 设置命令黑名单
   * @param commands 命令黑名单数组
   */
  public setCommandBlacklist(commands: string[]): void {
    this.settings = { ...this.settings, commandBlacklist: commands };
  }

  /**
   * 向命令黑名单添加命令
   * @param command 要添加的命令
   */
  public addToCommandBlacklist(command: string): void {
    const currentBlacklist = this.getCommandBlacklist();
    if (!currentBlacklist.includes(command)) {
      this.setCommandBlacklist([...currentBlacklist, command]);
    }
  }

  /**
   * 从命令黑名单移除命令
   * @param command 要移除的命令
   */
  public removeFromCommandBlacklist(command: string): void {
    const currentBlacklist = this.getCommandBlacklist();
    this.setCommandBlacklist(currentBlacklist.filter(cmd => cmd !== command));
  }

  /**
   * 检查命令是否允许执行
   * @param command 要检查的命令
   * @returns 是否允许执行
   */
  public isCommandAllowed(command: string): boolean {
    // 如果不允许自动执行，直接返回 false
    if (!this.isAutoExecutionAllowed()) {
      return false;
    }

    const whitelist = this.getCommandWhitelist();
    const blacklist = this.getCommandBlacklist();

    // 检查黑名单
    for (const blackCmd of blacklist) {
      if (command.includes(blackCmd)) {
        return false;
      }
    }

    // 如果白名单为空，则允许所有不在黑名单中的命令
    if (whitelist.length === 0) {
      return true;
    }

    // 检查白名单
    for (const whiteCmd of whitelist) {
      if (command.startsWith(whiteCmd)) {
        return true;
      }
    }

    return false;
  }
}

// 导出单例实例
export const settingsManager = SettingsManager.getInstance();

// 便捷函数
export const getSettings = (): AppSettings => {
  return settingsManager.getSettings();
};

export const isAutoExecutionAllowed = (): boolean => {
  return settingsManager.isAutoExecutionAllowed();
};

export const getDefaultModelId = (): string | undefined => {
  return settingsManager.getDefaultModelId();
};

export const getLogLevel = (): string => {
  return settingsManager.getLogLevel();
};

export const getCommandWhitelist = (): string[] => {
  return settingsManager.getCommandWhitelist();
};

export const getCommandBlacklist = (): string[] => {
  return settingsManager.getCommandBlacklist();
};

export const isCommandAllowed = (command: string): boolean => {
  return settingsManager.isCommandAllowed(command);
};
