const CONFIG = {
  // Local Development (Active default for local running)
  // Port 5001 is used because macOS AirPlay Receiver occupies port 5000
  API_URL: "http://localhost:5001",
  DASHBOARD_URL: "http://localhost:3000",
  
  // Production
  // API_URL: "https://carbon-oh-no.onrender.com", 
  // DASHBOARD_URL: "https://carbon-oh-no.vercel.app",
};

// Make it accessible in all Chrome Extension scopes
if (typeof window !== "undefined") {
  window.CONFIG = CONFIG;
}
if (typeof self !== "undefined") {
  self.CONFIG = CONFIG;
}
