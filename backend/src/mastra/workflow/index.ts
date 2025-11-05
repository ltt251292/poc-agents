import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { DebateRuntimeContext } from "../agents/debate.js";
import { convertWorkflowAgentStreaming } from "../../utils/streaming.js";

/**
 * Step 1: Proposer đưa ra lập luận ban đầu
 * Người đề xuất sẽ đưa ra lập luận ủng hộ quan điểm
 */
const proposerInitialStep = createStep({
  id: "proposer-initial",
  description: "Proposer presents initial argument supporting the position",
  inputSchema: z.object({
    topic: z.string().describe("The debate topic"),
    position: z.string().describe("The position to be defended"),
  }),
  outputSchema: z.object({
    topic: z.string(),
    position: z.string(),
    proposerArgument: z.string(),
    stepId: z.string(),
  }),
  execute: async ({ inputData, mastra, runtimeContext }) => {
    const { topic, position } = inputData;
    const stepId = "proposer-initial";

    const proposerAgent = mastra.getAgent("proposerAgent");
    const debateContext = runtimeContext as RuntimeContext<DebateRuntimeContext>;
    const streamCallback = debateContext.get("streamCallback");

    const prompt = `Topic: ${topic}\nPosition to defend: ${position}\n\nPlease present a strong, well-structured initial argument supporting this position. Include:\n1. Clear statement of your position\n2. Main supporting points with evidence\n3. Logical reasoning\n4. Examples or analogies if helpful\n\nRespond in the same language as the topic.`;

    // Stream từ agent thay vì generate
    const streamResponse = await proposerAgent.stream(prompt, {
      runtimeContext: debateContext,
    });

    let fullText = "";
    
    // Process streaming chunks và forward ra ngoài nếu có callback
    for await (const chunk of streamResponse.fullStream) {
      if (streamCallback) {
        streamCallback(stepId, chunk);
      }
      
      // Accumulate text từ chunks
      if (chunk.type === 'text-delta' && chunk.payload?.text) {
        fullText += chunk.payload.text;
      }
    }

    return {
      topic,
      position,
      proposerArgument: fullText,
      stepId,
    };
  },
});

/**
 * Step 2: Opposer phản bác
 * Người phản biện sẽ phản bác lập luận ban đầu của Proposer
 */
const opposerRebuttalStep = createStep({
  id: "opposer-rebuttal",
  description: "Opposer presents counter-argument challenging the proposer's position",
  inputSchema: z.object({
    topic: z.string(),
    position: z.string(),
    proposerArgument: z.string(),
    stepId: z.string(),
  }),
  outputSchema: z.object({
    topic: z.string(),
    position: z.string(),
    proposerArgument: z.string(),
    opposerRebuttal: z.string(),
    stepId: z.string(),
  }),
  execute: async ({ inputData, mastra, runtimeContext }) => {
    const { topic, position, proposerArgument } = inputData;
    const stepId = "opposer-rebuttal";

    const opposerAgent = mastra.getAgent("opposerAgent");
    const debateContext = runtimeContext as RuntimeContext<DebateRuntimeContext>;
    const streamCallback = debateContext.get("streamCallback");

    const prompt = `Topic: ${topic}\nPosition being defended: ${position}\n\nProposer's argument:\n${proposerArgument}\n\nPlease provide a strong counter-argument that:\n1. Identifies weaknesses or flaws in the proposer's argument\n2. Challenges assumptions and claims\n3. Presents alternative perspectives\n4. Uses evidence and logical reasoning\n5. Maintains a respectful tone\n\nRespond in the same language as the topic.`;

    // Stream từ agent thay vì generate
    const streamResponse = await opposerAgent.stream(prompt, {
      runtimeContext: debateContext,
    });

    let fullText = "";
    
    // Process streaming chunks và forward ra ngoài nếu có callback
    for await (const chunk of streamResponse.fullStream) {
      if (streamCallback) {
        streamCallback(stepId, chunk);
      }
      
      // Accumulate text từ chunks
      if (chunk.type === 'text-delta' && chunk.payload?.text) {
        fullText += chunk.payload.text;
      }
    }

    return {
      topic,
      position,
      proposerArgument,
      opposerRebuttal: fullText,
      stepId,
    };
  },
});

/**
 * Step 3: Proposer phản bác lại
 * Người đề xuất sẽ phản bác lại lập luận của Opposer
 */
const proposerCounterStep = createStep({
  id: "proposer-counter",
  description: "Proposer responds to opposer's rebuttal with counter-arguments",
  inputSchema: z.object({
    topic: z.string(),
    position: z.string(),
    proposerArgument: z.string(),
    opposerRebuttal: z.string(),
    stepId: z.string(),
  }),
  outputSchema: z.object({
    topic: z.string(),
    position: z.string(),
    proposerArgument: z.string(),
    opposerRebuttal: z.string(),
    proposerCounter: z.string(),
    stepId: z.string(),
  }),
  execute: async ({ inputData, mastra, runtimeContext }) => {
    const { topic, position, proposerArgument, opposerRebuttal } = inputData;
    const stepId = "proposer-counter";

    const proposerAgent = mastra.getAgent("proposerAgent");
    const debateContext = runtimeContext as RuntimeContext<DebateRuntimeContext>;
    const streamCallback = debateContext.get("streamCallback");

    const prompt = `Topic: ${topic}\nPosition to defend: ${position}\n\nYour initial argument:\n${proposerArgument}\n\nOpposer's rebuttal:\n${opposerRebuttal}\n\nPlease provide a strong counter-response that:\n1. Addresses the opposer's specific points\n2. Reinforces your position with additional evidence\n3. Refutes the opposer's challenges\n4. Maintains logical consistency\n5. Keeps a respectful tone\n\nRespond in the same language as the topic.`;

    // Stream từ agent thay vì generate
    const streamResponse = await proposerAgent.stream(prompt, {
      runtimeContext: debateContext,
    });

    let fullText = "";
    
    // Process streaming chunks và forward ra ngoài nếu có callback
    for await (const chunk of streamResponse.fullStream) {
      if (streamCallback) {
        streamCallback(stepId, chunk);
      }
      
      // Accumulate text từ chunks
      if (chunk.type === 'text-delta' && chunk.payload?.text) {
        fullText += chunk.payload.text;
      }
    }

    return {
      topic,
      position,
      proposerArgument,
      opposerRebuttal,
      proposerCounter: fullText,
      stepId,
    };
  },
});

/**
 * Step 4: Moderator tổng kết và đưa ra kết luận
 * Người điều phối sẽ tổng kết toàn bộ cuộc tranh luận
 */
const moderatorSummaryStep = createStep({
  id: "moderator-summary",
  description: "Moderator summarizes the debate and provides a conclusion",
  inputSchema: z.object({
    topic: z.string(),
    position: z.string(),
    proposerArgument: z.string(),
    opposerRebuttal: z.string(),
    proposerCounter: z.string(),
    stepId: z.string(),
  }),
  outputSchema: z.object({
    topic: z.string(),
    position: z.string(),
    proposerArgument: z.string(),
    opposerRebuttal: z.string(),
    proposerCounter: z.string(),
    moderatorSummary: z.string(),
    stepId: z.string(),
  }),
  execute: async ({ inputData, mastra, runtimeContext }) => {
    const { topic, position, proposerArgument, opposerRebuttal, proposerCounter } = inputData;
    const stepId = "moderator-summary";

    const moderatorAgent = mastra.getAgent("moderatorAgent");
    const debateContext = runtimeContext as RuntimeContext<DebateRuntimeContext>;
    const streamCallback = debateContext.get("streamCallback");

    const prompt = `Topic: ${topic}\nPosition defended: ${position}\n\nProposer's initial argument:\n${proposerArgument}\n\nOpposer's rebuttal:\n${opposerRebuttal}\n\nProposer's counter-response:\n${proposerCounter}\n\nPlease provide a comprehensive summary that:\n1. Gives an overview of the debate topic\n2. Summarizes key arguments from the proposer\n3. Summarizes key counter-arguments from the opposer\n4. Identifies areas of agreement and disagreement\n5. Provides a balanced conclusion with insights\n6. Offers thoughtful reflection on the debate\n\nRespond in the same language as the topic.`;

    // Stream từ agent thay vì generate
    const streamResponse = await moderatorAgent.stream(prompt, {
      runtimeContext: debateContext,
    });

    let fullText = "";
    
    // Process streaming chunks và forward ra ngoài nếu có callback
    for await (const chunk of streamResponse.fullStream) {
      if (streamCallback) {
        streamCallback(stepId, chunk);
      }
      
      // Accumulate text từ chunks
      if (chunk.type === 'text-delta' && chunk.payload?.text) {
        fullText += chunk.payload.text;
      }
    }

    return {
      topic,
      position,
      proposerArgument,
      opposerRebuttal,
      proposerCounter,
      moderatorSummary: fullText,
      stepId,
    };
  },
});

/**
 * Debate Workflow - Workflow tranh luận với 4 steps
 * 
 * Flow:
 * 1. Proposer đưa ra lập luận ban đầu
 * 2. Opposer phản bác
 * 3. Proposer phản bác lại
 * 4. Moderator tổng kết và đưa ra kết luận
 */
export const debateWorkflow = createWorkflow({
  id: "debate-workflow",
  inputSchema: z.object({
    topic: z.string().describe("The debate topic"),
    position: z.string().describe("The position to be defended"),
  }),
  outputSchema: z.object({
    topic: z.string(),
    position: z.string(),
    proposerArgument: z.string(),
    opposerRebuttal: z.string(),
    proposerCounter: z.string(),
    moderatorSummary: z.string(),
  }),
})
  .then(proposerInitialStep)
  .then(opposerRebuttalStep)
  .then(proposerCounterStep)
  .then(moderatorSummaryStep)
  .commit();

