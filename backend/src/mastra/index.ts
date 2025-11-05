import { Mastra } from '@mastra/core';
import { PinoLogger } from '@mastra/loggers';
import { supportAgent } from './agents/agent.js';
import { LangfuseExporter } from '@mastra/langfuse';
import { generateArtifactAgent } from './agents/artifacts.js';
import { proposerAgent, opposerAgent, moderatorAgent } from './agents/debate.js';
import { debateWorkflow } from './workflow/index.js';

export const mastra = new Mastra({
  agents: { 
    supportAgent, 
    generateArtifactAgent,
    proposerAgent,
    opposerAgent,
    moderatorAgent,
  },
  workflows: {
    debateWorkflow,
  },
  logger: new PinoLogger({
  name: 'Mastra',
    level: 'info',
  }),
  telemetry: {
    // Telemetry is deprecated and will be removed in the Nov 4th release
    enabled: false, 
  },
  observability: {
    configs: {
      langfuse: {
        serviceName: 'poc-agents',
        exporters: [
          new LangfuseExporter({
            publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
            secretKey: process.env.LANGFUSE_SECRET_KEY!,
            baseUrl: process.env.LANGFUSE_BASE_URL,
            options: {
              environment: process.env.NODE_ENV,
            },
          }) as any,
        ],
      },
    },
  },
});
