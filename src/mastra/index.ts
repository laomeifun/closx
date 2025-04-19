
import { Mastra } from '@mastra/core/mastra';
import { createLogger } from '@mastra/core/logger';
import { weatherWorkflow } from './workflows';
import { shell } from './agents';

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { shell },
  logger: createLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
