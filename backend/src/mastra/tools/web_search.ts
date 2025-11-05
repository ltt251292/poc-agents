import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import logger from "../../logger/index.js";

const getWeatherInfo = async (city: string) => {
  // Replace with an actual API call to a weather service
  logger.info(`Fetching weather for ${city}...`);
  // Example data structure
  return { temperature: 20, conditions: "Sunny" };
};

export const weatherTool = createTool({
  id: "web_search",
  description: `Fetches the current weather information for a given city`,
  inputSchema: z.object({
    city: z.string().describe("City name"),
  }),
  outputSchema: z.object({
    temperature: z.number(),
    conditions: z.string(),
  }),
  execute: async ({ context: { city } }) => {
    logger.info({ city }, "Using tool to fetch weather information for");
    return await getWeatherInfo(city);
  },
});