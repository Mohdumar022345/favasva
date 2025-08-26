import { model, titleModel } from "../config/gemini";
import { Part, Content } from "@google/generative-ai";

export class AIService {
  static async *generateResponse(
    prompt: string,
    conversationHistory: Array<{ role: string; content: string }> = []
  ): AsyncIterable<string> {
    try {
      const history: Content[] = conversationHistory.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.content }] as Part[],
      }));

      const contents = [
        ...history,
        {
          role: "user",
          parts: [{ text: prompt }] as Part[],
        },
      ];

      const result = await model.generateContentStream({ contents });

      for await (const chunk of result.stream) {
        yield chunk.text();
      }
    } catch (error) {
      console.error("AI Service Error:", error);
      throw new Error("Failed to generate AI response");
    }
  }

   static async generateChatTitle(firstUserMessage: string): Promise<string> {
    try {
      const prompt = `You are a helpful assistant that generates concise, creative, and unique titles for chat conversations.
      Based on the following user's first message, provide a short title (max 5-7 words) that hints at the conversation's potential topic or is a creative take on the initial interaction.
      Avoid generic titles like "Initial Contact" or "Greeting". If the message is very simple (e.g., "Hi", "Hello"), generate a more imaginative title.
      Do not include any conversational phrases or greetings, just the title.

User message: '${firstUserMessage}'

Title:`;

      // Use the dedicated titleModel for title generation
      const result = await titleModel.generateContent(prompt);
      const response = await result.response;
      let title = response.text().trim();

      // Basic cleanup: remove quotes if the AI wraps the title in them
      if (title.startsWith('"') && title.endsWith('"')) {
        title = title.substring(1, title.length - 1);
      }
      // Ensure it's not too long
      const words = title.split(/\s+/);
      if (words.length > 7) {
        title = words.slice(0, 7).join(" ") + "...";
      }

      return title;
    } catch (error) {
      console.error("AI Service Error generating chat title:", error);
      throw new Error("Failed to generate AI chat title");
    }
  }
}
