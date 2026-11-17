import { CompressionIntensity, CompressionResult } from "./types";

/**
 * Fast estimation of LLM token count.
 * Standard heuristic: ~4 characters or ~0.75 words per token.
 */
export function estimateTokens(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  const cleaned = text.trim();
  const wordCount = cleaned.split(/\s+/).length;
  const charCount = cleaned.length;
  const estimated = Math.ceil(Math.max(charCount / 3.8, wordCount * 1.25));
  return Math.max(1, estimated);
}

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

const FILLER_WORDS = [
  /\b(?:basically|literally|honestly|actually|needless to say|truth be told)\b/gi,
  /\b(?:kind of|sort of|pretty much)\b/gi,
  /\b(?:please|kindly)\b/gi,
];

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

  if (result.length < 5) {
    return text.trim();
  }

  return result;
}

export function shortenPromptClient(
  prompt: string,
  intensity: CompressionIntensity = "balanced"
): CompressionResult {
  const originalPrompt = (prompt || "").trim();
  const originalTokens = estimateTokens(originalPrompt);
  const shortenedPrompt = compressPromptLocal(originalPrompt, intensity);
  const shortenedTokens = estimateTokens(shortenedPrompt);
  const tokensSaved = Math.max(0, originalTokens - shortenedTokens);
  const reductionPercentage =
    originalTokens > 0
      ? parseFloat(((tokensSaved / originalTokens) * 100).toFixed(1))
      : 0;

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
    method: "local-nlp-pruning",
  };
}
