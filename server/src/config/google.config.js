import "dotenv/config";

export const config = {
   googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
   model: process.env.HELIOS_MODEL || "gemini-2.5-flash",
};
