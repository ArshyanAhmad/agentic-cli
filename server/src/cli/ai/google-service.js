import { google } from "@ai-sdk/google";
import { convertToModelMessages, streamText } from "ai";
import { config } from "../../config/google.config.js";
import chalk from "chalk";

export class AIService {
   constructor() {
      if (!config?.googleApiKey) {
         throw new Error("GOOGLE_API_KEY is not set in env");
      }

      this.model = google(config.model, {
         apiKey: config.googleApiKey,
      });
   }

   /**
    * Send a message and get streaming responser
    * @param {Array} messages
    * @param {Function} onChunk
    * @param {Object} tools
    * @param {Function} onToolCall
    * @return {Promise<Object>}
    */

   async sendMessage(messages, onChunk, tools = undefined, onToolCall = null) {
      try {
         const streamConfig = {
            model: this.model,
            messages,
         };

         const result = streamText(streamConfig);

         let fullResponse = "";

         for await (const chunk of result.textStream) {
            fullResponse += chunk;
            if (onChunk) {
               onChunk(chunk);
            }
         }

         // ⚠️ FIX: await final result properly
         const fullResult = await result;

         return {
            content: fullResponse,
            finishReason: fullResult.finishReason,
            usage: fullResult.usage,
         };
      } catch (error) {
         console.error(chalk.red("AI Service Error:"), error?.message);
         throw error;
      }
   }

   /**
    * Get a non-streaming response
    * @param {Array} messages - Array of messages objects
    * @param {Object} tools - Optional tools
    * @returns {Promise<string>} Response text
    */

   async getMessage(messages, tools = undefined) {
      let fullResponse = "";

      await this.sendMessage(messages, (chunk) => {
         fullResponse += chunk;
      });

      return fullResponse;
   }

   /**
    * Generate structured output using a Zod schema
    * @param {Object} schema - Zod schema
    * @param {string} prompt - Prompt for generation
    * @returns {Promise<Object>} Parsed object matching the schema
    */
   async generateStructured(schema, prompt) {
      try {
         const result = await generateObject({
            model: this.model,
            schema: schema,
            prompt: prompt,
         });

         return result.object;
      } catch (error) {
         console.error(
            chalk.red("AI Structured Generation Error:"),
            error.message,
         );
         throw error;
      }
   }
}
