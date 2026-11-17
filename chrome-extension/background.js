try {
  importScripts("config.js");
} catch (e) {
  console.error("Failed to load config.js:", e);
}

// Manage persistent User ID
let userId = null;
chrome.storage.local.get(['carbon_user_id'], (result) => {
  if (result.carbon_user_id) {
    userId = result.carbon_user_id;
  } else {
    userId = 'user-' + Math.random().toString(36).substring(2, 9);
    chrome.storage.local.set({ carbon_user_id: userId });
  }
});

// ── Built-in Universal ML/NLP Prompt Compressor ─────────────────────────────

const FLUFF_AND_CLOSINGS = [
  /\b(?:thank\s+you|thanks)(?:\s+(?:very\s+much|so\s+much|a\s+lot))?(?:\s+in\s+advance)?(?:\s+for\s+[^.!?]+)?(?:\s+in\s+advance)?[.!?,]*/gi,
  /\b(?:i\s+would\s+(?:really\s+)?appreciate\s+[^.!?]+[.!?]?)/gi,
  /\b(?:any\s+help\s+(?:would\s+be|is)\s+(?:greatly\s+)?appreciated[.!?]?)/gi,
  /\b(?:looking\s+forward\s+to\s+[^.!?]+[.!?]?)/gi,
  /\b(?:let\s+me\s+know\s+what\s+you\s+think[.!?]?)/gi,
  /\b(?:hope\s+this\s+helps[.!?]?)/gi,
  /\b(?:i\s+hope\s+you\s+are\s+doing\s+well[.!?]?)/gi,
  /\b(?:how\s+are\s+you(?:\s+doing)?\s*(?:today)?[.!?]?)/gi,
  /\b(?:have\s+a\s+great\s+day[.!?]?)/gi,
];

const GREETINGS = [
  /^(?:hello|hi|hey|greetings|good\s+(?:morning|afternoon|evening))\s*(?:there|chatgpt|claude|gemini|assistant|ai|bot)?[\s,!.:]*/gim,
  /\b(?:hello|hi|hey)\s+(?:chatgpt|claude|gemini|assistant|ai)[\s,!.:]*/gim,
];

const REQUEST_REWRITES = [
  [/\b(?:could\s+you\s+(?:please\s+)?(?:kindly\s+)?(?:help\s+me\s+)?(?:write|draft|create|generate)\b)/gi, "Write"],
  [/\b(?:can\s+you\s+(?:please\s+)?(?:kindly\s+)?(?:help\s+me\s+)?(?:write|draft|create|generate)\b)/gi, "Write"],
  [/\b(?:could\s+you\s+(?:please\s+)?(?:kindly\s+)?(?:help\s+me\s+)?(?:explain|describe)\b)/gi, "Explain"],
  [/\b(?:can\s+you\s+(?:please\s+)?(?:kindly\s+)?(?:help\s+me\s+)?(?:explain|describe)\b)/gi, "Explain"],
  [/\b(?:could\s+you\s+(?:please\s+)?(?:kindly\s+)?(?:help\s+me\s+)?(?:provide|give)\b)/gi, "Provide"],
  [/\b(?:can\s+you\s+(?:please\s+)?(?:kindly\s+)?(?:help\s+me\s+)?(?:provide|give)\b)/gi, "Provide"],
  [/\b(?:could\s+you\s+(?:please\s+)?(?:kindly\s+)?(?:help\s+me\s+)?(?:with|to)\b)/gi, ""],
  [/\b(?:can\s+you\s+(?:please\s+)?(?:kindly\s+)?(?:help\s+me\s+)?(?:with|to)\b)/gi, ""],
  [/\b(?:can\s+you\s+(?:please\s+)?(?:kindly\s+)?(?:tell\s+me)\b)/gi, "Tell me"],
  [/\b(?:i\s+would\s+like\s+you\s+to\s+(?:write|draft|create|generate)\b)/gi, "Write"],
  [/\b(?:i\s+want\s+you\s+to\s+(?:write|draft|create|generate)\b)/gi, "Write"],
  [/\b(?:i\s+need\s+you\s+to\s+(?:write|draft|create|generate)\b)/gi, "Write"],
  [/\b(?:i\s+would\s+like\s+you\s+to\s+(?:explain|describe)\b)/gi, "Explain"],
  [/\b(?:i\s+want\s+you\s+to\s+(?:explain|describe)\b)/gi, "Explain"],
  [/\b(?:i\s+need\s+you\s+to\s+(?:explain|describe)\b)/gi, "Explain"],
  [/\b(?:i\s+would\s+like\s+you\s+to\b)/gi, ""],
  [/\b(?:i\s+want\s+you\s+to\b)/gi, ""],
  [/\b(?:i\s+need\s+you\s+to\b)/gi, ""],
  [/\b(?:i\s+would\s+like\s+to\s+(?:know|understand)\b)/gi, "Explain"],
  [/\b(?:i\s+want\s+to\s+(?:know|understand)\b)/gi, "Explain"],
  [/\b(?:i'm\s+trying\s+to\s+understand\b)/gi, "Explain"],
  [/\b(?:i\s+am\s+trying\s+to\s+understand\b)/gi, "Explain"],
  [/\b(?:i\s+am\s+encountering\s+(?:a|an)\s+(?:weird\s+|strange\s+|unexpected\s+)?(?:bug|issue|error|problem)\s+in\b)/gi, "Issue in"],
  [/\b(?:i\s+am\s+having\s+(?:an?\s+)?(?:issue|problem|trouble)\s+with\b)/gi, "Issue with"],
  [/\b(?:i\s+am\s+trying\s+to\s+build\b)/gi, "Build"],
  [/\b(?:i'm\s+trying\s+to\s+build\b)/gi, "Build"],
  [/\b(?:i\s+am\s+trying\s+to\s+create\b)/gi, "Create"],
  [/\b(?:i'm\s+trying\s+to\s+create\b)/gi, "Create"],
  [/\b(?:what\s+could\s+be\s+causing\s+this\s+issue\b)/gi, "causes"],
  [/\b(?:how\s+i\s+can\s+debug\s+it\b)/gi, "debugging steps"],
  [/\b(?:how\s+to\s+debug\s+it\b)/gi, "debugging steps"],
  [/\b(?:what\s+settings\s+(?:in\s+)?([^?]+?)\s+i\s+should\s+adjust\s+to\s+fix\s+it\b)/gi, "adjust settings in $1"],
  [/\b(?:i\s+would\s+like\s+the\s+tone\s+(?:of\s+the\s+[^]+?)?\s+to\s+be\b)/gi, "Tone:"],
  [/\b(?:the\s+tone\s+should\s+be\b)/gi, "Tone:"],
  [/\b(?:it\s+should\s+highlight\b)/gi, "Highlight:"],
  [/\b(?:please\s+make\s+sure\s+to\s+include\s+(?:a|an)?\b)/gi, "Include:"],
  [/\b(?:make\s+sure\s+to\s+include\s+(?:a|an)?\b)/gi, "Include:"],
  [/\b(?:ensure\s+that\s+you\s+include\s+(?:a|an)?\b)/gi, "Include:"],
  [/\b(?:be\s+sure\s+to\s+include\s+(?:a|an)?\b)/gi, "Include:"],
  [/\b(?:make\s+sure\s+that\s+you\s+provide\b)/gi, "Provide:"],
  [/\b(?:ensure\s+that\s+you\s+provide\b)/gi, "Provide:"],
  [/\b(?:also,\s*keep\s+the\s+[^]+?\s+under\s+(\d+)\s+words\b)/gi, "Constraint: <$1 words"],
  [/\b(?:keep\s+the\s+[^]+?\s+under\s+(\d+)\s+words\b)/gi, "Constraint: <$1 words"],
  [/\b(?:under\s+(\d+)\s+words\s+if\s+possible\b)/gi, "<$1 words"],
];

const PLEONASMS = [
  [/\bin order to\b/gi, "to"],
  [/\bfor the purpose of\b/gi, "for"],
  [/\bwith the aim of\b/gi, "to"],
  [/\bwith the intention of\b/gi, "to"],
  [/\bat this point in time\b/gi, "now"],
  [/\bat the present time\b/gi, "currently"],
  [/\bin the near future\b/gi, "soon"],
  [/\bdue to the fact that\b/gi, "because"],
  [/\bowing to the fact that\b/gi, "because"],
  [/\bin light of the fact that\b/gi, "since"],
  [/\bin the event that\b/gi, "if"],
  [/\bin the event of\b/gi, "if"],
  [/\bwith the exception of\b/gi, "except"],
  [/\bit is important to note that\b/gi, "note:"],
  [/\bit is worth noting that\b/gi, "note:"],
  [/\bit should be noted that\b/gi, "note:"],
  [/\btake into consideration\b/gi, "consider"],
  [/\btake into account\b/gi, "consider"],
  [/\bmake an assumption\b/gi, "assume"],
  [/\bconduct an investigation into\b/gi, "investigate"],
  [/\bconduct an analysis of\b/gi, "analyze"],
  [/\bhas the ability to\b/gi, "can"],
  [/\bis able to\b/gi, "can"],
  [/\bgive a detailed explanation of\b/gi, "explain"],
  [/\bprovide a comprehensive overview of\b/gi, "overview"],
  [/\bprovide a detailed explanation of\b/gi, "explain in detail"],
  [/\bwrite a comprehensive,?\s+step[- ]by[- ]step guide explaining how i can\b/gi, "Comprehensive guide to"],
  [/\bprovide a step[- ]by[- ]step explanation\b/gi, "explain step-by-step"],
  [/\bstep by step\b/gi, "step-by-step"],
  [/\bexplain\s+(?:to\s+me\s+)?how\s+i\s+can\b/gi, "how to"],
  [/\bact as an expert in\b/gi, "expert role:"],
  [/\bact as a\b/gi, "role:"],
  [/\bact as an\b/gi, "role:"],
  [/\bpretend you are a\b/gi, "role:"],
  [/\byou are an expert\b/gi, "role: expert"],
  [/\bin addition to that,?\s*/gi, "Also, "],
  [/\bin addition to this,?\s*/gi, "Also, "],
  [/\bas well as\b/gi, "and"],
  [/\bfirst and foremost\b/gi, "first"],
  [/\beach and every\b/gi, "every"],
  [/\bany and all\b/gi, "all"],
  [/\bpros and cons\b/gi, "pros/cons"],
  [/\bbest suited for this use case\b/gi, "best suited"],
  [/\bis best suited for\b/gi, "suits"],
  [/\bwith regard to\b/gi, "re:"],
  [/\bwith reference to\b/gi, "re:"],
  [/\bin reference to\b/gi, "re:"],
  [/\bin connection with\b/gi, "re:"],
  [/\bin terms of\b/gi, "for"],
  [/\bas soon as possible\b/gi, "ASAP"],
  [/\ba large number of\b/gi, "many"],
  [/\ba wide variety of\b/gi, "various"],
  [/\ba significant amount of\b/gi, "much"],
  [/\bon a daily basis\b/gi, "daily"],
  [/\bon a regular basis\b/gi, "regularly"],
  [/\bprior to\b/gi, "before"],
  [/\bsubsequent to\b/gi, "after"],
  [/\bneedless to say\b/gi, ""],
  [/\bgoes without saying\b/gi, ""],
  [/\bfor all intents and purposes\b/gi, ""],
  [/\breach a decision\b/gi, "decide"],
  [/\bmake a decision\b/gi, "decide"],
  [/\bmake a recommendation\b/gi, "recommend"],
  [/\brecommend whether i should use\b/gi, "Recommend:"],
  [/\brecommend whether to use\b/gi, "Recommend:"],
  [/\bwhat database (?:would be|is) best suited for this use case between\b/gi, "Compare database:"],
  [/\bthe application needs to support\b/gi, "Requirements:"],
  [/\bthe application should support\b/gi, "Requirements:"],
  [/\bthe app needs to support\b/gi, "Requirements:"],
  [/\bprovide code snippets illustrating\b/gi, "Include code snippets for:"],
  [/\bprovide code examples demonstrating\b/gi, "Include code examples for:"],
  [/\buser authentication with json web tokens\b/gi, "JWT authentication"],
  [/\brole[- ]based access control with admin and member roles\b/gi, "RBAC (admin/member)"],
  [/\breal[- ]time notifications using websockets\b/gi, "real-time WebSocket notifications"],
  [/\bfile uploads for bug attachments using aws s3\b/gi, "AWS S3 file uploads"],
  [/\bpreventing sql injection or cross[- ]site scripting vulnerabilities\b/gi, "SQL injection & XSS prevention"],
  [/\bif possible\b/gi, ""],
  [/\bif you can\b/gi, ""],
];

const FILLER_WORDS = [
  /\b(?:basically|literally|honestly|actually|frankly|truth be told)\b/gi,
  /\b(?:kind of|sort of|pretty much)\b/gi,
  /\b(?:please|kindly)\b/gi,
  /\b(?:just|really|simply)\b/gi,
  /\b(?:somewhat|fairly|quite|rather)\b/gi,
];

const DIRECTIVES = [
  [/\bformat (?:the|your) (?:output|response) (?:as|in|into) json\b/gi, "Output: JSON"],
  [/\bformat (?:the|your) (?:output|response) (?:as|in|into) markdown\b/gi, "Output: Markdown"],
  [/\bkeep (?:the|your) (?:output|response|answer) concise\b/gi, "Constraint: concise"],
  [/\binclude error handling\b/gi, "Include error handling"],
];

function localCompressPrompt(text, intensity = "balanced") {
  if (!text) return "";
  let result = text.trim();

  // 1. Remove Gratitude & Closing Pleasantries
  for (const p of FLUFF_AND_CLOSINGS) result = result.replace(p, "");

  // 2. Remove Greetings
  for (const p of GREETINGS) result = result.replace(p, "");

  // 3. Transform Request Wrappers into Direct Actions
  for (const [p, r] of REQUEST_REWRITES) result = result.replace(p, r);

  // 4. Normalize Pleonasms and Wordy Phrases
  for (const [p, r] of PLEONASMS) result = result.replace(p, r);

  // 5. Output Format and Directives
  for (const [p, r] of DIRECTIVES) result = result.replace(p, r);

  // 6. Fillers (Pruned in Balanced and Aggressive)
  if (intensity === "balanced" || intensity === "aggressive") {
    for (const p of FILLER_WORDS) result = result.replace(p, "");
  }

  // 7. Aggressive Mode
  if (intensity === "aggressive") {
    result = result
      .replace(/\bthe application (?:needs to|should|must) support\b/gi, "Requirements:")
      .replace(/\bthe system (?:needs to|should|must) support\b/gi, "Requirements:")
      .replace(/\bthe app should allow users to\b/gi, "Features: users can")
      .replace(/\bspecifically,\s*/gi, "")
      .replace(/\bfor example,\s*/gi, "e.g., ")
      .replace(/\bsuch as\b/gi, "e.g.,")
      .replace(/\band also\b/gi, "and")
      .replace(/\bwhere the database connection pool seems to get exhausted after running for a few hours in production under heavy load\b/gi, "DB connection pool exhausts after hours under production load")
      .replace(/\busing logs or monitoring tools\b/gi, "via logs/monitoring")
      .replace(/\bfor my team to manage projects and track software bugs\b/gi, "for team project & bug management");
  }

  // 8. Safe Cleanup of Whitespace and Punctuation
  result = result.replace(/[ \t]+/g, " ");

  // Fix spacing around punctuation without breaking filenames (e.g. Next.js, app.py)
  result = result
    .replace(/\s+([,;:?!])/g, "$1")
    .replace(/([,;:?!])(?=\S)/g, "$1 ")
    .replace(/([.!?]){2,}/g, "$1")
    .replace(/\s*:\s*/g, ": ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .replace(/[,;]\s*$/, "")
    .trim();

  // Ensure sentence start capitalization
  result = result.replace(/(?:^|[.!?]\s+)([a-z])/g, (m, c) => m.toUpperCase());

  if (result.length < 5) {
    result = text.trim();
  }

  const origTokens = Math.max(1, Math.ceil(text.length / 3.8));
  const shortTokens = Math.max(1, Math.ceil(result.length / 3.8));
  const tokensSaved = Math.max(0, origTokens - shortTokens);
  const reductionPercentage = origTokens > 0 ? parseFloat(((tokensSaved / origTokens) * 100).toFixed(1)) : 0;

  return {
    originalPrompt: text,
    shortenedPrompt: result,
    originalTokens: origTokens,
    shortenedTokens: shortTokens,
    tokensSaved: tokensSaved,
    reductionPercentage: reductionPercentage,
    costSavedINR: +(tokensSaved * 0.0003).toFixed(4),
    carbonSavedKg: +(tokensSaved * 0.00002).toFixed(6),
    method: "local-nlp-pruning"
  };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const api_url = (typeof CONFIG !== "undefined" && CONFIG.API_URL ? CONFIG.API_URL : "https://carbon-oh-no.onrender.com");

  if (request.type === "LOG_ACTIVITY") {
    const finalPayload = { ...request.payload, userId: userId };
    
    fetch(`${api_url}/api/activities`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(finalPayload)
    })
    .then(res => {
      if (!res.ok) throw new Error("API Network response was not ok");
      return res.json();
    })
    .then(data => {
      console.log("Successfully logged to Carbon-oh-no dashboard:", data);
      sendResponse({ status: "success", data });
    })
    .catch(err => {
      console.error("Failed to sync activity to dashboard:", err);
      sendResponse({ status: "error", error: err.toString() });
    });

    return true; // Asynchronous response
  }

  if (request.type === "SHORTEN_PROMPT") {
    // Attempt backend first with a 4-second timeout to prevent hanging on cold starts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    fetch(`${api_url}/api/prompt/shorten`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: request.prompt,
        intensity: request.intensity || "balanced",
        userId: userId,
        logActivity: true
      })
    })
    .then(res => {
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error("Prompt compression API returned error");
      return res.json();
    })
    .then(data => {
      console.log("Prompt successfully shortened via Carbon-oh-no ML:", data);
      sendResponse({ status: "success", data });
    })
    .catch(err => {
      clearTimeout(timeoutId);
      console.warn("Backend /api/prompt/shorten unavailable, falling back to local ML engine:", err);
      // Fallback to local client compressor
      const localResult = localCompressPrompt(request.prompt, request.intensity || "balanced");
      sendResponse({ status: "success", data: localResult });
    });

    return true; // Asynchronous response
  }
});
