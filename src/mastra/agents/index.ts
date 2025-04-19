import { Agent } from "@mastra/core/agent";
import { shellExecuteTool } from "../tools";
import { directoryInfoTool } from "../tools";
import { shellPrompt } from "./prompt";
import { getCurrentEnvironmentTool } from "../tools/get-current-environment";
import { getCurrentDirectoryTool } from "../tools/get-current-directory";
import { interactiveShellExecuteTool } from "../tools";
import { shellMemory } from "./shellmemory";
import config, { getBestAvailableModel, getModel, loadFromAllConfigLocations } from "../../config";

// 创建Agent
// 使用函数式方式，确保配置文件加载完成后再创建Agent
export const createShellAgent = async () => {
  // 先手动加载所有配置文件
  await loadFromAllConfigLocations();
  
  // 获取所有模型
  const allModels = config.modelRegistry.getAllModels();
  // 已加载模型配置
  
  // 获取最佳可用模型实例
  // 会自动选择配置文件中的模型，不需要指定模型ID
  const modelInstance = getBestAvailableModel();
  
  // 创建Agent
  return new Agent({
    name: "Shell",
    instructions: shellPrompt,
    model: modelInstance, // 这里传入的是一个配置好的模型实例
    tools: { shellExecuteTool, directoryInfoTool, getCurrentEnvironmentTool, interactiveShellExecuteTool },
    memory: shellMemory,
  });
};

// 初始化shell代理
export let shell: Agent;

// 立即初始化shell代理
createShellAgent().then(agent => {
  shell = agent;
  // 初始化shell代理完成
}).catch(error => {
  // 初始化shell代理失败
  // 创建一个默认的Agent作为备用
  shell = new Agent({
    name: "Shell",
    instructions: shellPrompt,
    model: config.openaiApi("gpt-4o"),
    tools: { shellExecuteTool, directoryInfoTool, getCurrentEnvironmentTool, interactiveShellExecuteTool },
    memory: shellMemory,
  });
});

// import { createOpenAI } from '@ai-sdk/openai';
// import { env } from 'process';

// export const myApi = createOpenAI({
//   baseURL: env.OPENAI_API_BASE_URL,
//   apiKey: env.OPENAI_API_KEY
// });
// export const shell = new Agent({
//   name: "Shell",
//   instructions: shellPrompt,
//   model:myApi("grok-3-beta"),
//   tools: { shellExecuteTool, directoryInfoTool, getCurrentEnvironmentTool, getCurrentDirectoryTool },
//   memory: shellMemory,
// });

// export const createShellAgent = new Agent({
//   name: "Shell",
//   instructions: shellPrompt,
//   model:myApi("grok-3-beta"),
//   tools: { shellExecuteTool, directoryInfoTool, getCurrentEnvironmentTool, getCurrentDirectoryTool },
//   memory: shellMemory,
// });
