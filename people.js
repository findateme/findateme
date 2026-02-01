// people.js
document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("grid");
  if (!grid) return;

  async function loadProfiles() {
    // Remove loader
    const loader = document.getElementById("gridLoader");
    if (loader) loader.remove();
    
    console.log("🔄 Loading profiles...");
    
    try {
      // Get current user's plan from localStorage
      const activeEmail = localStorage.getItem("dateme_active_user");
      let userPlan = "free"; // default
      let currentUserGender = ""; // Track current user's gender
      
      if (activeEmail) {
        try {
          // Get user plan (free, basic, premium)
          const hasUpgrade = localStorage.getItem("dateme_upgrade_verified") === "true";
          if (hasUpgrade) {
            userPlan = localStorage.getItem("dateme_selected_plan") || "basic";
          }
          
          // Get current user's gender from localStorage
          const userProfile = JSON.parse(localStorage.getItem("dateme_profile") || "{}");
          currentUserGender = (userProfile.gender || "").toLowerCase();
          console.log("👤 Current user gender:", currentUserGender || "not set");
        } catch (e) {
          console.log("⚠️ Could not load user plan/gender");
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
      
      // Debug: Show first 5 profiles photo status
      profiles.slice(0, 5).forEach((p, i) => {
        console.log(`Profile ${i + 1}: ${p.name || p.email}`, {
          hasPhoto: !!p.photo,
          photoPath: p.photo ? (p.photo.startsWith('data:') ? 'BASE64' : p.photo) : 'NONE',
          photoLength: p.photo ? p.photo.length : 0
        });
      });

      if (profiles.length === 0) {
        console.log("⚠️ No profiles found");
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">No profiles yet. Be the first to join!</p>';
        return;
      }

      // Filter out deleted accounts (those without valid email)
      let validProfiles = profiles.filter(p => p.email && p.email.trim());
      
      // Filter out current user's own profile
      if (activeEmail) {
        validProfiles = validProfiles.filter(p => 
          p.email.toLowerCase() !== activeEmail.toLowerCase()
        );
      }
      
      // Apply gender-based filtering
      if (currentUserGender === "male" || currentUserGender === "female") {
        const targetGender = currentUserGender === "male" ? "female" : "male";
        const beforeFilter = validProfiles.length;
        
        validProfiles = validProfiles.filter(p => {
          const profileGender = (p.gender || "").toLowerCase();
          return profileGender === targetGender;
        });
        
        console.log(`🔍 Gender filter: ${currentUserGender} user → showing ${targetGender} profiles (${beforeFilter} → ${validProfiles.length})`);
      } else {
        console.log("⚠️ Gender not set - showing all profiles");
      }
      
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
        // Photo display logic - show photo if exists (base64 or file URL), otherwise gradient
        const hasPhoto = p.photo && p.photo.trim();
        
        // Debug: Log profiles without photos
        if (!hasPhoto) {
          console.log(`⚠️ No photo for user: ${p.email} (${p.name || 'unnamed'})`);
        }
        
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

  // Auto-refresh every 60 seconds to show updated photos (reduced from 10s to avoid flickering)
  setInterval(loadProfiles, 60000);
});