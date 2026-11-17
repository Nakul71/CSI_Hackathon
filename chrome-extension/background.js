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

// Built-in offline/fallback prompt compressor
function localCompressPrompt(text, intensity = "balanced") {
  if (!text) return "";
  let result = text.trim();

  const fluff = [
    /^(?:hello|hi|hey|greetings|good\s+(?:morning|afternoon|evening))\s*(?:there|chatgpt|claude|gemini|assistant)?[\s,!.]*/im,
    /^(?:i\s+hope\s+you\s+are\s+doing\s+well[\s,!.]*)/im,
    /^(?:how\s+are\s+you(?:\s+doing)?\s*(?:today)?[\s,!?.]*)/im,
    /(?:thank\s+you\s+(?:very\s+much|so\s+much)?(?:\s+in\s+advance)?[\s,!.]*)$/im,
    /(?:thanks(?:\s+a\s+lot)?(?:\s+in\s+advance)?[\s,!.]*)$/im,
    /(?:let\s+me\s+know\s+what\s+you\s+think[\s,!.]*)$/im,
    /(?:looking\s+forward\s+to\s+your\s+(?:reply|response)[\s,!.]*)$/im,
    /(?:i\s+would\s+really\s+appreciate\s+your\s+help[\s,!.]*)/gim,
  ];
  for (const p of fluff) result = result.replace(p, "");

  const pleonasms = [
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
    [/\bhas the ability to\b/gi, "can"],
    [/\bis able to\b/gi, "can"],
    [/\bgive a detailed explanation of\b/gi, "explain"],
    [/\bcan you please explain\b/gi, "explain"],
    [/\bplease could you tell me\b/gi, "tell me"],
    [/\bcan you provide me with\b/gi, "provide"],
    [/\bi would like you to\b/gi, ""],
    [/\bi want you to\b/gi, ""],
    [/\bact as an expert in\b/gi, "expert role:"],
    [/\bact as a\b/gi, "role:"],
    [/\bstep by step\b/gi, "step-by-step"],
  ];
  for (const [p, r] of pleonasms) result = result.replace(p, r);

  const fillers = [
    /\b(?:basically|literally|honestly|actually|needless to say)\b/gi,
    /\b(?:kind of|sort of|pretty much)\b/gi,
    /\b(?:please|kindly)\b/gi,
  ];
  for (const f of fillers) result = result.replace(f, "");

  result = result
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .replace(/\s+([,.:;?!])/g, "$1")
    .replace(/([.!?]){2,}/g, "$1")
    .trim();

  const origTokens = Math.max(1, Math.ceil(text.length / 3.8));
  const shortTokens = Math.max(1, Math.ceil(result.length / 3.8));
  const tokensSaved = Math.max(0, origTokens - shortTokens);
  const reductionPercentage = origTokens > 0 ? parseFloat(((tokensSaved / origTokens) * 100).toFixed(1)) : 0;

  return {
    originalPrompt: text,
    shortenedPrompt: result.length >= 5 ? result : text,
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
  const api_url = (typeof CONFIG !== "undefined" && CONFIG.API_URL ? CONFIG.API_URL : "http://localhost:5001");

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
    fetch(`${api_url}/api/prompt/shorten`, {
      method: "POST",
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
      if (!res.ok) throw new Error("Prompt compression API returned error");
      return res.json();
    })
    .then(data => {
      console.log("Prompt successfully shortened via Carbon-oh-no ML:", data);
      sendResponse({ status: "success", data });
    })
    .catch(err => {
      console.warn("Backend /api/prompt/shorten unavailable, falling back to local ML engine:", err);
      // Fallback to local client compressor
      const localResult = localCompressPrompt(request.prompt, request.intensity || "balanced");
      sendResponse({ status: "success", data: localResult });
    });

    return true; // Asynchronous response
  }
});
