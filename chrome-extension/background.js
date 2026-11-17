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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const api_url = (typeof CONFIG !== "undefined" && CONFIG.API_URL ? CONFIG.API_URL : "http://localhost:5000");

  if (request.type === "LOG_ACTIVITY") {
    // Attach the persistent userId to the payload
    const finalPayload = { ...request.payload, userId: userId };
    
    // Send to backend Activity API
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
      console.error("Failed to compress prompt:", err);
      sendResponse({ status: "error", error: err.toString() });
    });

    return true; // Asynchronous response
  }
});
