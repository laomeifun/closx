import { Agent } from "@mastra/core/agent";
import { shellExecuteTool } from "../tools";
import { directoryInfoTool } from "../tools";
import { shellPrompt } from "./prompt";
import { getCurrentEnvironmentTool } from "../tools/get-current-environment";
import { getCurrentDirectoryTool } from "../tools/get-current-directory";
import { interactiveShellExecuteTool } from "../tools";
import { shellMemory } from "./shellmemory";
import config, { getBestAvailableModel, getModel, loadFromAllConfigLocations } from "../../config";

// Create Agent
// Use functional approach to ensure configuration files are loaded before creating Agent
export const createShellAgent = async () => {
  // First manually load all configuration files
  await loadFromAllConfigLocations();
  
  // Get all models
  const allModels = config.modelRegistry.getAllModels();
  // Loaded model configurations
  
  // Get the best available model instance
  // Will automatically select the model from configuration file, no need to specify model ID
  const modelInstance = getBestAvailableModel();
  
  // Create Agent
  return new Agent({
    name: "Shell",
    instructions: shellPrompt,
    model: modelInstance, // Here we pass a configured model instance
    tools: { shellExecuteTool, directoryInfoTool, getCurrentEnvironmentTool, interactiveShellExecuteTool },
    memory: shellMemory,
  });
};

// Initialize shell agent
export let shell: Agent;

// Immediately initialize shell agent
createShellAgent().then(agent => {
  shell = agent;
  // Shell agent initialization complete
}).catch(error => {
  // Shell agent initialization failed
  // Create a default Agent as fallback
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
