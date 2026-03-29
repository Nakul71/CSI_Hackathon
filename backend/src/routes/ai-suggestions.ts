import { Router, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { getStore } from "../data/store";
import { generateId } from "../utils/helpers";
import { ImpactLevel, Suggestion } from "../types";

const router = Router();

// Fallback suggestions when Gemini API is unavailable or times out
const FALLBACK_SUGGESTIONS: Omit<Suggestion, "id">[] = [
  {
    title: "Compress Email Attachments",
    description:
      "Use compressed formats (ZIP/WebP) for email attachments to reduce data transfer by up to 60%. Consider sharing large files via Google Drive links instead of direct attachments.",
    savingsINR: 2.5,
    savingsCO2: 0.15,
    impact: "high",
    category: "email",
    applied: false,
  },
  {
    title: "Optimize AI Prompt Length",
    description:
      "Write concise, specific prompts instead of long, vague ones. Shorter prompts use fewer tokens and reduce GPU inference energy. Try to reuse previous responses instead of re-asking.",
    savingsINR: 5.0,
    savingsCO2: 0.08,
    impact: "medium",
    category: "ai",
    applied: false,
  },
  {
    title: "Clean Up Cloud Storage",
    description:
      "Delete duplicate files, old backups, and unused documents from your cloud storage. Even idle stored data consumes energy for redundancy and cooling.",
    savingsINR: 1.2,
    savingsCO2: 0.05,
    impact: "low",
    category: "storage",
    applied: false,
  },
];

/** Helper: Run a promise with a timeout */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Gemini API timed out")), ms);
    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/** GET /api/ai-suggestions — Generate and return AI suggestions based on recent activities */
router.get("/", async (req: Request, res: Response) => {
  const { userId = "default" } = req.query as Record<string, string>;
  const store = getStore(userId);

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const ai = new GoogleGenAI({ apiKey });
    // 1. Get the last 20 activities for this user
    const recentActivities = store.activities.slice(0, 20);

    // If no activities yet, return fallback suggestions
    if (recentActivities.length === 0) {
      const fallbackWithIds = FALLBACK_SUGGESTIONS.map((s) => ({
        ...s,
        id: generateId(),
      }));
      store.suggestions.unshift(...fallbackWithIds);
      return res.json(fallbackWithIds);
    }

    // 2. Prepare the prompt
    const prompt = `
System Prompt: You are a sustainability AI. Analyze the following user digital activities JSON. 
Return exactly 3 specific, actionable suggestions to reduce their carbon footprint.
Strict return the response as a JSON array with the exact keys: title, description, category (must be 'email', 'storage', or 'ai'), savingsINR (number), and savingsCO2 (number).
Ensure the tone is helpful and personalized, as if speaking directly to the user about their specific activities.

User Digital Activities:
${JSON.stringify(recentActivities, null, 2)}
    `;

    // 3. Call the Gemini API with a 10-second timeout
    const response = await withTimeout(
      ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      }),
      10000
    );

    const outputText = response.text || "[]";
    let parsedData = [];
    try {
      parsedData = JSON.parse(outputText);
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", outputText);
      throw new Error("AI response was not valid JSON");
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

    // 5. Add to store
    store.suggestions.unshift(...newSuggestions);
    if (store.suggestions.length > 50) {
      store.suggestions.length = 50;
    }

    // Filter by impact if provided
    const { impact } = req.query as Record<string, string>;
    let result = newSuggestions;
    if (impact && impact !== "all") {
      result = result.filter((s: { impact: string }) => s.impact === impact);
    }

    res.json(result);
  } catch (error) {
    console.error("AI Generation Error:", error);

    // Return fallback suggestions instead of a 500 error
    const fallbackWithIds = FALLBACK_SUGGESTIONS.map((s) => ({
      ...s,
      id: generateId(),
    }));
    store.suggestions.unshift(...fallbackWithIds);
    if (store.suggestions.length > 50) {
      store.suggestions.length = 50;
    }

    res.json(fallbackWithIds);
  }
});

export default router;
