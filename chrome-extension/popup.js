document.addEventListener('DOMContentLoaded', async () => {
    // 1. Get or Generate userId (Match background.js using chrome.storage)
    chrome.storage.local.get(['carbon_user_id'], async (result) => {
        let userId = result.carbon_user_id;
        if (!userId) {
            userId = 'user-' + Math.random().toString(36).substring(2, 9);
            chrome.storage.local.set({ carbon_user_id: userId });
        }

        const dashboardBase = (typeof CONFIG !== "undefined" && CONFIG.DASHBOARD_URL) 
            ? CONFIG.DASHBOARD_URL 
            : "https://carbon-oh-no.vercel.app";

        const apiBase = (typeof CONFIG !== "undefined" && CONFIG.API_URL) 
            ? CONFIG.API_URL 
            : "https://carbon-oh-no.onrender.com";

        // 2. Update Dashboard & Prompt Shortener Links with userId
        const dashboardLink = document.querySelector('.btn-primary');
        if (dashboardLink) {
            dashboardLink.href = `${dashboardBase}?user=${userId}`;
        }

        const optimizerLink = document.getElementById('optimizer-link');
        if (optimizerLink) {
            optimizerLink.href = `${dashboardBase}/prompt-optimizer?user=${userId}`;
        }

        // 3. Update Popup KPI data (with timeout guard against cold starts)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3500);

            const response = await fetch(`${apiBase}/api/dashboard/kpi?userId=${userId}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error("Network response failed");
            
            const kpi = await response.json();
            const co2El = document.getElementById('co2-val');
            const costEl = document.getElementById('cost-val');
            
            if (co2El) co2El.innerText = `${(kpi.totalCO2Saved || 0).toFixed(2)} kg`;
            if (costEl) costEl.innerText = `₹ ${(kpi.totalCostSaved || 0).toFixed(2)}`;
            
        } catch (error) {
            console.warn("KPI sync delayed or offline (Render cold-start):", error);
            const co2El = document.getElementById('co2-val');
            const costEl = document.getElementById('cost-val');
            if (co2El && co2El.innerText.includes("--")) co2El.innerText = "0.00 kg";
            if (costEl && costEl.innerText.includes("--")) costEl.innerText = "₹ 0.00";
        }
    });
});
