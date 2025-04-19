import { Agent } from '@mastra/core/agent';
import { shellExecuteTool } from '../tools';
import { directoryInfoTool } from '../tools';
import { myApi,MODEL } from './config';
import { shellPrompt } from './prompt';
import { getCurrentEnvironmentTool } from '../tools/get-current-environment';





export const shell = new Agent({
  name: 'Shell',
  instructions: shellPrompt,
  model: myApi(MODEL),
  tools: { shellExecuteTool, directoryInfoTool, getCurrentEnvironmentTool },
});

