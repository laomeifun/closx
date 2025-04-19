/**
 * Shell 标签处理模块
 */
import { ShellExecutor, ShellExecutionResult } from '../utils/shell-executor';
import { ConsoleUtils } from '../utils/console-utils';
import inquirer from 'inquirer';

/**
 * 命令执行结果
 */
export type CommandExecutionResult = {
  readonly command: string;
  readonly output: string;
  readonly exitCode: number;
};

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
   * @param options - 选项
   * @returns 命令执行结果数组
   */
  public async processShellTags(
    response: string, 
    currentDir: string, 
    options: { 
      executeCommands?: boolean; 
      interactive?: boolean;
    } = { executeCommands: true, interactive: true }
  ): Promise<CommandExecutionResult[]> {
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
      return [];
    }
  
    // 收集命令结果
    const results: CommandExecutionResult[] = [];
    
    // 如果需要执行命令
    if (options.executeCommands) {
      ConsoleUtils.showWarning('\n检测到命令:');
      
      // 显示所有将要执行的命令
      for (let i = 0; i < commands.length; i++) {
        console.log(`${i + 1}. ${ConsoleUtils.formatCommand(commands[i])}`);
      }
      
      // 如果是交互式模式，询问用户是否执行
      let shouldExecute = true;
      if (options.interactive && commands.length > 0) {
        const { confirm } = await inquirer.prompt({
          type: 'confirm',
          name: 'confirm',
          message: '是否执行以上命令？',
          default: true
        });
        
        shouldExecute = confirm;
      }
      
      if (shouldExecute) {
        // 执行所有命令
        for (const cmd of commands) {
          // 使用非交互式执行收集输出
          const result = await this.shellExecutor.execute(cmd, currentDir);
          
          // 收集命令执行结果
          const output = result.stdout + (result.stderr ? `\n${result.stderr}` : '');
          
          // 展示命令和输出
          console.log(ConsoleUtils.formatCommand(cmd));
          console.log(output);
          
          // 添加到结果数组
          results.push({
            command: cmd,
            output: output,
            exitCode: result.exitCode || 0
          });
        }
      } else {
        ConsoleUtils.showInfo('命令执行已取消');
        
        // 如果用户选择不执行，返回空输出
        for (const cmd of commands) {
          results.push({
            command: cmd,
            output: '命令执行已取消',
            exitCode: 0
          });
        }
      }
    } else {
      // 如果不需要执行命令，只收集命令
      for (const cmd of commands) {
        results.push({
          command: cmd,
          output: '',  // 空输出，因为命令没有被执行
          exitCode: 0
        });
      }
    }
    
    return results;
  }
}
