import express, { Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import { mastra } from './mastra/index.js';
import { RuntimeContext } from '@mastra/core/runtime-context';
import { CustomerSupportRuntimeContext } from './mastra/agents/agent.js';
import logger from './logger/index.js';
import { convertDataStreaming, convertWorkflowStreaming, convertWorkflowAgentStreaming } from './utils/streaming.js';
import { DebateRuntimeContext } from './mastra/agents/debate.js';
import { getMastraThreadModel } from './models/mastraThread.js';
import { v4 as uuidv4 } from 'uuid';
import { getMemoryModel } from './models/memory.js';
import { getUsageModel } from './models/usage.js';
import * as fs from 'fs/promises';
const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Serve artifacts at /artifacts with absolute path to avoid cwd issues
app.use('/artifacts', express.static(path.join(process.cwd(), 'artifacts')));
app.use(express.json());

/**
 * Lấy danh sách conversations theo userId (có phân trang)
 * GET /api/conversations?userId=...&page=0&limit=10
 */
app.get('/api/conversations', async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || '';
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    logger.info({
      userId,
    }, "Getting conversations");
    const page = Number.parseInt((req.query.page as string) || '0', 10);
    const limit = Number.parseInt((req.query.limit as string) || '20', 10);
    const skip = Math.max(0, page) * Math.max(1, limit);

    const Thread = getMastraThreadModel();
    const [data, total] = await Promise.all([
      Thread.find({ resourceId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Thread.countDocuments({ resourceId: userId }),
    ]);

    return res.json({
      data,
      total,
      page,
      limit,
    });
  } catch (error) {
    logger.error({ error }, 'Error getting conversations');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Lấy danh sách memories theo userId (có phân trang)
 * GET /api/memories?userId=...&page=0&limit=20
 */
app.get('/api/memories', async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || '';
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    logger.info({
      userId,
    }, 'Getting memories');

    const Memory = getMemoryModel();
    const [data, total] = await Promise.all([
      Memory.find({ userId })
        .sort({ createdAt: -1 })
        .lean(),
      Memory.countDocuments({ userId }),
    ]);

    return res.json({
      data,
    });
  } catch (error) {
    logger.error({ error }, 'Error getting memories');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Lấy danh sách usage theo conversationId
 * GET /api/usage?conversationId=...
 */
app.get('/api/usage', async (req: Request, res: Response) => {
  try {
    const conversationId = (req.query.conversationId as string) || '';
    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId is required' });
    }
    logger.info({
      conversationId,
    }, 'Getting usage');

    const Usage = getUsageModel();
    const data = await Usage.find({ conversationId })
      .sort({ createdAt: -1 })
      .lean();

    // Tính tổng usage
    const totals = data.reduce((acc, item) => {
      acc.inputTokens += item.usage.inputTokens || 0;
      acc.outputTokens += item.usage.outputTokens || 0;
      acc.totalTokens += item.usage.totalTokens || 0;
      acc.reasoningTokens += item.usage.reasoningTokens || 0;
      acc.cachedInputTokens += item.usage.cachedInputTokens || 0;
      acc.credit += item.usage.credit || 0;
      return acc;
    }, {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      reasoningTokens: 0,
      cachedInputTokens: 0,
      credit: 0,
    });

    return res.json({
      data,
      totals,
      count: data.length,
    });
  } catch (error) {
    logger.error({ error }, 'Error getting usage');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Chat endpoint with streaming response
 * POST /api/agent/chat
 * Request body:
 * {
 *   "agentName": string,
 *   "instructions": string,
 *   "model": string,
 *   "apiKey": string,
 *   "tools": string[],
 *   "provider": string,
 *   "message": string,
 *   "userId": string,
 *   "conversationId": string,
 * }
 * Response: Server-Sent Events (SSE) stream
 * Format: data: <chunk>\n\n
 */
app.post('/api/agent/chat', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const messageId = uuidv4();
    
    logger.info({
      userId: body.userId,
      conversationId: body.conversationId,
      messageLength: body.message?.length,
    }, 'Received chat request');
    
    // Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const agent = mastra.getAgent("supportAgent");
    const runtimeContext = new RuntimeContext<CustomerSupportRuntimeContext>();
    runtimeContext.set("agentName", body.agentName);
    runtimeContext.set("instructions", body.instructions);
    runtimeContext.set("model", body.model);
    runtimeContext.set("apiKey", body.apiKey);
    runtimeContext.set("tools", body.tools);
    runtimeContext.set("provider", body.provider);
    runtimeContext.set("tools", ["web_search"]);
    runtimeContext.set("conversationId", body.conversationId);
    runtimeContext.set("userId", body.userId);
    runtimeContext.set("messageId", messageId);
    runtimeContext.set("artifactId", body.conversationId);
  
    const memories = await getMemoryModel().find({ userId: body.userId }).sort({ createdAt: -1 }).limit(20).lean();
    const memoriesData = memories.map((memory) => ({ type: memory.type, value: memory.value }));
    runtimeContext.set("memories", JSON.stringify(memoriesData));
    const response = await agent.stream(body.message, { 
      runtimeContext,
      memory: {
        thread: body.conversationId,  // Dùng cùng conversationId để maintain context
        resource: body.userId          // Dùng cùng userId để track user data
      }
    });
    
    // Send chunks as SSE format with event structure
    // stepId will be extracted from chunk.text.runId automatically
    for await (const chunk of response.fullStream) {
      const sseData = await convertDataStreaming(chunk);
      if (chunk.type === 'finish') {
        if (chunk?.payload?.output?.usage) {
          logger.info({ usage: chunk.payload.output.usage }, 'Usage');
          await getUsageModel().create({
            userId: body.userId,
            conversationId: body.conversationId,
            messageId: messageId,
            type: "chat",
            description: "Chat",
            usage: {
              inputTokens: chunk.payload.output.usage.inputTokens,
              outputTokens: chunk.payload.output.usage.outputTokens,
              totalTokens: chunk.payload.output.usage.totalTokens,
              reasoningTokens: chunk.payload.output.usage.reasoningTokens,
              cachedInputTokens: chunk.payload.output.usage.cachedInputTokens,
              credit: 0,
            },
            agent: {
              model: body.model,
              provider: body.provider,
            },
          });
        }
      }
      if (sseData) {
        res.write(sseData);
      }
    }
    
    // Send done event
    res.write(`event: finished\ndata: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
    
    logger.info({
      userId: body.userId,
      conversationId: body.conversationId,
    }, 'Chat request completed successfully');
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.body.userId,
      conversationId: req.body.conversationId,
    }, 'Error processing chat request');
    
    // Send error event
    res.write(`event: error\ndata: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
    res.end();
  }
});

/**
 * Lấy tất cả files trong artifact
 * GET /api/artifacts/:artifactId/files
 */
app.get('/api/artifacts/:artifactId/files', async (req: Request, res: Response) => {
  try {
    const { artifactId } = req.params;
    if (!artifactId) {
      return res.status(400).json({ error: 'artifactId is required' });
    }

    const artifactsDir = path.join(process.cwd(), 'artifacts');
    const artifactDir = path.join(artifactsDir, artifactId);

    try {
      // Đọc tất cả files trong artifact directory
      const files = await fs.readdir(artifactDir);
      
      // Lọc ra các file (không phải thư mục con)
      const fileEntries = await Promise.all(
        files.map(async (fileName) => {
          const filePath = path.join(artifactDir, fileName);
          const stats = await fs.stat(filePath);
          if (stats.isFile()) {
            const content = await fs.readFile(filePath, 'utf-8');
            return {
              fileName,
              content,
              path: `/${artifactId}/${fileName}`,
            };
          }
          return null;
        })
      );

      const validFiles = fileEntries.filter(f => f !== null);

      // Đọc metadata nếu có
      let metadata = null;
      try {
        const metaPath = path.join(artifactsDir, `${artifactId}.meta.json`);
        const metaContent = await fs.readFile(metaPath, 'utf-8');
        metadata = JSON.parse(metaContent);
      } catch (e) {
        // Metadata không bắt buộc
      }

      return res.json({
        artifactId,
        files: validFiles,
        metadata,
        count: validFiles.length,
      });
    } catch (error) {
      logger.error({ error, artifactId }, 'Error reading artifact files');
      return res.status(404).json({ error: 'Artifact not found' });
    }
  } catch (error) {
    logger.error({ error }, 'Error getting artifact files');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Debate workflow endpoint with streaming response
 * POST /api/workflow/debate
 * Request body:
 * {
 *   "model": string,
 *   "apiKey": string,
 *   "provider": string,
 *   "message": string,
 *   "userId": string,
 *   "conversationId": string,
 * }
 * Response: Server-Sent Events (SSE) stream
 * Events:
 *   - step_status: Step status updates (start, running, success, failed)
 *   - step_content: Step content updates
 *   - workflow_output: Final workflow output
 *   - workflow_stats: Workflow execution stats
 *   - finished: Workflow completed
 *   - error: Error occurred
 */
app.post('/api/workflow/debate', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    
    logger.info({
      topic: body.message,
    }, 'Received debate workflow request');
    
    // Validate required fields
    if (!body.message) {
      return res.status(400).json({ error: 'message is required' });
    }
    
    // Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Get workflow and create run
    const workflow = mastra.getWorkflow("debateWorkflow");
    const run = await workflow.createRunAsync();
    
    // Setup runtime context for debate agents
    const runtimeContext = new RuntimeContext<DebateRuntimeContext>();
    runtimeContext.set("model", body.model || "gpt-4");
    runtimeContext.set("apiKey", body.apiKey || process.env.OPENAI_API_KEY);
    runtimeContext.set("provider", body.provider || "openai");
    runtimeContext.set("userId", body.userId || "");
    runtimeContext.set("conversationId", body.conversationId || uuidv4());
    runtimeContext.set("messageId", uuidv4());
    
    // Setup stream callback để forward agent streaming chunks ra SSE
    runtimeContext.set("streamCallback", async (stepId: string, chunk: any) => {
      try {
        // Convert agent streaming chunk to SSE format
        const sseData = await convertWorkflowAgentStreaming(chunk, stepId);
        if (sseData) {
          res.write(sseData);
        }
      } catch (error) {
        logger.error({ error, stepId, chunk }, 'Error processing agent stream callback');
      }
    });
    
    // Map to track step status and content
    const stepMap = new Map<string, { status: string; content: string; stepId: string }>();
    
    // Use watch to monitor workflow execution and stream events
    run.watch((event) => {
      try {
        const { payload } = event;
        if (payload?.currentStep) {
          const { id: stepId, status, output: stepOutput } = payload.currentStep;
          
          if (stepId) {
            // Initialize step in map if not exists
            if (!stepMap.has(stepId)) {
              stepMap.set(stepId, {
                status: 'pending',
                content: '',
                stepId,
              });
            }

            const stepData = stepMap.get(stepId)!;

            // Update step status
            if (status && status !== stepData.status) {
              stepData.status = status;

              // Send step status event
              const statusEvent = {
                event: 'step_status',
                data: {
                  stepId,
                  status,
                  stepName: stepId,
                  timestamp: new Date().toISOString(),
                },
              };
              res.write(`event: ${statusEvent.event}\ndata: ${JSON.stringify(statusEvent.data)}\n\n`);
            }

            // Handle step output when status is success
            if (status === 'success' && stepOutput) {
              // Extract text content from step output
              let textContent = '';
              
              if (typeof stepOutput === 'string') {
                textContent = stepOutput;
              } else if (stepOutput.proposerArgument) {
                textContent = stepOutput.proposerArgument;
              } else if (stepOutput.opposerRebuttal) {
                textContent = stepOutput.opposerRebuttal;
              } else if (stepOutput.proposerCounter) {
                textContent = stepOutput.proposerCounter;
              } else if (stepOutput.moderatorSummary) {
                textContent = stepOutput.moderatorSummary;
              } else if (stepOutput.text) {
                textContent = stepOutput.text;
              } else {
                textContent = JSON.stringify(stepOutput, null, 2);
              }

              if (textContent && textContent !== stepData.content) {
                // Send step content update
                const contentEvent = {
                  event: 'step_content',
                  data: {
                    stepId,
                    content: textContent,
                    stepName: stepId,
                    status: 'complete',
                    timestamp: new Date().toISOString(),
                  },
                };
                res.write(`event: ${contentEvent.event}\ndata: ${JSON.stringify(contentEvent.data)}\n\n`);

                stepData.content = textContent;
              }
            }

            // Handle step error
            if (status === 'failed') {
              const errorEvent = {
                event: 'step_error',
                data: {
                  stepId,
                  status: 'failed',
                  stepName: stepId,
                  error: stepOutput?.error || 'Step execution failed',
                  timestamp: new Date().toISOString(),
                },
              };
              res.write(`event: ${errorEvent.event}\ndata: ${JSON.stringify(errorEvent.data)}\n\n`);
            }
          }
        }
      } catch (error) {
        logger.error({ error, event }, 'Error processing watch event');
      }
    }, 'watch');
    
    // Start workflow execution
    const finalResult = await run.start({
      inputData: {
        message: body.message,
      },
      runtimeContext,
    });
    
    // Send final workflow output
    if (finalResult.status === 'success' && finalResult.result) {
      const finalEvent = {
        event: 'workflow_output',
        data: {
          output: finalResult.result,
          status: 'success',
          timestamp: new Date().toISOString(),
        },
      };
      res.write(`event: ${finalEvent.event}\ndata: ${JSON.stringify(finalEvent.data)}\n\n`);
    } else if (finalResult.status === 'failed') {
      const errorEvent = {
        event: 'error',
        data: {
          error: finalResult.error || 'Workflow execution failed',
          status: 'failed',
          timestamp: new Date().toISOString(),
        },
      };
      res.write(`event: ${errorEvent.event}\ndata: ${JSON.stringify(errorEvent.data)}\n\n`);
    }
    
    // Send done event
    res.write(`event: finished\ndata: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
    
    logger.info({
      message: body.message,
      status: finalResult.status,
    }, 'Debate workflow completed');
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body,
    }, 'Error processing debate workflow request');
    
    // Send error event
    res.write(`event: error\ndata: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
    res.end();
  }
});

/**
 * Health check endpoint
 * GET /api/health
 */
app.get('/api/health', (req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default app;

