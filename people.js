// people.js
document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("grid");
  if (!grid) return;

  async function loadProfiles() {
    // Remove loader
    const loader = document.getElementById("gridLoader");
    if (loader) loader.remove();
    
    try {
      // Get current user's plan from localStorage
      const activeEmail = localStorage.getItem("dateme_active_user");
      let userPlan = "free"; // default
      
      if (activeEmail) {
        try {
          // Get user plan (free, basic, premium)
          const hasUpgrade = localStorage.getItem("dateme_upgrade_verified") === "true";
          if (hasUpgrade) {
            userPlan = localStorage.getItem("dateme_selected_plan") || "basic";
          }
        } catch (e) {
          console.log("⚠️ Could not load user plan");
        }
      }
      
      // Set profile limits based on plan
      let profileLimit = 10; // free: 10 profiles
      if (userPlan === "basic") {
        profileLimit = 50;
      } else if (userPlan === "premium") {
        profileLimit = 100;
      }
      
      console.log("💎 User plan:", userPlan, "- Profile limit:", profileLimit);
      
      // Always fetch fresh data from server (no cache)
      const baseUrl = window.API_BASE || '';
      
      const response = await fetch(`${baseUrl}/get_users.php?t=${Date.now()}`);
      
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }
      
      const data = await response.json();
      const profiles = data.users || data.profiles || [];
      
      // Debug: Check if photos exist in API response
      const photosCount = profiles.filter(p => p.photo && p.photo.trim()).length;
      console.log("📊 Total profiles:", profiles.length, "| With photos:", photosCount);
      
      // Debug: Show first 3 profiles photo status
      profiles.slice(0, 3).forEach((p, i) => {
        console.log(`Profile ${i + 1}: ${p.name || p.email}`, {
          hasPhoto: !!p.photo,
          photoLength: p.photo ? p.photo.length : 0,
          isDataURI: p.photo ? p.photo.startsWith('data:image') : false
        });
      });

      if (profiles.length === 0) {
        console.log("⚠️ No profiles found");
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">No profiles yet. Be the first to join!</p>';
        return;
      }

      // Filter out deleted accounts (those without valid email)
      let validProfiles = profiles.filter(p => p.email && p.email.trim());
      
      // Apply profile limit based on plan
      const totalAvailable = validProfiles.length;
      validProfiles = validProfiles.slice(0, profileLimit);
      
      console.log(`✅ Showing ${validProfiles.length} of ${totalAvailable} profiles (${userPlan} plan limit: ${profileLimit})`);

      if (validProfiles.length === 0) {
        console.log("⚠️ No valid profiles (all missing email)");
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">No active profiles available.</p>';
        return;
      }

      grid.innerHTML = validProfiles.map(p => {
        // Photo display logic - show photo if exists, otherwise gradient
        const hasPhoto = p.photo && p.photo.trim() && p.photo.startsWith('data:image');
        
        const photoStyle = hasPhoto 
          ? `background-image:url('${p.photo}'); background-size:cover; background-position:center;`
          : `background:linear-gradient(135deg, #ff4fd8, #7c4dff);`;
        
        return `
          <div class="pcard" data-email="${escapeHtml(p.email)}" style="cursor: pointer;">
            <div style="width:100%; aspect-ratio:1; ${photoStyle} border-radius:8px;"></div>
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
      
      // Add click handlers to all profile cards
      const cards = grid.querySelectorAll('.pcard');
      cards.forEach(card => {
        const email = card.getAttribute('data-email');
        
        // Click on card (excluding buttons) to view profile
        card.addEventListener('click', (e) => {
          // If clicked on a button, let button handler take over
          if (e.target.tagName === 'BUTTON') return;
          
          if (email) {
            window.location.href = `profile-view?email=${encodeURIComponent(email)}`;
          }
        });
        
        // View button click
        const viewBtn = card.querySelector('[data-action="view"]');
        if (viewBtn) {
          viewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (email) {
              window.location.href = `profile-view.html?email=${encodeURIComponent(email)}`;
            }
          });
        }
        
        // Chat button click
        const chatBtn = card.querySelector('[data-action="chat"]');
        if (chatBtn) {
          chatBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (email) {
              window.location.href = `inbox.html?chat=${encodeURIComponent(email)}`;
            }
          });
        }
      });
      
      // Show upgrade message if user reached their plan limit
      if (totalAvailable > profileLimit) {
        const remaining = totalAvailable - profileLimit;
        const upgradeHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 30px 20px; background: rgba(255,79,216,.1); border: 2px solid rgba(255,79,216,.3); border-radius: 16px; margin-top: 20px;">
            <div style="font-size: 20px; font-weight: 800; margin-bottom: 8px;">🔒 ${remaining} More Profiles Available</div>
            <div style="color: var(--muted); margin-bottom: 16px;">
              ${userPlan === 'free' ? 'Upgrade to Basic ($14) to see 50 profiles or Premium ($30) to see 100 profiles' : 
                userPlan === 'basic' ? 'Upgrade to Premium ($30) to see 100 profiles' : ''}
            </div>
            <a href="profile-upgrade.html" class="btn primary" style="display: inline-block; padding: 12px 24px; text-decoration: none;">
              Upgrade Now
            </a>
          </div>
        `;
        grid.innerHTML += upgradeHTML;
      }
      
    } catch (err) {
      console.error("❌ Error loading profiles:", err);
      grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">Error loading profiles</p>';
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

  // Initial load
  loadProfiles();

  // Auto-refresh every 10 seconds to show updated photos
  setInterval(loadProfiles, 10000);
});