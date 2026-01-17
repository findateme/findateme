// people.js
document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("grid");
  if (!grid) return;

  try {
    // Fetch real profiles from server
    const baseUrl = window.API_BASE || '';
    const response = await fetch(`${baseUrl}/get_users.php`);
    const data = await response.json();
    const profiles = data.profiles || [];

    if (profiles.length === 0) {
      grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">No profiles yet. Be the first to join!</p>';
      return;
    }

    grid.innerHTML = profiles.map(p => `
      <div class="pcard">
        <div style="width:100%; aspect-ratio:1; background:linear-gradient(135deg, #ff4fd8, #7c4dff); border-radius:8px;"></div>
        <div class="pcard__body">
          <div class="pcard__name">
            <span>${p.name || 'User'}</span>
            <span class="tag">${p.age || '?'}</span>
          </div>
          <div class="pcard__sub">${p.country || 'Unknown'}</div>
          <div class="pcard__actions">
            <button class="smallbtn chat" type="button">Chat</button>
            <button class="smallbtn view" type="button">View</button>
          </div>
        </div>
      </div>
    `).join("");
  } catch (err) {
    console.error("Error loading profiles:", err);
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">Error loading profiles</p>';
  }
});