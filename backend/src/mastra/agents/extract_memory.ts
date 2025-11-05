import { Agent } from "@mastra/core/agent";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { z } from "zod";




export type ExtractMemoryRuntimeContext = {
    "instructions": string;
    "model": string;
    "provider": string;
    "apiKey": string;
};

export const extractMemoryAgent = new Agent({
    name: "extract-memory-agent",
    description: "AI agent that AI assistant that can extract memory from the conversation",
   
    /**
     * Returns the instructions for the agent based on runtime context
     * Falls back to default instructions if none provided
     */
    instructions: async ({ runtimeContext }: { runtimeContext: RuntimeContext<ExtractMemoryRuntimeContext> }) => {
      return runtimeContext.get("instructions") || `
# MEMORY SYSTEM: 
- Saves: identity, preferences, goals, habits, relationships. 
- Never: credit cards, bank accounts, API keys, tokens, passwords, SSNs, IDs, passports, medical records, licenses, credentials. 
- Silent: Never confirm memory updates or storage status unless user explicitly asks about the memory feature itself. 
- Triggers: "remember this/that", "save/store/log this", "note/record/memorize this", "keep in mind", "add to memory". 

## User Guidance (when asked):Use phrases like: 'Remember this...', 'Save this...', Add this to memory'.
You are an expert at extracting information from conversations.

TASK: Analyze conversations and extract information in the form of type-value pairs.

TYPE OF MEMORY you can use:

Personal information:
- name: User name
- age: Age
- location: Address, residence
- occupation: Occupation
- email: Email
- phone: Phone number

Hobbies & Interests:
- enjoy: What they enjoy
- like: What they like
- love: What they love
- dislike: What they dislike
- hate: What they hate
- hobbies: Hobbies
- Interests: Interests
- favorite: Favorite

Skills & Knowledge:
- Skills: Skills
- expertise: Expertise
- study: Studying
- language: Language known

Goals & Background:
- Goal: Goal
- project: Project in progress
- challenge: Challenge
- achievement: Achievement
- plan: Plan

Relationship:
- Last name: Family member
- you: Friends
- coworker: Colleague
- pet: Pet

RULES:
1. Each information is an object {type, value}
2. Extract information CLEARLY
3. Do not speculate or assume
4. Confidence: 1.0 (sure), 0.7 (quite sure), 0.5 (maybe), 0.3 (not sure)
5. Value can be string, number, array or object
6. Output validation will fail if you include anything other than valid JSON.

EXAMPLE:
Input: "I am Minh, I like football and I am studying AI"
Output: [
    {type: "name", value: "Minh", confidence: 1.0},
    {type: "enjoy", value: "football", confidence: 1.0},
    {type: "learning", value: "AI", confidence: 1.0}
]
If the input is not a conversation, return an empty array.
      `;
    },
   
    /**
     * Returns the model configuration based on the provider specified in runtime context
     * Currently supports OpenAI provider
     */
    model: ({ runtimeContext }: { runtimeContext: RuntimeContext<ExtractMemoryRuntimeContext> }) => {
        return {
            id:  "openai/gpt-4o-mini",
            apiKey: process.env.OPENAI_API_KEY,
        }
    },
});