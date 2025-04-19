import { shell } from './agents/index.js';

/**
 * 与 Shell Agent 进行对话
 * @param message 用户消息
 * @param resourceId 资源ID（可选，用于维持会话上下文）
 * @param threadId 线程ID（可选，用于维持会话上下文）
 * @returns 返回 Agent 的回复
 */
export async function chatWithshell(
  message: string,
  resourceId?: string,
  threadId?: string
): Promise<string> {
  try {
    // 如果没有提供 resourceId 和 threadId，则创建新的
    const actualResourceId = resourceId || `shell-resource-${Date.now()}`;
    const actualThreadId = threadId || `shell-thread-${Date.now()}`;

    // 使用 stream 方法与 agent 进行对话
    const response = await shell.stream(
      [{ role: 'user', content: message }],
      { resourceId: actualResourceId, threadId: actualThreadId }
    );

    // 收集完整的回复
    let fullResponse = '';
    for await (const chunk of response.textStream) {
      fullResponse += chunk;
    }

    return fullResponse;
  } catch (error) {
    console.error('与 Shell Agent 对话时出错:', error);
    return `对话出错: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * 创建一个对话会话
 * @returns 返回会话ID信息，可用于后续对话
 */
export function createConversation() {
  const resourceId = `shell-resource-${Date.now()}`;
  const threadId = `shell-thread-${Date.now()}`;
  
  return {
    resourceId,
    threadId,
    message: '会话已创建，请使用这些ID进行后续对话以保持上下文连续性'
  };
}
