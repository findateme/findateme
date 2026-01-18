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
  await sb.auth.signOut();
  // ⚠️ DO NOT clear dateme_active_user or dateme_local_pass
  // They should persist for login after days
  localStorage.removeItem("dateme_local_session"); // Only clear session flag, not credentials
  location.href = "login.html";
}

window.DateMeAuth = { getUser, getPaidStatus, logout };

document.addEventListener("DOMContentLoaded", async () => {
  const page = (location.pathname.split("/").pop() || "").toLowerCase();

  // ✅ never gate these pages (future use)
  const neverGate = new Set(["", "index.html", "login.html", "signup.html"]);

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
    if (page === "home.html" && localStorage.getItem("dateme_signup_flow") === "true"){
      location.href = "signup.html";
      return;
    }
    if (!neverGate.has(page)) {
      location.href = "index.html";
    }
    return; // guest ok
  }

  // ===== LOGGED IN UI =====
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
