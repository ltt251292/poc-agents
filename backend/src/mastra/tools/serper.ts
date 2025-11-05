import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import logger from "../../logger/index.js";
import { serperConfig } from "../../config/serper.js";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { CustomerSupportRuntimeContext } from "../agents/agent.js";
import { getUsageModel } from "../../models/usage.js";

interface SerperOrganicResult {
    title: string;
    link: string;
    snippet: string;
    position: number;
}
  
interface SerperAnswerBox {
    snippet?: string;
    title?: string;
    link?: string;
}

interface SerperKnowledgeGraph {
    title?: string;
    type?: string;
    description?: string;
    attributes?: Record<string, string>;
}

interface SerperSearchResponse {
    organic: SerperOrganicResult[];
    answerBox?: SerperAnswerBox;
    knowledgeGraph?: SerperKnowledgeGraph;
    credits?: number;
}

export const serpSearch = async (query: string, num: number, runtimeContext: RuntimeContext<CustomerSupportRuntimeContext>): Promise<SerperSearchResponse> => {
    logger.info({ query, num }, "Using tool to search the internet");
    logger.info(`${serperConfig.baseUrl}`);
    logger.info(`${serperConfig.apiKey}`);
    const response = await fetch(`${serperConfig.baseUrl}/search`, {
        method: 'POST',
        headers: {
            'X-API-KEY': serperConfig.apiKey,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            q: query,
            num: Math.max(num, serperConfig.maxNumResults),
        }),
    });
    if (!response.ok) {
        logger.error(`Serper API error: ${response.statusText}`);
        logger.error(`${response.status}`);
        logger.error(`${response.statusText}`);
        logger.error(`${response.headers}`);
        logger.error(`${response.body}`);
        throw new Error(`Serper API error: ${response.statusText}`);
    }
    const data = await response.json() as SerperSearchResponse;
    logger.info({ data }, "Serper API response");
    logger.info({credits: data.credits }, "Serper API credits");

    // save usage to database
    await getUsageModel().create({
        userId: runtimeContext.get("userId") as string,
        targetId: runtimeContext.get("conversationId") as string,
        type: "serper_search",
        description: "Serper API search",
        usage: {
            credit: data.credits,
        },
        conversationId: runtimeContext.get("conversationId") as string,
        messageId: runtimeContext.get("messageId") as string,
        agent: {
            model: "serper",
            provider: "serper",
        },
    });
    logger.info({usage: data.credits }, "Usage saved to database");
    return data
}


export const serp = createTool({
    id: "serper_search",
    description: `Search the internet for the most relevant information`,
    inputSchema: z.object({
        query: z.string().describe('Từ khóa tìm kiếm'),
        num: z.number().optional().describe('Số kết quả trả về (mặc định: 10)')
    }),
    outputSchema: z.object({
      organic: z.array(z.object({
        title: z.string().describe('Tiêu đề của kết quả tìm kiếm'),
        link: z.string().describe('URL của kết quả tìm kiếm'),
        snippet: z.string().describe('Snippet của kết quả tìm kiếm'),
        position: z.number().describe('Vị trí của kết quả tìm kiếm'),
      })),
      answerBox: z.object({
        title: z.string().optional().describe('Tiêu đề của answer box'),
        link: z.string().optional().describe('URL của answer box'),
        snippet: z.string().optional().describe('Snippet của answer box'),
      }).optional(),
      knowledgeGraph: z.object({
        title: z.string().optional().describe('Tiêu đề của knowledge graph'),
        type: z.string().optional().describe('Loại của knowledge graph'),
        description: z.string().optional().describe('Mô tả của knowledge graph'),
        attributes: z.record(z.string(), z.string()).optional().describe('Thuộc tính của knowledge graph'),
      }).optional(),
    }),
    execute: async ({ context: { query, num = serperConfig.defaultNumResults }, runtimeContext }) => {
        logger.info({ query, num }, "Using tool to search the internet");
        
        if (!serperConfig.apiKey) {
            throw new Error('Serper API key is not configured');
        }
        
        return await serpSearch(query, num, runtimeContext);
    },
});