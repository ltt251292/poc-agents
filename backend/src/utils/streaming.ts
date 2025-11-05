import logger from "@/logger";
import * as fs from "fs/promises";
import * as path from "path";
import { getUsageModel } from "@/models/usage";

/**
 * Convert chunk data to SSE format with event structure
 * 
 * Chunk format from Streaks agent:
 * {
 *   "text": {
 *     "type": "text-delta",
 *     "runId": "b7137db5-deb5-4aa6-9568-fa12cd584056",
 *     "from": "AGENT",
 *     "payload": {
 *       "id": "msg_xxx",
 *       "text": " Đ"
 *     }
 *   }
 * }
 * 
 * @param chunk - The chunk data from agent stream (text located at chunk.text.payload.text, runId at chunk.text.runId)
 * @returns SSE formatted string with event and data
 */
export const convertDataStreaming = async (chunk: any): Promise<string> => {
  // Handle different chunk types from agent streams (Streaks format: chunk.text.payload.text)
  let contents = [];
  let eventType = ''
  let artifactResult = null;
  let stepId = `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  if (chunk && typeof chunk === 'object') {    
    if (chunk.type === 'tool-result') {
      switch (chunk.payload.toolName) {
        case 'search_serper':
            const eventData = {
                event: 'attachments',
                data: {
                  event: chunk?.type,
                  data: chunk?.payload || {}, 
                }
              };        
              return `event: ${eventData.event}\ndata: ${JSON.stringify(eventData.data)}\n\n`;
        case 'create_artifact':
          // Extract artifact data from tool result
          artifactResult = chunk.payload.result || chunk.payload;
          if (artifactResult && artifactResult.id) {
            try {
              // Read artifact content from file if not already in result
              let content = artifactResult.content;
              if (!content && artifactResult.filePath) {
                const artifactsDir = path.join(process.cwd(), "artifacts");
                const filePath = path.join(artifactsDir, artifactResult.filePath);
                content = await fs.readFile(filePath, "utf-8");
              }
              
              // Read metadata if not already in result
              let metadata = artifactResult.metadata;
              if (!metadata) {
                const artifactsDir = path.join(process.cwd(), "artifacts");
                const metaPath = path.join(artifactsDir, `${artifactResult.id}.meta.json`);
                try {
                  const metaContent = await fs.readFile(metaPath, "utf-8");
                  metadata = JSON.parse(metaContent);
                } catch (e) {
                  // Metadata file might not exist yet
                  logger.warn({ artifactId: artifactResult.id }, 'Metadata file not found');
                }
              }
              
              const artifactData = {
                id: artifactResult.id,
                title: artifactResult.title || metadata?.title || `Artifact ${artifactResult.id}`,
                type: artifactResult.type || metadata?.type || 'code',
                language: artifactResult.language || metadata?.language,
                content: content || '',
                filePath: artifactResult.filePath || metadata?.filePath,
                metadata: metadata || artifactResult
              };
              
              const artifactEventData = {
                event: 'artifact',
                data: artifactData
              };
              logger.info({ artifactId: artifactData.id, hasContent: !!artifactData.content }, 'Artifact event data');
              return `event: ${artifactEventData.event}\ndata: ${JSON.stringify(artifactEventData.data)}\n\n`;
            } catch (error) {
              logger.error({ error, artifactResult }, 'Error reading artifact content');
            }
          }
        case 'update_artifact':
        case 'view_artifact':
          // Extract artifact data from tool result
          artifactResult = chunk.payload.result || chunk.payload;
          if (artifactResult && (artifactResult.id || artifactResult.content)) {
            // If result has content, it's a view-artifact response
            const artifactData = {
              id: artifactResult.id,
              title: artifactResult.title || artifactResult.metadata?.title,
              type: artifactResult.type || artifactResult.metadata?.type,
              language: artifactResult.language || artifactResult.metadata?.language,
              content: artifactResult.content,
              metadata: artifactResult.metadata || artifactResult
            };
            
            const artifactEventData = {
              event: 'artifact',
              data: artifactData
            };
            return `event: ${artifactEventData.event}\ndata: ${JSON.stringify(artifactEventData.data)}\n\n`;
          }
          break;
        default:
          logger.error({ chunk }, 'Unknown tool name');
          break;
      }
    }
    // logger.info({ chunk }, 'Chunk is an object');
    // Handle Streaks format: chunk.text.payload.text
    if (chunk.type === 'text-delta' && typeof chunk.payload === 'object') {
        eventType = 'on_message_delta';
        
        // Extract runId as stepId if available
        if (chunk.runId) {
          stepId = chunk.runId;
        }
        
        // Only add content if text is not empty
        if (chunk.payload.text !== null && chunk.payload.text !== '') {
          contents.push({
            type: chunk.type,
            text: chunk.payload.text,
            index: 0
          });
        }
    }
  }

  if (contents.length === 0) {
    return ''
  }
  
  
  const eventData = {
    event: 'message',
    data: {
      event: 'on_message_delta',
      data: {
        id: stepId,
        delta: {
          content: contents
        }
      } 
    }
  };
  
  return `event: ${eventData.event}\ndata: ${JSON.stringify(eventData.data)}\n\n`;
}

/**
 * Convert workflow streaming chunk to SSE format
 * 
 * Workflow chunk format:
 * {
 *   "payload": {
 *     "currentStep": {
 *       "stepId": "proposer-initial",
 *       "status": "running" | "success" | "failed",
 *       "output": {...},
 *       "payload": {...}
 *     },
 *     "output": {...},
 *     "stats": {...}
 *   }
 * }
 * 
 * @param chunk - The chunk data from workflow stream
 * @param stepMap - Map để track step status và accumulate content
 * @returns SSE formatted string with event and data
 */
export const convertWorkflowStreaming = async (
  chunk: any,
  stepMap: Map<string, { status: string; content: string; stepId: string }>
): Promise<string[]> => {
  const sseEvents: string[] = [];

  if (!chunk || typeof chunk !== 'object') {
    return sseEvents;
  }

  try {
    const { payload } = chunk;
    if (!payload) {
      return sseEvents;
    }

    const { currentStep, output, stats } = payload;

    // Handle step status updates
    if (currentStep) {
      const { stepId, status, output: stepOutput, payload: stepPayload } = currentStep;

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
          sseEvents.push(`event: ${statusEvent.event}\ndata: ${JSON.stringify(statusEvent.data)}\n\n`);
        }

        // Handle step output when status is success
        if (status === 'success' && stepOutput) {
          // Extract text content from step output
          let textContent = '';
          
          // Try to extract text from different possible output structures
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
            // If no text found, stringify the output
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
            sseEvents.push(`event: ${contentEvent.event}\ndata: ${JSON.stringify(contentEvent.data)}\n\n`);

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
          sseEvents.push(`event: ${errorEvent.event}\ndata: ${JSON.stringify(errorEvent.data)}\n\n`);
        }
      }
    }

    // Handle workflow-level output
    if (output && !currentStep) {
      const workflowEvent = {
        event: 'workflow_output',
        data: {
          output,
          timestamp: new Date().toISOString(),
        },
      };
      sseEvents.push(`event: ${workflowEvent.event}\ndata: ${JSON.stringify(workflowEvent.data)}\n\n`);
    }

    // Handle workflow stats
    if (stats) {
      const statsEvent = {
        event: 'workflow_stats',
        data: {
          stats,
          timestamp: new Date().toISOString(),
        },
      };
      sseEvents.push(`event: ${statsEvent.event}\ndata: ${JSON.stringify(statsEvent.data)}\n\n`);
    }
  } catch (error) {
    logger.error({ error, chunk }, 'Error converting workflow streaming chunk');
  }

  return sseEvents;
}

/**
 * Convert agent streaming chunk trong workflow step to SSE format
 * 
 * @param chunk - The chunk data from agent stream trong workflow step
 * @param stepId - The current step ID
 * @returns SSE formatted string with event and data
 */
export const convertWorkflowAgentStreaming = async (
  chunk: any,
  stepId: string
): Promise<string> => {
  let contents = [];
  let eventType = 'on_message_delta';

  if (chunk && typeof chunk === 'object') {
    // Handle text-delta chunks from agent streams
    if (chunk.type === 'text-delta' && typeof chunk.payload === 'object') {
      if (chunk.payload.text !== null && chunk.payload.text !== '') {
        contents.push({
          type: chunk.type,
          text: chunk.payload.text,
          index: 0,
        });
      }
    }
  }

  if (contents.length === 0) {
    return '';
  }

  const eventData = {
    event: 'message',
    data: {
      event: eventType,
      data: {
        id: stepId,
        delta: {
          content: contents,
        },
      },
    },
  };

  return `event: ${eventData.event}\ndata: ${JSON.stringify(eventData.data)}\n\n`;
}