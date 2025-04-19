/**
 * 会话管理服务
 * 负责管理会话状态和消息历史
 */
import { ChatMessage, SessionState } from '../types/terminal-types';
import { AgentService } from './agent-service';

/**
 * 会话服务类
 * 负责管理会话状态和消息历史
 */
export class SessionService {
  private readonly agentService: AgentService;
  private state: SessionState;

  /**
   * 构造函数
   */
  constructor() {
    this.agentService = new AgentService();
    this.state = {
      messages: [],
      currentDir: process.cwd(),
      resourceId: this.agentService.generateResourceId(),
      threadId: this.agentService.generateThreadId(),
    };
  }

  /**
   * 获取当前会话状态
   * @returns 会话状态
   */
  public getState(): SessionState {
    return this.state;
  }

  /**
   * 添加系统消息
   */
  public addSystemMessage(): void {
    // 创建新的消息数组并添加消息
    this.state = {
      ...this.state,
      messages: [...this.state.messages, {
        role: 'system',
        content: `当前会话ID: ${this.state.threadId}
当前时间: ${new Date().toISOString()}`
      }]
    };
  }

  /**
   * 添加用户消息
   * @param content - 消息内容
   */
  public addUserMessage(content: string): void {
    // 创建新的消息数组并添加消息
    this.state = {
      ...this.state,
      messages: [...this.state.messages, {
        role: 'user',
        content
      }]
    };
  }

  /**
   * 添加助手消息
   * @param content - 消息内容
   */
  public addAssistantMessage(content: string): void {
    // 创建新的消息数组并添加消息
    this.state = {
      ...this.state,
      messages: [...this.state.messages, {
        role: 'assistant',
        content
      }]
    };
  }

  /**
   * 获取消息历史
   * @returns 消息历史数组
   */
  public getMessages(): readonly ChatMessage[] {
    return this.state.messages;
  }

  /**
   * 设置当前工作目录
   * @param dir - 工作目录路径
   */
  public setCurrentDir(dir: string): void {
    // 创建新的状态对象
    this.state = {
      ...this.state,
      currentDir: dir
    };
  }

  /**
   * 获取当前工作目录
   * @returns 当前工作目录
   */
  public getCurrentDir(): string {
    return this.state.currentDir;
  }

  /**
   * 获取资源ID
   * @returns 资源ID
   */
  public getResourceId(): string {
    return this.state.resourceId;
  }

  /**
   * 获取线程ID
   * @returns 线程ID
   */
  public getThreadId(): string {
    return this.state.threadId;
  }
}
