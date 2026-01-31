// auth.js

window.sb = window.sb || supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

async function getUser() {
  const { data } = await sb.auth.getUser();
  return data?.user || null;
}

async function getPaidStatus(userId) {
  const { data, error } = await sb
    .from("profiles")
    .select("paid")
    .eq("id", userId)
    .maybeSingle();

  if (error) return { paid: false, error: error.message };
  return { paid: !!data?.paid, error: null };
}

async function logout() {
  // Set user as offline before logout
  const activeEmail = localStorage.getItem("dateme_active_user");
  if (activeEmail) {
    await updateOnlineStatus(activeEmail, false);
  }
  
  await sb.auth.signOut();
  // ⚠️ DO NOT clear dateme_active_user or dateme_local_pass
  // They should persist for login after days
  localStorage.removeItem("dateme_local_session"); // Only clear session flag, not credentials
  location.href = "login.html";
}

// Update online status helper
async function updateOnlineStatus(email, isOnline) {
  const API_BASE = window.API_BASE || "";
  if (!API_BASE || !email) return;
  
  try {
    await fetch(`${API_BASE}/api/update_online_status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.toLowerCase(),
        is_online: isOnline
      })
    });
  } catch (err) {
    // Silently fail
  }
}

window.DateMeAuth = { getUser, getPaidStatus, logout };

document.addEventListener("DOMContentLoaded", async () => {
  const page = (location.pathname.split("/").pop() || "").toLowerCase();

  // ✅ never gate these pages (future use)
  const neverGate = new Set(["", "index.html", "index", "login.html", "login", "signup.html", "signup"]);

  const userEmailEl = document.getElementById("userEmail");
  const logoutBtn = document.getElementById("logoutBtn");
  const navLogin = document.getElementById("navLogin");
  const navSignup = document.getElementById("navSignup");
  const userAvatar = document.getElementById("userAvatar");

  if (logoutBtn) logoutBtn.onclick = logout;

  const user = await getUser();

  // ===== GUEST UI =====
  if (!user) {
    const localSession = localStorage.getItem("dateme_local_session") === "true";
    const localProfile = (() => {
      try{ return JSON.parse(localStorage.getItem("dateme_profile") || "{}"); }
      catch(e){ return {}; }
    })();
    if (localSession){
      // Verify if user still exists in database
      if (localProfile.email) {
        try {
          const API_BASE = window.API_BASE || "";
          const response = await fetch(`${API_BASE}/get_users.php?t=${Date.now()}`);
          const data = await response.json();
          
          const userExists = data.ok && data.users && data.users.some(u => 
            String(u.email || "").toLowerCase() === localProfile.email.toLowerCase()
          );
          
          if (!userExists) {
            // Account has been deleted - clear all data and redirect to login
            console.log("Account deleted - logging out");
            localStorage.clear();
            sessionStorage.clear();
            if (sb && sb.auth) await sb.auth.signOut();
            location.href = "login.html";
            return;
          }
        } catch (err) {
          console.log("Could not verify user:", err.message);
        }
      }
      
      if (userEmailEl) {
        userEmailEl.textContent = localProfile.email || "Signed in";
        userEmailEl.style.display = "inline-flex";
      }
      if (logoutBtn) logoutBtn.style.display = "inline-flex";
      if (navLogin) navLogin.style.display = "none";
      if (navSignup) navSignup.style.display = "none";
      if (userAvatar && localProfile.email){
        userAvatar.textContent = (localProfile.email[0] || "U").toUpperCase();
      }
      return;
    }
    if (userEmailEl) userEmailEl.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-flex";
    if (navLogin) navLogin.style.display = "inline-flex";
    if (navSignup) navSignup.style.display = "inline-flex";

    if (userAvatar) userAvatar.textContent = "G"; // guest
    if ((page === "home.html" || page === "home") && localStorage.getItem("dateme_signup_flow") === "true"){
      location.href = "signup.html";
      return;
    }
    if (!neverGate.has(page)) {
      location.href = "index.html";
    }
    return; // guest ok
  }

  // ===== LOGGED IN UI =====
  // First verify if user exists in database
  if (user?.email) {
    try {
      const API_BASE = window.API_BASE || "";
      const response = await fetch(`${API_BASE}/get_users.php?t=${Date.now()}`);
      const data = await response.json();
      
      const userExists = data.ok && data.users && data.users.some(u => 
        String(u.email || "").toLowerCase() === user.email.toLowerCase()
      );
      
      if (!userExists) {
        // Account has been deleted from database - force logout
        console.log("Account deleted from database - logging out");
        await sb.auth.signOut();
        localStorage.clear();
        sessionStorage.clear();
        alert("Your account has been deleted. Please sign up again if you'd like to use DateMe.");
        location.href = "login.html";
        return;
      }
    } catch (err) {
      console.log("Could not verify user:", err.message);
    }
  }
  
  if (userEmailEl) {
    userEmailEl.textContent = user.email || "Signed in";
    userEmailEl.style.display = "inline-flex";
  }
  if (logoutBtn) logoutBtn.style.display = "inline-flex";
  if (navLogin) navLogin.style.display = "none";
  if (navSignup) navSignup.style.display = "none";

  // ✅ Avatar letter set
  if (userAvatar && user?.email) {
    userAvatar.textContent = (user.email[0] || "U").toUpperCase();
  }

  const adminEmail = String(window.DATEME_ADMIN_EMAIL || "").toLowerCase();
  const isAdmin = adminEmail && String(user.email || "").toLowerCase() === adminEmail;

  // payment gating disabled for now
});
