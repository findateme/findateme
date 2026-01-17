// landing-auth.js
window.sb = window.sb || supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", async () => {
  // already logged in? go to home (gate will redirect to upgrade if unpaid)
  const { data } = await sb.auth.getUser();
  if (data?.user) location.href = "home.html";

  const form = document.getElementById("landingLoginForm");
  const msg = document.getElementById("msg");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";
    msg.className = "msg muted";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      msg.textContent = error.message;
      msg.className = "msg err";
      return;
    }

    msg.textContent = "Logged in ✅ Redirecting...";
    msg.className = "msg ok";
    setTimeout(() => (location.href = "home.html"), 600);
  });
});
