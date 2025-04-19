/**
 * Shell 标签处理模块
 */
import { ShellExecutor } from '../utils/shell-executor';
import { ConsoleUtils } from '../utils/console-utils';

/**
 * Shell 标签处理器
 */
export class ShellTagProcessor {
  private readonly shellExecutor: ShellExecutor;
  
  constructor() {
    this.shellExecutor = new ShellExecutor();
  }
  
  /**
   * 处理响应中的 <shell> 标签
   * @param response - AI 响应内容
   * @param currentDir - 当前工作目录
   */
  public async processShellTags(response: string, currentDir: string): Promise<void> {
    // 查找<shell></shell>标签内的内容
    const shellTagRegex = /<shell>([\s\S]*?)<\/shell>/g;
    let match;
    const commands: string[] = [];
  
    while ((match = shellTagRegex.exec(response)) !== null) {
      if (match[1]) {
        // 去除所有的反引号和可能的 Markdown 格式
        const cmd = match[1].trim()
          .replace(/`/g, '')   // 移除所有反引号
          .trim();
          
        if (cmd) {
          commands.push(cmd);
        }
      }
    }
  
    if (commands.length === 0) {
      return;
    }
  
    // 执行命令
    ConsoleUtils.showWarning('\n检测到命令:');
    for (const cmd of commands) {
      await this.shellExecutor.executeInteractive(cmd, currentDir);
    }
  }
}
