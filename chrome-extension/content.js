// ── Carbon-oh-no Content Scraper ─────────────────────────────────────

function logActivityToDashboard(payload) {
  try {
    chrome.runtime.sendMessage({ type: "LOG_ACTIVITY", payload }, () => {});
  } catch(e) {}
}

// Fully robust, unblockable UI injector (Fixed position on screen)
function injectBanner(id, message) {
  try {
    if (document.getElementById(id)) return;
    
    const banner = document.createElement("div");
    banner.id = id;
    // Guaranteed to be Top-Center on ANY website
    banner.setAttribute("style", "position: fixed; top: 16px; left: 50%; transform: translateX(-50%); background-color: #064e3b; color: #a7f3d0; padding: 12px 20px; border-radius: 8px; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; border: 2px solid #059669; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5); z-index: 2147483647; animation: slideIn 0.3s ease-out; pointer-events: none;");
    banner.innerHTML = `<span style="font-size: 18px">🌱</span><span>${message}</span>`;
    
    document.body.appendChild(banner);
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

  const getChatGPTCount = () => {
    const textarea = document.getElementById("prompt-textarea") || 
                     document.querySelector('div[contenteditable="true"]') || 
                     document.querySelector('div[contenteditable="plaintext-only"]');
    if (!textarea) return 0;
    const textContent = textarea.value || textarea.innerText || textarea.textContent || "";
    return textContent.trim().length;
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

  setInterval(() => {
    try {
      const charCount = getChatGPTCount();
      if (charCount > 0) lastCharCount = charCount;
      
      // Threshold for testing: 20 characters
      if (charCount > 20) {
        injectBanner("carbon-chatgpt-warning", `High Token Usage! (> ${charCount} chars). Estimated: ~0.005 kg CO₂. Consider summarizing!`);
      } else {
        removeBanner("carbon-chatgpt-warning");
      }
    } catch (e) {}
  }, 1000);

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
        if (
          (target.getAttribute && target.getAttribute("data-testid") && target.getAttribute("data-testid").includes("send-button")) ||
          (target.nodeName === "BUTTON" && target.querySelector('svg') && target.parentElement?.classList.contains('flex')) ||
          (target.ariaLabel === "Send prompt")
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
    const estimatedTokens = Math.ceil(charCount / 4) + 50; 
    const cost = parseFloat((estimatedTokens * 0.0015).toFixed(4));
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
    let estCost = 0.05; 
    let estCarbon = 0.004;
    
    // Use the detected total (limited to safety cap)
    if (totalMB > 0) {
      sizeStr = `${totalMB.toFixed(1)} MB`;
      estCost = parseFloat((0.05 + (totalMB * 0.12)).toFixed(3)); 
      estCarbon = parseFloat((0.004 + (totalMB * 0.015)).toFixed(3)); 
    }
    
    console.log(`[Carbon-oh-no] Logging Email Activity: ${sizeStr}`);
    logActivityToDashboard({ 
      type: "email", 
      description: totalMB > 0 ? "Email with attachments sent" : "Standard email", 
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
        trackSearch();
        break;
      }
      target = target.parentNode;
    }
  });
}
