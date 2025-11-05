import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { extractMemoryAgent } from "../agents/extract_memory.js";
import logger from "../../logger/index.js";
import { getMemoryModel } from "../../models/memory.js";
import { getUsageModel } from "../../models/usage.js";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { CustomerSupportRuntimeContext } from "../agents/agent.js";

async function extractMemory(userContext: string, runtimeContext: RuntimeContext<CustomerSupportRuntimeContext>): Promise<{ memory: { type: string; value: string; confidence: number }[] }> {
    try {
        const userId = runtimeContext.get("userId") as string;
        const targetId = runtimeContext.get("conversationId") as string;
        const messageId = runtimeContext.get("messageId") as string;
        logger.info({userId, targetId, messageId}, "User context");
        logger.info("Starting to extract memory");
        const response = await extractMemoryAgent.generate(userContext);
        logger.info({usage: response.usage}, "Extracted memory response");
        const modelMetadata = response.response.modelMetadata as { modelId: string; modelProvider: string };
        logger.info({modelMetadata}, "Model metadata");
        logger.info("Extracted memory: " + response.usage);
        const m = JSON.parse(response.text) as { type: string; value: string; confidence: number }[];
        logger.info({m}, "Extracted memory");
        // upsert memory to database
        for (const memory of m) {
            await getMemoryModel().findOneAndUpdate({
                userId,
                type: memory.type,
            }, {
                $set: {
                    value: memory.value,
                    targetId,
                    confidence: memory.confidence,
                    updatedAt: new Date(),
                },
                $setOnInsert: {
                    createdAt: new Date(),
                },
            }, { upsert: true, new: false });
        }

        // save usage to database
        await getUsageModel().create({
            userId,
            targetId,
            type: "extract_memory",
            description: "Extracted memory",
            usage: response.usage,
            conversationId: targetId,
            messageId,
            agent: {
                model: modelMetadata.modelId,
                provider: modelMetadata.modelProvider,
            },
        });
        return { memory: m };
    } catch (error) {
        logger.error({error}, "Error extracting memory");
        throw error;
    }
}

export const extractMemoryTool = createTool({
    id: "extract_memory",
    description: `Extract the memory from the conversation`,
    inputSchema: z.object({
        userContext: z.string().describe('User context'),
        searchResults: z.string().describe('Search results').optional(),
    }),

    outputSchema: z.object({
        memory: z.array(z.object({
            type: z.string().describe('Type of memory'),
            value: z.string().describe('Value of memory'),
            confidence: z.number().describe('Confidence of memory'),
        })),
    }),
    
    execute: async ({ context: { userContext }, runtimeContext }) => {
        logger.info({ userContext }, "Using tool to extract memory");
        return await extractMemory(userContext, runtimeContext);
    },
});