// search-users.js - Username search functionality for home page
(function() {
  const searchInput = document.getElementById("q");
  const grid = document.getElementById("grid");
  let searchTimeout;
  
  if (!searchInput || !grid) return;
  
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    
    // Clear previous timeout
    if (searchTimeout) clearTimeout(searchTimeout);
    
    // If empty, reload page to show all profiles
    if (!query) {
      window.location.reload();
      return;
    }
    
    // Wait until at least 2 characters
    if (query.length < 2) return;
    
    // Debounce search (wait 300ms after typing stops)
    searchTimeout = setTimeout(() => {
      performSearch(query);
    }, 300);
  });
  
  async function performSearch(query) {
    console.log("🔍 Searching for:", query);
    
    try {
      const baseUrl = window.API_BASE || '';
      const response = await fetch(`${baseUrl}/api/search?username=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      
      const data = await response.json();
      let results = data.users || [];
      
      console.log(`📊 Found ${results.length} users`);
      
      if (results.length === 0) {
        grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;padding:40px;color:#999;">No users found matching "${escapeHtml(query)}"</p>`;
        return;
      }
      
      // Get current user info for filtering
      const activeEmail = localStorage.getItem("dateme_active_user");
      const userProfile = JSON.parse(localStorage.getItem("dateme_profile") || "{}");
      const currentUserGender = (userProfile.gender || "").toLowerCase();
      
      // Filter out current user
      if (activeEmail) {
        results = results.filter(p => p.email.toLowerCase() !== activeEmail.toLowerCase());
      }
      
      // Apply gender-based filtering (same as main profiles)
      if (currentUserGender === "male" || currentUserGender === "female") {
        const targetGender = currentUserGender === "male" ? "female" : "male";
        results = results.filter(p => {
          const profileGender = (p.gender || "").toLowerCase();
          return profileGender === targetGender;
        });
        console.log(`🔍 Gender filter applied: showing ${targetGender} profiles only`);
      }
      
      if (results.length === 0) {
        grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;padding:40px;color:#999;">No matching profiles found for your search</p>`;
        return;
      }
      
      // Render search results
      grid.innerHTML = results.map(p => {
        const hasPhoto = p.photo && p.photo.trim();
        const photoStyle = hasPhoto 
          ? `background-image:url('${p.photo}');background-size:cover;background-position:center;`
          : `background:linear-gradient(135deg,#ff4fd8,#7c4dff);`;
        
        return `
          <div class="pcard" data-email="${escapeHtml(p.email)}" style="cursor:pointer;">
            <div style="width:100%;aspect-ratio:1;${photoStyle}border-radius:8px;"></div>
            <div class="pcard__body">
              <div class="pcard__name">
                <span>${escapeHtml(p.name || p.username || 'User')}</span>
                <span class="tag">${p.age || '?'}</span>
              </div>
              <div class="pcard__sub">${escapeHtml(p.city || p.country || 'Unknown')}</div>
              <div class="pcard__actions">
                <button class="smallbtn chat" type="button" data-action="chat">Chat</button>
                <button class="smallbtn view" type="button" data-action="view">View</button>
              </div>
            </div>
          </div>
        `;
      }).join("");
      
      // Add click handlers to search results
      grid.querySelectorAll('.pcard').forEach(card => {
        const email = card.getAttribute('data-email');
        
        card.addEventListener('click', (e) => {
          if (e.target.tagName === 'BUTTON') return;
          if (email) window.location.href = `profile-view.html?email=${encodeURIComponent(email)}`;
        });
        
        const viewBtn = card.querySelector('[data-action="view"]');
        if (viewBtn) {
          viewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (email) window.location.href = `profile-view.html?email=${encodeURIComponent(email)}`;
          });
        }
        
        const chatBtn = card.querySelector('[data-action="chat"]');
        if (chatBtn) {
          chatBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (email) window.location.href = `inbox.html?chat=${encodeURIComponent(email)}`;
          });
        }
      });
      
    } catch (err) {
      console.error("❌ Search error:", err);
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:#999;">Search error. Please try again.</p>';
    }
  }
  
  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
})();
