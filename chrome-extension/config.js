const CONFIG = {
  // Production (Active default for end-users)
  API_URL: "https://carbon-oh-no.onrender.com", 
  DASHBOARD_URL: "https://carbon-oh-no.vercel.app",

  // Local fallback (Available for local development)
  // Port 5001 is used because macOS AirPlay Receiver occupies port 5000
  LOCAL_API_URL: "http://localhost:5001",
  LOCAL_DASHBOARD_URL: "http://localhost:3000",
};

// Make it accessible in all Chrome Extension scopes
if (typeof window !== "undefined") {
  window.CONFIG = CONFIG;
}
if (typeof self !== "undefined") {
  self.CONFIG = CONFIG;
}
