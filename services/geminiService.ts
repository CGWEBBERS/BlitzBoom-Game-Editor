// Fix: Implement Gemini service to call the AI model.
import { GoogleGenAI } from "@google/genai";

// Fix: Initialize the GoogleGenAI client according to guidelines.
// The API key is sourced from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Sends a prompt to the Gemini API and returns the text response.
 * @param prompt The user's prompt.
 * @returns The generated text from the model.
 */
export const askAI = async (prompt: string): Promise<string> => {
  try {
    // Fix: Use the correct model 'gemini-2.5-flash' and API call `ai.models.generateContent`.
    // Added a system instruction to tailor the AI's responses for a game engine context.
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            systemInstruction: "You are a helpful assistant for a game engine. Provide concise code snippets or explanations. Format code in markdown blocks.",
        }
    });
    
    // Fix: Access the text directly from the response object as per guidelines.
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    // Fix: Provide a user-friendly error message.
    return "An error occurred while communicating with the AI. Please check the console for details.";
  }
};
