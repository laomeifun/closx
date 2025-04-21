import { Agent } from "@mastra/core/agent";
import { shellExecuteTool } from "../tools";
import { directoryInfoTool } from "../tools";
import { shellPrompt } from "./prompt";
import { getCurrentEnvironmentTool } from "../tools/get-current-environment";
import { getCurrentDirectoryTool } from "../tools/get-current-directory";

import { shellMemory } from "./shellmemory";
import config, { getBestAvailableModel, getModel, loadFromAllConfigLocations } from "../../config";

// Create Agent
// Use functional approach to ensure configuration files are loaded before creating Agent
export const createShellAgent = async () => {
  // First manually load all configuration files
  await loadFromAllConfigLocations();
  
  // Get all models
  const allModels = config.modelRegistry.getAllModels();
  
  // Get the best available model instance
  // Will automatically select the model from configuration file, no need to specify model ID
  const modelInstance = getBestAvailableModel();
  
  // Create Agent
  return new Agent({
    name: "Shell",
    instructions: shellPrompt,
    model: modelInstance, // Here we pass a configured model instance
    tools: { shellExecuteTool, directoryInfoTool, getCurrentEnvironmentTool },
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
  console.error('Failed to initialize shell agent:', error);
  shell = new Agent({
    name: "Shell",
    instructions: shellPrompt,
    model: config.openaiApi("gpt-4o"),
    tools: { shellExecuteTool, directoryInfoTool, getCurrentEnvironmentTool },
    memory: shellMemory,
  });
});
