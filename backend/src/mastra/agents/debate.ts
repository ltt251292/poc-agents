import { Agent } from "@mastra/core/agent";
import { RuntimeContext } from "@mastra/core/runtime-context";

/**
 * Runtime context type cho debate agents
 */
export type DebateRuntimeContext = {
  "model": string;
  "apiKey": string;
  "provider": string;
  "streamCallback"?: (stepId: string, chunk: any) => void;
};

/**
 * Proposer Agent - Người đề xuất ủng hộ quan điểm
 * Agent này sẽ đưa ra lập luận ban đầu và phản bác lại các phản biện
 */
export const proposerAgent = new Agent({
  name: "proposer-agent",
  description: "AI agent that proposes and defends a position in a debate",

  /**
   * Instructions cho Proposer Agent
   * Agent này sẽ đưa ra lập luận ủng hộ quan điểm và phản bác lại các phản biện
   */
  instructions: async ({ runtimeContext }: { runtimeContext: RuntimeContext<DebateRuntimeContext> }) => {
    return `
# Role
You are a Proposer Agent responsible for presenting and defending a position in a debate.

# Core Responsibilities
- Present clear, well-structured arguments supporting your position
- Use evidence, logical reasoning, and examples to strengthen your case
- Respond to counter-arguments with thoughtful rebuttals
- Maintain a respectful and professional tone

# Language
- Automatically detect the user's input language
- Respond in the same language the user used
- Maintain consistency in language throughout the debate

# Argument Style
- Be persuasive but not aggressive
- Focus on facts, logic, and evidence
- Address specific points raised by opponents
- Acknowledge valid points while maintaining your position
- Build upon previous arguments when countering

# Response Format
- Structure your arguments clearly with main points and supporting evidence
- Use examples and analogies when helpful
- Keep responses focused and concise
- End with a strong concluding statement that reinforces your position
    `;
  },

  /**
   * Model configuration dựa trên provider trong runtime context
   */
  model: ({ runtimeContext }: { runtimeContext: RuntimeContext<DebateRuntimeContext> }) => {
    switch (runtimeContext.get("provider")) {
      case "openai":
        return {
          id: `${runtimeContext.get("provider")}/${runtimeContext.get("model")}` as `${string}/${string}`,
          apiKey: runtimeContext.get("apiKey") || process.env.OPENAI_API_KEY,
        };
      default:
        throw new Error(`Provider ${runtimeContext.get("provider")} not supported`);
    }
  },
});

/**
 * Opposer Agent - Người phản biện chống lại quan điểm
 * Agent này sẽ phản bác các lập luận của Proposer
 */
export const opposerAgent = new Agent({
  name: "opposer-agent",
  description: "AI agent that opposes and challenges a position in a debate",

  /**
   * Instructions cho Opposer Agent
   * Agent này sẽ phản bác các lập luận và tìm ra điểm yếu trong quan điểm đối lập
   */
  instructions: async ({ runtimeContext }: { runtimeContext: RuntimeContext<DebateRuntimeContext> }) => {
    return `
# Role
You are an Opposer Agent responsible for challenging and critiquing a position in a debate.

# Core Responsibilities
- Identify weaknesses and flaws in the opposing position
- Present counter-arguments with evidence and logical reasoning
- Question assumptions and challenge claims
- Maintain a respectful and professional tone

# Language
- Automatically detect the user's input language
- Respond in the same language the user used
- Maintain consistency in language throughout the debate

# Argument Style
- Be critical but respectful
- Focus on identifying logical fallacies, weak evidence, or unsupported claims
- Provide alternative perspectives and solutions
- Use examples and analogies to illustrate your points
- Build upon previous arguments when countering

# Response Format
- Structure your counter-arguments clearly
- Address specific points raised by the proposer
- Provide evidence and reasoning for your position
- Keep responses focused and concise
- End with a strong statement that challenges the opposing position
    `;
  },

  /**
   * Model configuration dựa trên provider trong runtime context
   */
  model: ({ runtimeContext }: { runtimeContext: RuntimeContext<DebateRuntimeContext> }) => {
    switch (runtimeContext.get("provider")) {
      case "openai":
        return {
          id: `${runtimeContext.get("provider")}/${runtimeContext.get("model")}` as `${string}/${string}`,
          apiKey: runtimeContext.get("apiKey") || process.env.OPENAI_API_KEY,
        };
      default:
        throw new Error(`Provider ${runtimeContext.get("provider")} not supported`);
    }
  },
});

/**
 * Moderator Agent - Người điều phối và tổng kết
 * Agent này sẽ tổng kết toàn bộ cuộc tranh luận và đưa ra kết luận
 */
export const moderatorAgent = new Agent({
  name: "moderator-agent",
  description: "AI agent that moderates and summarizes a debate",

  /**
   * Instructions cho Moderator Agent
   * Agent này sẽ tổng kết toàn bộ cuộc tranh luận và đưa ra kết luận cân bằng
   */
  instructions: async ({ runtimeContext }: { runtimeContext: RuntimeContext<DebateRuntimeContext> }) => {
    return `
# Role
You are a Moderator Agent responsible for summarizing and concluding a debate.

# Core Responsibilities
- Provide a balanced summary of both positions
- Identify key arguments and counter-arguments presented
- Highlight strengths and weaknesses of each side
- Offer a fair conclusion based on the evidence presented

# Language
- Automatically detect the user's input language
- Respond in the same language the user used
- Maintain consistency in language throughout the summary

# Summary Style
- Be objective and impartial
- Acknowledge valid points from both sides
- Structure your summary clearly with:
  * Overview of the debate topic
  * Key arguments from the proposer
  * Key counter-arguments from the opposer
  * Final assessment and conclusion
- Provide constructive insights and balanced perspective

# Response Format
- Begin with a brief overview of the debate topic
- Summarize the main arguments from both sides
- Identify areas of agreement and disagreement
- Provide a balanced conclusion with insights
- End with a thoughtful reflection on the debate
    `;
  },

  /**
   * Model configuration dựa trên provider trong runtime context
   */
  model: ({ runtimeContext }: { runtimeContext: RuntimeContext<DebateRuntimeContext> }) => {
    switch (runtimeContext.get("provider")) {
      case "openai":
        return {
          id: `${runtimeContext.get("provider")}/${runtimeContext.get("model")}` as `${string}/${string}`,
          apiKey: runtimeContext.get("apiKey") || process.env.OPENAI_API_KEY,
        };
      default:
        throw new Error(`Provider ${runtimeContext.get("provider")} not supported`);
    }
  },
});

