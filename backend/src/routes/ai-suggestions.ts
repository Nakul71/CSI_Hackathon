import { Router, Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getStore } from "../data/store";
import { generateId } from "../utils/helpers";
import { ImpactLevel } from "../types";

const router = Router();

/** GET /api/ai-suggestions — Generate and return AI suggestions based on recent activities */
router.get("/", async (req: Request, res: Response) => {
  const { userId = "default" } = req.query as Record<string, string>;
  const store = getStore(userId);
  
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    // 1. Get the last 20 activities for this user
    const recentActivities = store.activities.slice(0, 20);

    // 2. Prepare the prompt
    let prompt = `
System Prompt: You are a sustainability AI. Analyze the following user digital activities JSON. 
Return exactly 3 specific, actionable suggestions to reduce their carbon footprint.
Strict return the response as a JSON array with the exact keys: title, description, category (must be 'email', 'storage', or 'ai'), savingsINR (number), and savingsCO2 (number).
Ensure the tone is helpful and personalized, as if speaking directly to the user about their specific activities.

User Digital Activities:
${JSON.stringify(recentActivities, null, 2)}
    `;

    // Fallback if no activities exist
    if (recentActivities.length === 0) {
      prompt += "\nNote: User has no recent activities yet. Provide 3 high-level 'getting started' suggestions for digital sustainability.";
    }

    // 3. Call the Gemini API
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const outputText = response.text();
    
    let parsedData = [];
    try {
      parsedData = JSON.parse(outputText);
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", outputText);
      return res.status(500).json({ error: "AI response was not valid JSON" });
    }

    // 4. Transform the parsed data into Suggestion objects
    const newSuggestions = parsedData.map((item: any) => {
      // Determine impact roughly based on savingsCO2
      let impact: ImpactLevel = "low";
      if (item.savingsCO2 > 2) impact = "high";
      else if (item.savingsCO2 > 0.5) impact = "medium";

      return {
        id: generateId(),
        title: item.title,
        description: item.description,
        savingsINR: item.savingsINR || 0,
        savingsCO2: item.savingsCO2 || 0,
        impact,
        category: item.category,
        applied: false,
      };
    });

    // 5. Update the store
    // We maintain a limited number of suggestions in store.
    store.suggestions.unshift(...newSuggestions);
    if (store.suggestions.length > 50) {
      store.suggestions.length = 50; 
    }

    // Filter by impact if provided in query string
    const { impact } = req.query as Record<string, string>;
    let results = newSuggestions;
    if (impact && impact !== "all") {
      results = results.filter((s: { impact: string; }) => s.impact === impact);
    }

    res.json(results);
  } catch (error) {
    console.error("AI Generation Error:", error);
    
    // Fallback: return existing suggestions from store if AI fails
    // This ensures the UI is never empty "suggestions nhi aa rhe"
    const { impact } = req.query as Record<string, string>;
    let results = [...store.suggestions].slice(0, 3);
    if (impact && impact !== "all") {
      results = results.filter((s) => s.impact === impact);
    }
    
    res.json(results);
  }
});

export default router;
