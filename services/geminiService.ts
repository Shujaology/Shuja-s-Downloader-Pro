import { GoogleGenAI } from "@google/genai";

export async function generateVideoSummary(videoTitle: string): Promise<string> {
  if (!process.env.API_KEY) {
    console.warn("API_KEY environment variable not set. Returning placeholder summary.");
    return "This is a fantastic video that you've discovered. It's sure to be a great addition to your collection. Enjoy watching!";
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Generate a short, creative, and slightly witty summary (2-3 sentences) for a YouTube video titled: "${videoTitle}". Do not use markdown.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error generating video summary with Gemini:", error);
    return "Could not generate a summary for this video. It must be too awesome for words!";
  }
}