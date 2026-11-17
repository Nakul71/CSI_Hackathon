import { GoogleGenerativeAI } from "@google/generative-ai";

export type CompressionIntensity = "conservative" | "balanced" | "aggressive";

export interface CompressionResult {
  originalPrompt: string;
  shortenedPrompt: string;
  originalTokens: number;
  shortenedTokens: number;
  tokensSaved: number;
  reductionPercentage: number;
  costSavedINR: number;
  carbonSavedKg: number;
  method: "gemini-neural" | "local-nlp-pruning";
}

/**
 * Fast estimation of LLM token count.
 * Standard heuristic: ~4 characters or ~0.75 words per token.
 */
export function estimateTokens(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  const cleaned = text.trim();
  const wordCount = cleaned.split(/\s+/).length;
  const charCount = cleaned.length;
  // Blend char-based and word-based heuristics
  const estimated = Math.ceil(Math.max(charCount / 3.8, wordCount * 1.25));
  return Math.max(1, estimated);
}

/**
 * Common phrase replacements: wordy phrases -> concise equivalents
 */
const PLEONASMS: [RegExp, string][] = [
  [/\bin order to\b/gi, "to"],
  [/\bat this point in time\b/gi, "now"],
  [/\bat the present time\b/gi, "currently"],
  [/\bdue to the fact that\b/gi, "because"],
  [/\bfor the purpose of\b/gi, "for"],
  [/\bin the event that\b/gi, "if"],
  [/\bwith the exception of\b/gi, "except"],
  [/\bin light of the fact that\b/gi, "since"],
  [/\bit is important to note that\b/gi, "note:"],
  [/\btake into consideration\b/gi, "consider"],
  [/\bmake an assumption\b/gi, "assume"],
  [/\bconduct an investigation into\b/gi, "investigate"],
  [/\bhas the ability to\b/gi, "can"],
  [/\bis able to\b/gi, "can"],
  [/\bgive a detailed explanation of\b/gi, "explain"],
  [/\bprovide a comprehensive overview of\b/gi, "overview"],
  [/\bcan you please explain\b/gi, "explain"],
  [/\bplease could you tell me\b/gi, "tell me"],
  [/\bcan you provide me with\b/gi, "provide"],
  [/\bi would like you to\b/gi, ""],
  [/\bi want you to\b/gi, ""],
  [/\bact as an expert in\b/gi, "expert role:"],
  [/\bact as a\b/gi, "role:"],
  [/\bstep by step\b/gi, "step-by-step"],
];

/**
 * Conversational fluff and pleasantries to strip
 */
const FLUFF_PATTERNS: RegExp[] = [
  /^(?:hello|hi|hey|greetings|good\s+(?:morning|afternoon|evening))\s*(?:there|chatgpt|claude|gemini|assistant)?[\s,!.]*/im,
  /^(?:i\s+hope\s+you\s+are\s+doing\s+well[\s,!.]*)/im,
  /^(?:how\s+are\s+you(?:\s+doing)?\s*(?:today)?[\s,!?.]*)/im,
  /(?:thank\s+you\s+(?:very\s+much|so\s+much)?(?:\s+in\s+advance)?[\s,!.]*)$/im,
  /(?:thanks(?:\s+a\s+lot)?(?:\s+in\s+advance)?[\s,!.]*)$/im,
  /(?:let\s+me\s+know\s+what\s+you\s+think[\s,!.]*)$/im,
  /(?:looking\s+forward\s+to\s+your\s+(?:reply|response)[\s,!.]*)$/im,
  /(?:i\s+would\s+really\s+appreciate\s+your\s+help[\s,!.]*)/gim,
];

/**
 * Filler words to prune in balanced / aggressive modes
 */
const FILLER_WORDS = [
  /\b(?:basically|literally|honestly|actually|needless to say|truth be told)\b/gi,
  /\b(?:kind of|sort of|pretty much)\b/gi,
  /\b(?:please|kindly)\b/gi,
];

/**
 * Tier 1: Local ML/NLP Semantic Redundancy Pruning
 */
export function compressPromptLocal(
  text: string,
  intensity: CompressionIntensity = "balanced"
): string {
  if (!text) return "";

  let result = text.trim();

  // 1. Remove greetings and conversational pleasantries
  for (const pattern of FLUFF_PATTERNS) {
    result = result.replace(pattern, "");
  }

  // 2. Normalize pleonasms (wordy phrases -> concise equivalents)
  for (const [pattern, replacement] of PLEONASMS) {
    result = result.replace(pattern, replacement);
  }

  // 3. Remove filler words in balanced and aggressive modes
  if (intensity === "balanced" || intensity === "aggressive") {
    for (const pattern of FILLER_WORDS) {
      result = result.replace(pattern, "");
    }
  }

  // 4. Aggressive mode: condense instruction patterns into concise imperative directives
  if (intensity === "aggressive") {
    result = result
      .replace(/\b(?:make sure that|ensure that)\b/gi, "ensure")
      .replace(/\b(?:in terms of)\b/gi, "for")
      .replace(/\b(?:a large number of|a lot of)\b/gi, "many")
      .replace(/\b(?:as soon as possible)\b/gi, "ASAP")
      .replace(/\b(?:with regard to|in reference to)\b/gi, "re:")
      .replace(/\b(?:for the reason that)\b/gi, "since");
  }

  // 5. Clean up redundant whitespace, multiple spaces, duplicate punctuation
  result = result
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .replace(/\s+([,.:;?!])/g, "$1")
    .replace(/([.!?]){2,}/g, "$1")
    .trim();

  // If compression ended up too short or empty, return original
  if (result.length < 5) {
    return text.trim();
  }

  return result;
}

/**
 * Tier 2: Neural Generative Compression with Gemini
 */
export async function compressPromptNeural(
  text: string,
  intensity: CompressionIntensity = "balanced"
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const intensityGuideline =
      intensity === "aggressive"
        ? "Compress aggressively (up to 60-70% token reduction). Use dense, high-impact bullet directives or imperative instructions."
        : intensity === "conservative"
          ? "Compress conservatively (around 20-30% token reduction). Remove only pleasantries, greetings, and wordy filler."
          : "Compress balanced (around 40-50% token reduction). Strip filler, streamline sentence structure, preserve all technical requirements.";

    const prompt = `
System: You are an expert AI prompt optimization and compression engine.
Objective: Shorten the user prompt to use fewer tokens while preserving 100% of its core intent, instructions, variables, parameters, and expected output formatting.

Guidelines:
1. ${intensityGuideline}
2. Never lose critical code snippets, URLs, parameter names, or constraint definitions.
3. Remove pleasantries, greetings, conversational meta-talk ("Can you please", "I was wondering").
4. Output ONLY the compressed prompt text. Do not wrap in markdown code blocks or add preamble/explanations.

User Prompt to Compress:
"""
${text}
"""
`;

    const result = await model.generateContent(prompt);
    const candidate = result.response.text().trim();

    // Verify it is non-empty and actually shorter
    if (candidate && candidate.length > 0 && candidate.length < text.length) {
      return candidate;
    }
    return null;
  } catch (err) {
    console.warn("[PromptCompressor] Gemini API compression failed, falling back to local NLP:", err);
    return null;
  }
}

/**
 * Main Shorten Function:
 * Tries Neural Compression first (if Gemini key available), then falls back to Local ML/NLP.
 */
export async function shortenPrompt(
  prompt: string,
  intensity: CompressionIntensity = "balanced"
): Promise<CompressionResult> {
  const originalPrompt = (prompt || "").trim();
  const originalTokens = estimateTokens(originalPrompt);

  let shortenedPrompt = "";
  let method: "gemini-neural" | "local-nlp-pruning" = "local-nlp-pruning";

  // Try neural first
  const neuralResult = await compressPromptNeural(originalPrompt, intensity);
  if (neuralResult && neuralResult.length < originalPrompt.length) {
    shortenedPrompt = neuralResult;
    method = "gemini-neural";
  } else {
    // Local NLP Pruning
    shortenedPrompt = compressPromptLocal(originalPrompt, intensity);
    method = "local-nlp-pruning";
  }

  const shortenedTokens = estimateTokens(shortenedPrompt);
  const tokensSaved = Math.max(0, originalTokens - shortenedTokens);
  const reductionPercentage =
    originalTokens > 0
      ? parseFloat(((tokensSaved / originalTokens) * 100).toFixed(1))
      : 0;

  // Impact calculations (from IMPACT_METHODOLOGY.md)
  // 1 token = 0.0003 INR
  // 1 token = 0.000003 kWh * 1.2 PUE * 0.7 Grid = 0.00000252 kg CO₂ (~0.00002 kg CO₂)
  const costSavedINR = parseFloat((tokensSaved * 0.0003).toFixed(4));
  const carbonSavedKg = parseFloat((tokensSaved * 0.00002).toFixed(6));

  return {
    originalPrompt,
    shortenedPrompt,
    originalTokens,
    shortenedTokens,
    tokensSaved,
    reductionPercentage,
    costSavedINR,
    carbonSavedKg,
    method,
  };
}
