import { databaseConfig } from "../../config/index.js";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { MongoDBStore } from "@mastra/mongodb";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { serp } from "../tools/serper.js";
import { extractMemoryTool } from "../tools/extract_memory.js";
import { createArtifactTool, updateArtifactTool, listArtifactsTool, viewArtifactTool } from "../tools/artifact.js";

/**
 * CustomerSupportRuntimeContext type definition
 * Contains all the context variables needed for the customer support agent
 */
export type CustomerSupportRuntimeContext = {
  "agentName": string;
  "instructions": string;
  "model": string;
  "apiKey": string;
  "tools": string[];
  "provider": string;
  "conversationId": string;
  "userId": string;
  "messageId": string,
  "memories": string;
  "artifactId": string;
};

// class CustomMemory extends Memory {
//   async generateThreadTitle(threadId: string) {
//     const result = await super.generateThreadTitle(threadId);
    
//     // Lấy usage từ result
//     console.log('Usage:', result.usage);
    
//     // Lưu hoặc xử lý usage
//     await this.saveUsage(threadId, result.usage);
    
//     return result;
//   }
  
//   private async saveUsage(threadId: string, usage: any) {
//     // Lưu usage vào collection riêng
//     await this.storage.save({
//       collection: 'title_usage',
//       data: {
//         threadId,
//         usage,
//         timestamp: new Date()
//       }
//     });
//   }
// }

/**
 * Customer support agent configuration
 * This agent handles customer inquiries, support tickets, and issue resolution
 */
export const supportAgent = new Agent({
  name: "customer-support-agent",
  description: "AI support agent that adapts to user subscription tiers",
 
  /**
   * Returns the instructions for the agent based on runtime context
   * Falls back to default instructions if none provided
   */
  instructions: async ({ runtimeContext }: { runtimeContext: RuntimeContext<CustomerSupportRuntimeContext> }) => {
    return runtimeContext.get("instructions") || `
# Role
You are a Supervisor Agent responsible for analyzing user requests and determining which tool/agent is most suitable to handle each task.

# Language Understanding and Response
- Automatically detect the user's input language.
- Respond in the same language the user used.
- When summarizing or explaining tool results, maintain the same language.
- If the user's language cannot be confidently detected, default to English.

## Language Normalization for Tool Calls
- Using language detection tool to detect the user's language for query.
- Do not tell the user that translation occurred.
- Keep the meaning of the query unchanged.

# Decision-Making Process

## Step 1: Analyze Intent
- Carefully read the user's prompt and identify:
  - Primary objective of the request
  - Task complexity
  - Required steps for execution
  - Dependencies between steps (e.g., data retrieval before artifact creation)

## Step 2: Plan Execution Strategy
Determine if the task requires:
- **Single-step execution**: One tool can complete the task
- **Multi-step execution**: Multiple tools needed in sequence

### Multi-Step Execution Rules:
- If the request requires creating artifacts with external data:
  1. First, call search_serper to gather necessary information
  2. Wait for search results to complete
  3. Then, call create_artifact with the retrieved data
- Always complete data gathering steps before artifact creation
- Never call create_artifact with placeholder or incomplete data

## Step 3: Select Tool/Agent
- Match request to tool/agent capabilities
- Consider tool/agent strengths and limitations
- Choose most appropriate tool/agent(s) in correct order
- List of tools:
  - search_serper: Search the internet for information
  - extract_memory: Extract memory from the user's message
  - create_artifact: Create an artifact (use only after data is ready)
    Note: only 1 create_artifact tool running at the same time
  - update_artifact: Update an existing artifact

## Step 4: Execute Task
### For Single-Step Tasks:
- Call selected tool/agent with appropriate parameters
- Return the result to the user

### If you decide to call the search_serper. Follow the steps below:
1. Execute first tool (e.g., search_serper)
2. **WAIT** for the result to complete
3. Process and extract relevant data from the result. If not enough data, call search_serper again. Maximum 5 times. After summarizing the result (type array of objects)
4. Execute subsequent tool (e.g., create_artifact) using the processed data
5. Ensure each step completes before proceeding to the next

### Example Multi-Step Flow:
User Request: "Create a dashboard showing current cryptocurrency prices"
↓
Step 1: Call search_serper("current cryptocurrency prices")
↓
[WAIT FOR RESULTS]
↓
Step 2: Extract price data from search results
↓
Step 3: Call create_artifact with processed data

## Step 5: Summarize the Result
- Summarize the outcome of the task
- Do not return raw tool outputs
- Provide a clear, concise summary in the user's language
- If multi-step execution was used, summarize the complete workflow

# Important Notes
- **NEVER** call create_artifact before data retrieval is complete
- **ALWAYS** verify data availability before creating artifacts
- If search_serper fails, inform the user instead of creating incomplete artifacts
- Maintain context between sequential tool calls

# Information user:
${runtimeContext.get("memories")}
Bạn có thể sử dụng thông tin người dùng để giúp bạn hiểu yêu cầu của người dùng và cung cấp câu trả lời chính xác hơn.
    `;
  },
 
  /**
   * Returns the model configuration based on the provider specified in runtime context
   * Currently supports OpenAI provider
   */
  model: ({ runtimeContext }: { runtimeContext: RuntimeContext<CustomerSupportRuntimeContext> }) => {
    switch (runtimeContext.get("provider")) {
      case "openai":
        return {
            id:  `${runtimeContext.get("provider")}/${runtimeContext.get("model")}` as `${string}/${string}`,
            apiKey: runtimeContext.get("apiKey") || process.env.OPENAI_API_KEY,
        }
      default:
        throw new Error(`Provider ${runtimeContext.get("provider")} not supported`);
    }
  },
  
  /**
   * Returns the list of tools available to the agent from runtime context
   */
  tools: ({ runtimeContext }: { runtimeContext: RuntimeContext<CustomerSupportRuntimeContext> }) => {
    return {
      "search_serper": serp,
      "extract_memory": extractMemoryTool,
      "create_artifact": createArtifactTool,
      "update_artifact": updateArtifactTool,
    };
  },
  /**
   * Memory configuration cho agent
   * - storage: Lưu trữ tin nhắn và thread data trong MongoDB
   * - lastMessages: 20 - Agent sẽ tự động lấy 20 tin nhắn gần nhất từ cùng thread
   *   để làm context cho tin nhắn tiếp theo
   * - generateTitle: true - Tự động tạo tiêu đề cho conversation dựa trên tin nhắn đầu tiên
   */
  memory: new Memory({
    storage: new MongoDBStore({
      url: databaseConfig.url,
      dbName: databaseConfig.dbName,
    }),
    options: {
      lastMessages: 20, // Lấy 20 tin nhắn gần nhất làm context cho tin nhắn tiếp theo
      threads: {
        // generateTitle: true // Tự động tạo tiêu đề cho conversation
        generateTitle: true
      }
    }
  }),
});