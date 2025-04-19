/**
 * AI 代理交互服务
 */
import { shell } from '../../mastra/agents/index';
import { ChatMessage } from '../types/terminal-types';

/**
 * 代理响应结果
 */
export type AgentResponse = {
  readonly textStream: AsyncIterable<string>;
};

/**
 * 代理请求选项
 */
export type AgentRequestOptions = {
  readonly resourceId: string;
  readonly threadId: string;
};

/**
 * 代理服务类
 * 负责处理与 AI 代理的交互
 */
export class AgentService {
  /**
   * 向 AI 代理发送消息并获取流式响应
   * @param messages - 对话历史消息
   * @param options - 请求选项
   * @returns 代理响应
   */
  public async streamResponse(
    messages: ChatMessage[], 
    options: AgentRequestOptions
  ): Promise<AgentResponse> {
    return shell.stream(messages, options);
  }
  
  /**
   * 生成唯一的资源 ID
   * @returns 资源 ID 字符串
   */
  public generateResourceId(): string {
    return `resource-${Date.now()}`;
  }
  
  /**
   * 生成唯一的线程 ID
   * @returns 线程 ID 字符串
   */
  public generateThreadId(): string {
    return `thread-${Date.now()}`;
  }
}
