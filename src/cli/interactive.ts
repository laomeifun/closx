import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { Command } from 'commander';
import { shell } from '../mastra/agents/index';

// 定义类型
type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type SessionState = {
  messages: ChatMessage[];
  currentDir: string;
  resourceId: string;
  threadId: string;
};

/**
 * 交互式终端代理
 * 提供与 AI 代理交互的命令行界面
 */
export class TerminalAgent {
  private program: Command;
  private state: SessionState;
  private execPromise = promisify(exec);

  constructor() {
    this.program = new Command();
    this.state = {
      messages: [],
      currentDir: process.cwd(),
      resourceId: `resource-${Date.now()}`,
      threadId: `thread-${Date.now()}`,
    };

    this.setupCommands();
  }

  /**
   * 设置命令行参数
   */
  private setupCommands(): void {
    this.program
      .name('closx')
      .description('交互式终端代理')
      .version('1.0.0')
      .option('-v, --verbose', '显示详细输出')
      .option('-i, --interactive', '进入交互式界面')
      .argument('[command]', '直接执行命令')
      .action(async (command, options) => {
        if (command) {
          // 直接执行命令模式
          await this.executeOneCommand(command, options.verbose);
        } else if (options.interactive || !command) {
          // 交互式界面模式
          await this.startInteractiveSession(options.verbose);
        }
      });
  }

  /**
   * 解析命令行参数并启动程序
   */
  public async run(args: string[] = process.argv): Promise<void> {
    await this.program.parseAsync(args);
  }

  /**
   * 启动交互式会话
   */
  private async startInteractiveSession(verbose: boolean = false): Promise<void> {
    console.log(chalk.blue('=== 交互式终端代理 ==='));
    console.log(chalk.gray(`工作目录: ${this.state.currentDir}`));
    console.log(chalk.yellow('\n提示: 输入 /help 查看可用命令\n'));

    // 添加系统消息
    this.state.messages.push({
      role: 'system',
      content: `你是一个交互式终端代理，可以帮助用户执行命令和解答问题。
当前工作目录: ${this.state.currentDir}
当前时间: ${new Date().toISOString()}
你可以执行命令并与用户进行对话。`
    });

    await this.chatLoop(verbose);
  }

  /**
   * 主聊天循环
   */
  private async chatLoop(verbose: boolean): Promise<void> {
    while (true) {
      const { userInput } = await inquirer.prompt({
        type: 'input',
        name: 'userInput',
        message: chalk.green('用户 >')
      });

      if (!userInput || userInput.trim() === '') {
        continue;
      }

      // 处理特殊命令
      if (userInput.startsWith('/')) {
        const handled = await this.handleSpecialCommand(userInput);
        if (handled) continue;
      }

      // 添加用户消息
      this.state.messages.push({
        role: 'user',
        content: userInput
      });

      // 显示加载动画
      const spinner = ora('AI 思考中...').start();

      try {
        // 获取代理响应
        const response = await shell.stream(
          this.state.messages,
          { resourceId: this.state.resourceId, threadId: this.state.threadId }
        );

        spinner.stop();
        console.log(chalk.blue('AI > '));

        let fullResponse = '';
        for await (const chunk of response.textStream) {
          process.stdout.write(chunk);
          fullResponse += chunk;
        }
        console.log('\n');

        // 添加助手消息
        this.state.messages.push({
          role: 'assistant',
          content: fullResponse
        });

        // 处理<shell>标签
        await this.processShellTags(fullResponse);

      } catch (error) {
        spinner.fail('发生错误');
        console.error(chalk.red('错误:'), error);
      }
    }
  }

  /**
   * 处理特殊命令
   */
  /**
   * 一次性执行命令
   */
  private async executeOneCommand(command: string, verbose: boolean = false): Promise<void> {
    // 添加系统消息
    this.state.messages.push({
      role: 'system',
      content: `你是一个交互式终端代理，可以帮助用户执行命令和解答问题。
当前工作目录: ${this.state.currentDir}
当前时间: ${new Date().toISOString()}
你可以执行命令并与用户进行对话。`
    });

    // 添加用户消息
    this.state.messages.push({
      role: 'user',
      content: command
    });

    // 显示加载动画
    const spinner = ora('AI 思考中...').start();

    try {
      // 获取代理响应
      const response = await shell.stream(
        this.state.messages,
        { resourceId: this.state.resourceId, threadId: this.state.threadId }
      );

      spinner.stop();
      console.log(chalk.blue('AI > '));

      let fullResponse = '';
      for await (const chunk of response.textStream) {
        process.stdout.write(chunk);
        fullResponse += chunk;
      }
      console.log('\n');

      // 处理<shell>标签
      await this.processShellTags(fullResponse);

    } catch (error) {
      spinner.fail('发生错误');
      console.error(chalk.red('错误:'), error);
    }
  }

  /**
   * 处理响应中的<shell>标签
   */
  private async processShellTags(response: string): Promise<void> {
    // 查找<shell></shell>标签内的内容
    const shellTagRegex = /<shell>([\s\S]*?)<\/shell>/g;
    let match;
    const commands: string[] = [];
  
    while ((match = shellTagRegex.exec(response)) !== null) {
      if (match[1]) {
        // 去除所有的反引号和可能的Markdown格式
        let cmd = match[1].trim()
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
    console.log(chalk.yellow('\n检测到命令:'));
    for (const cmd of commands) {
      console.log(chalk.green(`执行: ${cmd}`));
  
      try {
        // 使用spawn来执行命令，以便实时显示输出
        const childProcess = spawn(cmd, { shell: true, cwd: this.state.currentDir, stdio: 'inherit' });
  
        // 等待命令执行完成
        await new Promise<void>((resolve, reject) => {
          childProcess.on('close', (code) => {
            if (code === 0) {
              resolve();
            } else {
              console.log(chalk.red(`命令退出码: ${code}`));
              resolve(); // 即使命令失败也继续
            }
          });
  
          childProcess.on('error', (err) => {
            console.error(chalk.red('命令执行错误:'), err);
            resolve(); // 即使命令失败也继续
          });
        });
      } catch (error: any) {
        console.error(chalk.red('执行命令出错:'), error.message);
      }
    }
  }

  private async handleSpecialCommand(command: string): Promise<boolean> {
    const cmd = command.trim().toLowerCase();

    if (cmd === '/help') {
      console.log(chalk.yellow('\n可用命令:'));
      console.log(chalk.yellow('/help') + ' - 显示此帮助信息');
      console.log(chalk.yellow('/quit') + ' - 退出程序');
      console.log(chalk.yellow('/exec <命令>') + ' - 执行 shell 命令');
      console.log(chalk.yellow('/clear') + ' - 清除对话历史');
      console.log(chalk.yellow('/env') + ' - 显示当前环境信息');
      console.log('\n');
      return true;
    }

    if (cmd === '/quit') {
      console.log(chalk.yellow('再见!'));
      process.exit(0);
    }

    if (cmd.startsWith('/exec ')) {
      const shellCmd = cmd.substring(6).trim();
      
      try {
        const spinner = ora(`执行命令: ${shellCmd}`).start();
        const { stdout, stderr } = await this.execPromise(shellCmd, { cwd: this.state.currentDir });
        spinner.stop();
        
        if (stdout) {
          console.log(chalk.gray('输出:'));
          console.log(stdout);
        }
        
        if (stderr) {
          console.log(chalk.red('错误:'));
          console.log(stderr);
        }
      } catch (error: any) {
        console.log(chalk.red('执行命令失败:'), error.message);
      }
      return true;
    }

    if (cmd === '/clear') {
      this.state.messages = this.state.messages.filter(msg => msg.role === 'system');
      console.log(chalk.green('已清除对话历史'));
      return true;
    }

    if (cmd === '/env') {
      try {
        const { stdout } = await this.execPromise('printenv', { cwd: this.state.currentDir });
        console.log(chalk.gray('环境变量:'));
        console.log(stdout);
      } catch (error: any) {
        console.log(chalk.red('获取环境变量失败:'), error.message);
      }
      return true;
    }

    return false;
  }
}

// 导出实例
export const terminalAgent = new TerminalAgent();