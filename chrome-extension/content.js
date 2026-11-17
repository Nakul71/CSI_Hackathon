// ── Carbon-oh-no Content Scraper ─────────────────────────────────────

function logActivityToDashboard(payload) {
  try {
    chrome.runtime.sendMessage({ type: "LOG_ACTIVITY", payload }, () => {});
  } catch(e) {}
}

// Fully robust, unblockable UI injector (Fixed position on screen)
function injectBanner(id, message, actionHtml) {
  try {
    let banner = document.getElementById(id);
    if (!banner) {
      banner = document.createElement("div");
      banner.id = id;
      // Guaranteed to be Top-Center on ANY website
      banner.setAttribute("style", "position: fixed; top: 16px; left: 50%; transform: translateX(-50%); background-color: #064e3b; color: #a7f3d0; padding: 10px 18px; border-radius: 8px; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 10px; border: 2px solid #059669; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5); z-index: 2147483647; animation: slideIn 0.3s ease-out; pointer-events: auto;");
      document.body.appendChild(banner);
    }
    banner.innerHTML = `<span style="font-size: 18px">🌱</span><span>${message}</span>${actionHtml || ""}`;
  } catch(e) {}
}

function removeBanner(id) {
  try {
    const banner = document.getElementById(id);
    if (banner) banner.remove();
  } catch(e) {}
}

// ── 1. ChatGPT Tracker (chatgpt.com) ─────────────
if (window.location.hostname.includes("chatgpt.com")) {
  let lastCharCount = 0;
  let originalPromptCache = "";

  const getChatGPTElement = () => {
    return document.getElementById("prompt-textarea") || 
           document.querySelector('div[contenteditable="true"]') || 
           document.querySelector('div[contenteditable="plaintext-only"]');
  };

  const getChatGPTText = () => {
    const el = getChatGPTElement();
    if (!el) return "";
    return (el.value || el.innerText || el.textContent || "").trim();
  };

  const setChatGPTText = (text) => {
    const el = getChatGPTElement();
    if (!el) return;
    if ("value" in el) {
      el.value = text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      el.innerText = text;
      el.dispatchEvent(new InputEvent("input", { bubbles: true }));
    }
  };

  // Helper to get the last user message from the chat history
  const getLastUserMessageCount = () => {
    try {
      const messages = document.querySelectorAll('[data-message-author-role="user"]');
      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        return lastMsg.innerText.trim().length;
      }
    } catch(e) {}
    return 0;
  };

  let isShortening = false;

  setInterval(() => {
    try {
      if (isShortening) return;
      const text = getChatGPTText();
      const charCount = text.length;
      if (charCount > 0) lastCharCount = charCount;
      
      // Threshold: 30 characters
      if (charCount > 30) {
        const estTokens = Math.ceil(charCount / 4);
        const estCarbon = (estTokens * 0.00002).toFixed(5);
        
        const actionBtn = `<button id="carbon-shorten-btn" style="background:#10b981; color:#064e3b; border:none; border-radius:4px; padding:4px 10px; font-weight:700; font-size:12px; cursor:pointer; margin-left:6px; display:inline-flex; align-items:center; gap:4px;">⚡ Shorten (ML)</button>`;
        
        injectBanner("carbon-chatgpt-warning", `High Token Usage! (~${estTokens} tokens, ${estCarbon} kg CO₂).`, actionBtn);

        const btn = document.getElementById("carbon-shorten-btn");
        if (btn && !btn.dataset.bound) {
          btn.dataset.bound = "true";
          btn.addEventListener("click", () => {
            const rawText = getChatGPTText();
            if (!rawText) return;
            originalPromptCache = rawText;
            isShortening = true;
            btn.innerText = "Shortening...";
            btn.disabled = true;

            chrome.runtime.sendMessage({ type: "SHORTEN_PROMPT", prompt: rawText }, (res) => {
              isShortening = false;
              if (res && res.status === "success" && res.data) {
                setChatGPTText(res.data.shortenedPrompt);
                const undoBtn = `<button id="carbon-undo-btn" style="background:#374151; color:#f3f4f6; border:none; border-radius:4px; padding:3px 8px; font-weight:600; font-size:11px; cursor:pointer; margin-left:6px;">Undo</button>`;
                injectBanner("carbon-chatgpt-warning", `Shortened! Saved ${res.data.tokensSaved} tokens (~${(res.data.carbonSavedKg * 1000).toFixed(2)}g CO₂).`, undoBtn);
                
                const undo = document.getElementById("carbon-undo-btn");
                if (undo) {
                  undo.addEventListener("click", () => {
                    setChatGPTText(originalPromptCache);
                    removeBanner("carbon-chatgpt-warning");
                  });
                }
                setTimeout(() => removeBanner("carbon-chatgpt-warning"), 7000);
              } else {
                btn.innerText = "Error";
                setTimeout(() => { btn.innerText = "⚡ Shorten (ML)"; btn.disabled = false; }, 2000);
              }
            });
          });
        }
      } else {
        removeBanner("carbon-chatgpt-warning");
      }
    } catch (e) {}
  }, 1200);

  const handleGPTSend = () => {
    // Priority 1: Current textarea count
    // Priority 2: Last known count from interval
    // Priority 3: Scrape the actual message from the history (Wait 500ms for it to appear)
    const count = getChatGPTCount() || lastCharCount;
    
    if (count > 0) {
      scrapeAndPostGPT(count);
    } else {
      // Fallback: wait for the message to hit the DOM
      setTimeout(() => {
        const historyCount = getLastUserMessageCount();
        if (historyCount > 0) scrapeAndPostGPT(historyCount);
      }, 700);
    }
    removeBanner("carbon-chatgpt-warning");
  };

  document.addEventListener("keydown", (e) => {
    try {
      if (e.key === "Enter" && !e.shiftKey) {
        handleGPTSend();
      }
    } catch(e) {}
  });

  document.addEventListener("click", (e) => {
    try {
      let target = e.target;
      while (target && target !== document) {
        const testId = target.getAttribute ? target.getAttribute("data-testid") : "";
        const ariaLabel = target.getAttribute ? target.getAttribute("aria-label") : "";
        if (
          (testId && testId.toLowerCase().includes("send")) ||
          (ariaLabel && ariaLabel.toLowerCase().includes("send")) ||
          (target.nodeName === "BUTTON" && target.querySelector('svg') && target.parentElement?.classList.contains('flex'))
        ) {
          handleGPTSend();
          break;
        }
        target = target.parentNode;
      }
    } catch(e) {}
  });

  function scrapeAndPostGPT(charCount) {
    if (!charCount) return;
    const estimatedTokens = Math.ceil(charCount / 4) + 20; 
    const cost = parseFloat((estimatedTokens * 0.0003).toFixed(4));
    const carbon = parseFloat((estimatedTokens * 0.00002).toFixed(5));
    console.log("Carbon-oh-no: Logging GPT Activity", { charCount, estimatedTokens });
    logActivityToDashboard({ type: "ai", description: `ChatGPT prompt (${charCount} chars)`, size: `${estimatedTokens} tokens`, costINR: cost, carbonKg: carbon });
  }
}

// ── 2. Gmail Tracker (mail.google.com) ───────────
if (window.location.hostname.includes("mail.google.com")) {
  let lastTotalMB = 0;

  setInterval(() => {
    try {
      let totalMB = 0.0;
      
      // Approach 1: Gmail's built-in Screen Reader accessibility labels (Most Robust)
      // Gmail usually labels attachments like: "Attachment: orange-train.mp4 (11,410K)"
      // We MUST only look inside the parentheses to avoid matching numbers in filenames (e.g., 3840x2160)
      const attachmentChips = document.querySelectorAll('[aria-label*="Attachment"]'); 
      attachmentChips.forEach(chip => {
        const label = chip.getAttribute("aria-label") || "";
        
        // Strict Regex: Look for numbers in parentheses followed by unit
        // This avoids matching "2160" from "3840x2160.mp4"
        const match = label.match(/\(([\d,.]+)\s*(MB|KB|GB|M|K)\)/i);
        
        if (match) {
          let sizeStr = match[1].replace(/,/g, ''); // Handle commas like 11,410
          const sizeInfo = parseFloat(sizeStr);
          const unit = match[2].toUpperCase();
          
          if (unit === "MB" || unit === "M") totalMB += sizeInfo;
          else if (unit === "KB" || unit === "K") totalMB += (sizeInfo / 1024);
          else if (unit === "GB" || unit === "G") totalMB += (sizeInfo * 1024);
          
          console.log(`[Carbon-oh-no] Detected Attachment: ${sizeInfo} ${unit} (Label: ${label})`);
        }
      });

      // Approach 2: Fallback to reading small spans containing sizes (if aria tags change)
      if (totalMB === 0) {
        const composeWindows = document.querySelectorAll('.M9, .AD'); 
        const seen = new Set();
        
        composeWindows.forEach(win => {
          const spans = win.querySelectorAll('span');
          spans.forEach(span => {
            const text = (span.innerText || "").trim();
            // Spans in Gmail for size are tiny and usually like "(1.2 MB)"
            if (text.length > 0 && text.length < 20 && text.includes('(')) {
               const match = text.match(/^\(?([\d,.]+)\s*(MB|KB|GB|M|K)\)?$/i);
               if (match && !seen.has(text)) {
                 seen.add(text);
                 let sizeStr = match[1].replace(/,/g, '');
                 const sizeInfo = parseFloat(sizeStr);
                 const unit = match[2].toUpperCase();
                 
                 if (unit === "MB" || unit === "M") totalMB += sizeInfo;
                 else if (unit === "KB" || unit === "K") totalMB += (sizeInfo / 1024);
                 else if (unit === "GB" || unit === "G") totalMB += (sizeInfo * 1024);
               }
            }
          });
        });
      }

      // Final Safety Cap: Gmail usually limits attachments to 25MB total. 
      // If we see > 50MB, it's likely a scraping error (except for Drive links which are handled elsewhere).
      if (totalMB > 50) {
        console.warn(`[Carbon-oh-no] Unusually high Gmail size detected (${totalMB}MB). Capping for safety.`);
        totalMB = 25.0; 
      }

      lastTotalMB = totalMB;
      if (totalMB > 0.5) { // Threshold for warning: 0.5 MB
        injectBanner("carbon-gmail-warning", `Heavy attachments! (${totalMB.toFixed(2)} MB). Use a Google Drive link to save CO₂!`);
      } else {
        removeBanner("carbon-gmail-warning");
      }
    } catch(e) {}
  }, 1500);

  document.addEventListener("click", (e) => {
    try {
      let target = e.target;
      while (target && target !== document) {
        if (
          (target.getAttribute && target.getAttribute("data-tooltip") && target.getAttribute("data-tooltip").includes("Send \u202A")) ||
          (target.innerText && target.innerText.includes("Send") && target.getAttribute && target.getAttribute("role") === "button")
        ) {
          scrapeAndPostEmail(lastTotalMB);
          removeBanner("carbon-gmail-warning");
          break;
        }
        target = target.parentNode;
      }
    } catch(e) {}
  });

  function scrapeAndPostEmail(totalMB) {
    let sizeStr = "Text Email";
    let estCost = 0.005; 
    let estCarbon = 0.00004;
    
    // Use the detected total (limited to safety cap)
    if (totalMB > 0) {
      sizeStr = `${totalMB.toFixed(1)} MB`;
      estCost = parseFloat(Math.max(0.005, totalMB * 0.005).toFixed(4)); 
      estCarbon = parseFloat(Math.max(0.00004, totalMB * 0.0000042).toFixed(5)); 
    }
    
    console.log(`[Carbon-oh-no] Logging Email Activity: ${sizeStr}`);
    logActivityToDashboard({ 
      type: "email", 
      description: totalMB > 0 ? `Email with attachments (${sizeStr})` : "Standard text email", 
      size: sizeStr, 
      costINR: estCost, 
      carbonKg: estCarbon 
    });
  }
}


// ── 3. Google Search Tracker (www.google.com) ───
if (window.location.hostname.includes("google.com")) {
  console.log("Carbon-oh-no: Google Search Tracker Active");
  let searchHandled = false;

  // Function to track search
  const trackSearch = (query) => {
    if (searchHandled || !query) return;
    searchHandled = true;
    
    console.log("Carbon-oh-no: Search tracked:", query);
    logActivityToDashboard({ 
      type: "search", 
      description: `Google Search: "${query.substring(0, 30)}${query.length > 30 ? "..." : ""}"`, 
      size: "1 search", 
      costINR: 0.02, 
      carbonKg: 0.0002 
    });
    
    injectBanner("carbon-search-info", `Search Tracked! 🌍 Impact: 0.0002 kg CO₂.`);
    setTimeout(() => {
      removeBanner("carbon-search-info");
    }, 4000);
    
    setTimeout(() => { searchHandled = false; }, 2000);
  };

  // 1. Detect if we just LANDED on a search results page (from address bar/New Tab)
  const urlParams = new URLSearchParams(window.location.search);
  const urlQuery = urlParams.get("q");
  if (window.location.pathname === "/search" && urlQuery) {
    // We arrived at a search page, track it!
    trackSearch(urlQuery);
  }

  // 2. Listen for 'Enter' key on search inputs (for searches ON the page)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const target = e.target;
      if (target && (target.name === "q" || target.getAttribute("role") === "combobox" || target.getAttribute("aria-label")?.includes("Search"))) {
        trackSearch(target.value);
      }
    }
  });

  // 3. Listen for form submissions
  document.addEventListener("submit", (e) => {
    const form = e.target;
    if (form && (form.action.includes("/search") || form.getAttribute("role") === "search")) {
      const input = form.querySelector('textarea[name="q"], input[name="q"], [role="combobox"]');
      if (input) trackSearch(input.value);
    }
  });

  // 4. Listen for clicks on search buttons/icons
  document.addEventListener("click", (e) => {
    let target = e.target;
    while (target && target !== document) {
      if (
        (target.nodeName === "INPUT" && target.getAttribute("name") === "btnK") || 
        (target.nodeName === "BUTTON" && (target.type === "submit" || target.getAttribute("aria-label")?.includes("Search"))) ||
        (target.innerText && target.innerText.includes("Google Search")) ||
        (target.querySelector && target.querySelector('svg') && target.getAttribute("aria-label")?.includes("Search"))
      ) {
        const input = document.querySelector('textarea[name="q"], input[name="q"], [role="combobox"]');
        const queryVal = input ? input.value : "";
        if (queryVal) trackSearch(queryVal);
        break;
      }
      target = target.parentNode;
    }
  });
}
