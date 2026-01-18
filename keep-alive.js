// keep-alive.js - Keeps server awake on Render.com free tier
(function() {
  const API_BASE = window.API_BASE || "https://fin-date-me.onrender.com";
  
  // Ping server every 5 minutes to keep it awake
  function keepAlive() {
    fetch(`${API_BASE}/health`, { method: 'GET' })
      .catch(e => console.log("Keep-alive ping skipped (offline or error)"));
  }
  
  // Initial ping
  keepAlive();
  
  // Ping every 5 minutes
  setInterval(keepAlive, 5 * 60 * 1000);
  
  // Also ping on page visibility change (when user returns to tab)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      keepAlive();
    }
  });
})();
