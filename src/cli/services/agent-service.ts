/**
 * AI 代理交互服务
 */
import { shell, createShellAgent } from '../../mastra/agents/index';
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
    // 确保shell已经初始化
    if (!shell) {
      // 等待shell初始化完成
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 如果shell仍然未初始化，则抛出错误
      if (!shell) {
        throw new Error('代理尚未初始化完成，请稍后再试');
      }
    }
    
    // 只发送最新的用户消息，利用memory系统已有的历史记录
    const lastUserMessageIndex = [...messages].reverse().findIndex(msg => msg.role === 'user');
    
    if (lastUserMessageIndex !== -1) {
      const lastMessages = [
        // 包含最新的系统消息（如果有）
        ...messages.filter((msg, index) => 
          msg.role === 'system' && index > messages.length - lastUserMessageIndex - 2
        ),
        // 最新的用户消息
        messages[messages.length - lastUserMessageIndex - 1]
      ];
      
      return shell.stream(lastMessages, options);
    }
    
    // 如果没找到用户消息，发送所有消息（防止错误）
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
