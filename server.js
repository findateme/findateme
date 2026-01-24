require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

const fetch = global.fetch || require("node-fetch");

const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.TATUM_API_KEY || "";
const TRC20_ADDRESS = process.env.TRC20_ADDRESS || "";
const BEP20_ADDRESS = process.env.BEP20_ADDRESS || "";
const USDT_TRC20_CONTRACT = process.env.USDT_TRC20_CONTRACT || "";
const USDT_BEP20_CONTRACT = process.env.USDT_BEP20_CONTRACT || "";
const UPGRADE_AMOUNT = Number(process.env.UPGRADE_AMOUNT || 8);
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || "";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "",
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4"
});

const app = express();

let profileTableReady = false;
let messagesTableReady = false;

async function ensureProfileTable(){
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS user_profiles (
        email VARCHAR(255) PRIMARY KEY,
        city VARCHAR(120),
        country VARCHAR(120),
        gender VARCHAR(16),
        age INT,
        photo MEDIUMTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`
    );
    profileTableReady = true;
  } catch (err) {
    console.error("user_profiles table error:", err);
    profileTableReady = false;
  }
}

ensureProfileTable();

async function ensureUsersTable(){
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        password_hash VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`
    );
    
    // Add password_hash column if it doesn't exist (migration)
    try {
      await pool.query(
        `ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)`
      );
      console.log("✓ Added password_hash column to users table");
    } catch (e) {
      // Column already exists, ignore error
      if (!String(e.message).includes("Duplicate column")) {
        console.log("✓ password_hash column already exists");
      }
    }
    
    console.log("✓ users table ready");
  } catch (err) {
    console.error("users table error:", err);
  }
}

ensureUsersTable();

async function ensureMessagesTable(){
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender_email VARCHAR(255),
        receiver_email VARCHAR(255),
        body TEXT,
        profile_key VARCHAR(255),
        profile_name VARCHAR(255),
        profile_img MEDIUMTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );
    messagesTableReady = true;
  } catch (err) {
    console.error("messages table error:", err);
    messagesTableReady = false;
  }
}

ensureMessagesTable();

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

if (ALLOW_ORIGIN) {
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", ALLOW_ORIGIN);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });
}

const BLOCKED_PATHS = new Set([
  "/db.php",
  "/config.php",
  "/.env",
  "/.env.example",
  "/server.js",
  "/package.json",
  "/package-lock.json"
]);

app.use((req, res, next) => {
  if (BLOCKED_PATHS.has(req.path)) {
    return res.sendStatus(404);
  }
  next();
});

app.get("/get_users.php", async (_req, res) => {
  try {
    let rows = [];
    try {
      const [joined] = await pool.query(
        `SELECT u.id, u.name, u.username, u.email, u.created_at,
                p.city, p.country, p.gender, p.age, p.photo
         FROM users u
         LEFT JOIN user_profiles p ON p.email = u.email
         ORDER BY u.created_at DESC
         LIMIT 200`
      );
      rows = joined;
    } catch (joinErr) {
      const [fallback] = await pool.query(
        "SELECT id, name, username, email, created_at FROM users ORDER BY created_at DESC LIMIT 200"
      );
      rows = fallback;
    }
    res.json({ ok: true, users: rows });
  } catch (err) {
    console.error("get_users error:", err);
    res.status(500).json({ ok: false, error: "Server error", code: err.code || "UNKNOWN" });
  }
});

app.get("/get_thread.php", async (req, res) => {
  const key = String(req.query.profile_key || "").trim();
  if (!key) {
    return res.status(400).json({ ok: false, error: "Missing profile_key." });
  }
  try {
    const [rows] = await pool.query(
      "SELECT id, sender_email, receiver_email, body, created_at, profile_key, profile_name, profile_img FROM messages WHERE profile_key = ? ORDER BY created_at ASC",
      [key]
    );
    res.json({ ok: true, messages: rows });
  } catch (err) {
    console.error("get_thread error:", err);
    res.status(500).json({ ok: false, error: "Server error", code: err.code || "UNKNOWN" });
  }
});

app.get("/get_messages.php", async (req, res) => {
  const user = String(req.query.email || "").trim();
  if (!user) {
    return res.status(400).json({ ok: false, error: "Missing email." });
  }
  try {
    const [rows] = await pool.query(
      `SELECT id, sender_email, receiver_email, body, created_at,
              profile_key, profile_name, profile_img
       FROM messages
       WHERE sender_email = ? OR receiver_email = ?
       ORDER BY created_at ASC`,
      [user, user]
    );
    res.json({ ok: true, messages: rows });
  } catch (err) {
    console.error("get_messages error:", err);
    res.status(500).json({ ok: false, error: "Server error", code: err.code || "UNKNOWN" });
  }
});

app.post("/send_message.php", async (req, res) => {
  const input = req.body || {};
  const sender = String(input.sender_email || "").trim();
  const receiver = String(input.receiver_email || "").trim();
  const body = String(input.body || "").trim();
  const profile_key = String(input.profile_key || "").trim();
  const profile_name = String(input.profile_name || "").trim();
  const profile_img = String(input.profile_img || "").trim();

  if (!sender || !receiver || !body) {
    return res.status(400).json({ ok: false, error: "Missing fields." });
  }
  try {
    await pool.query(
      "INSERT INTO messages (sender_email, receiver_email, body, profile_key, profile_name, profile_img) VALUES (?, ?, ?, ?, ?, ?)",
      [sender, receiver, body, profile_key, profile_name, profile_img]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("send_message error:", err);
    res.status(500).json({ ok: false, error: "Server error", code: err.code || "UNKNOWN" });
  }
});

app.post("/register_user.php", async (req, res) => {
  const input = req.body || {};
  const name = String(input.name || "").trim();
  const email = String(input.email || "").trim();
  const username = String(input.username || "").trim();
  const city = String(input.city || "").trim();
  const country = String(input.country || "").trim();
  const gender = String(input.gender || "").trim();
  const ageNum = Number(input.age || 0);
  const age = Number.isFinite(ageNum) && ageNum > 0 ? ageNum : null;
  const photo = String(input.photo || "").trim();
  const checkOnly = input.check_only === true;

  if (!email || !username) {
    return res.status(400).json({ ok: false, error: "Missing fields." });
  }
  try {
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1",
      [email, username]
    );
    if (existing.length) {
      return res.status(409).json({ ok: false, error: "Email or username already exists." });
    }
    if (checkOnly) return res.json({ ok: true });
    await pool.query(
      "INSERT INTO users (name, email, username) VALUES (?, ?, ?)",
      [name, email, username]
    );
    if (profileTableReady) {
      try {
        await pool.query(
          `INSERT INTO user_profiles (email, city, country, gender, age, photo)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             city = VALUES(city),
             country = VALUES(country),
             gender = VALUES(gender),
             age = VALUES(age),
             photo = VALUES(photo)`,
          [email, city || null, country || null, gender || null, age, photo || null]
        );
      } catch (profileErr) {
        console.error("register_user profile error:", profileErr);
      }
    }
    res.json({ ok: true });
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ ok: false, error: "Email or username already exists." });
    }
    console.error("register_user error:", err);
    res.status(500).json({ ok: false, error: "Server error", code: err.code || "UNKNOWN" });
  }
});

function toFloat(val) {
  if (Number.isFinite(val)) return Number(val);
  const cleaned = String(val || "").replace(/[^0-9.]/g, "");
  return cleaned ? Number(cleaned) : 0;
}

function amountOk(amount, decimals) {
  let amt = toFloat(amount);
  if (decimals !== undefined && decimals !== null && String(decimals) !== "") {
    amt = amt / Math.pow(10, Number(decimals));
  } else if (amt > 1000000) {
    amt = amt / 1e18;
  }
  return amt >= (UPGRADE_AMOUNT - 0.01);
}

async function tatumGet(url) {
  const resp = await fetch(url, { headers: { "x-api-key": API_KEY } });
  if (!resp.ok) return null;
  return resp.json();
}

async function verifyTrc20(txid) {
  const data = await tatumGet(`https://api.tatum.io/v3/tron/transaction/${encodeURIComponent(txid)}`);
  if (!data) return false;
  const transfers = data.trc20Transfer || data.tokenTransfers || [];
  const receiver = String(TRC20_ADDRESS || "").toLowerCase();
  const contract = String(USDT_TRC20_CONTRACT || "").toLowerCase();

  for (const t of transfers) {
    const to = String(t.to || t.toAddress || "").toLowerCase();
    const addr = String(t.contractAddress || t.contract || "").toLowerCase();
    const amt = t.amount || t.value || 0;
    if (to === receiver && addr === contract && amountOk(amt, t.decimals)) {
      return true;
    }
  }
  return false;
}

async function verifyBep20(txid) {
  const data = await tatumGet(`https://api.tatum.io/v3/bsc/transaction/${encodeURIComponent(txid)}`);
  if (!data) return false;
  const events = await tatumGet(`https://api.tatum.io/v3/bsc/transaction/${encodeURIComponent(txid)}/events`);
  const receiver = String(BEP20_ADDRESS || "").toLowerCase();
  const contract = String(USDT_BEP20_CONTRACT || "").toLowerCase();

  if (Array.isArray(events)) {
    for (const ev of events) {
      const addr = String(ev.address || ev.contract || "").toLowerCase();
      const to = String(ev.to || (ev.data && (ev.data.to || ev.data.toAddress)) || "").toLowerCase();
      const amt = ev.value || (ev.data && (ev.data.value || ev.data.amount)) || 0;
      if (addr === contract && to === receiver && amountOk(amt, ev.data && ev.data.decimals)) {
        return true;
      }
    }
  }
  return false;
}

app.post("/verify_txid.php", async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ ok: false, error: "TATUM API key not set" });
  }
  const txid = String((req.body && req.body.txid) || "").trim();
  const chain = String((req.body && req.body.chain) || "").trim().toUpperCase();
  if (!txid || (chain !== "TRC20" && chain !== "BEP20")) {
    return res.status(400).json({ ok: false, error: "Invalid request" });
  }
  try {
    const ok = chain === "TRC20" ? await verifyTrc20(txid) : await verifyBep20(txid);
    res.json({ ok: !!ok, message: ok ? "Verified" : "Not verified" });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

app.use(express.static(path.join(__dirname)));

// Route root
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Route HTML pages
app.get("/signup.html", (_req, res) => {
  res.sendFile(path.join(__dirname, "signup.html"));
});

app.get("/signup", (_req, res) => {
  res.sendFile(path.join(__dirname, "signup.html"));
});

app.get("/login.html", (_req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.get("/login", (_req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.get("/home.html", (_req, res) => {
  res.sendFile(path.join(__dirname, "home.html"));
});

app.get("/home", (_req, res) => {
  res.sendFile(path.join(__dirname, "home.html"));
});

app.get("/profile.html", (_req, res) => {
  res.sendFile(path.join(__dirname, "profile.html"));
});

app.get("/profile", (_req, res) => {
  res.sendFile(path.join(__dirname, "profile.html"));
});

app.get("/inbox.html", (_req, res) => {
  res.sendFile(path.join(__dirname, "inbox.html"));
});

app.get("/inbox", (_req, res) => {
  res.sendFile(path.join(__dirname, "inbox.html"));
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// ===== USER AUTHENTICATION APIs =====

// REGISTER - নতুন user
app.post("/api/register", async (req, res) => {
  const { email, username, password, name, city, country, gender, age, photo } = req.body;
  
  if (!email || !username || !password) {
    return res.status(400).json({ ok: false, error: "Missing required fields" });
  }

  try {
    // Check if email/username exists
    const [existing] = await pool.query(
      "SELECT email, username FROM users WHERE email = ? OR username = ?",
      [email.toLowerCase(), username.toLowerCase()]
    );

    if (existing.length > 0) {
      return res.status(409).json({ ok: false, error: "Email or username already taken" });
    }

    // Simple password hash (use bcrypt in production!)
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(password + email).digest('hex');

    // Insert user
    await pool.query(
      `INSERT INTO users (email, username, name, password_hash, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [email.toLowerCase(), username.toLowerCase(), name || "", hash]
    );

    // Insert profile
    await pool.query(
      `INSERT INTO user_profiles (email, city, country, gender, age, photo)
       VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE
       city=VALUES(city), country=VALUES(country), gender=VALUES(gender), age=VALUES(age), photo=VALUES(photo)`,
      [email.toLowerCase(), city || "", country || "", gender || "", age || 0, photo || ""]
    );

    res.json({ ok: true, message: "Registration successful", email: email.toLowerCase() });
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// LOGIN - ইউজার লগইন করা
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: "Email and password required" });
  }

  try {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(password + email).digest('hex');

    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.username, u.name,
              p.city, p.country, p.gender, p.age, p.photo
       FROM users u
       LEFT JOIN user_profiles p ON p.email = u.email
       WHERE u.email = ? AND u.password_hash = ?`,
      [email.toLowerCase(), hash]
    );

    if (rows.length === 0) {
      return res.status(401).json({ ok: false, error: "Invalid email or password" });
    }

    res.json({ ok: true, user: rows[0] });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// SEARCH - username দিয়ে search করা
app.get("/api/search", async (req, res) => {
  const username = req.query.username || "";
  
  if (!username || username.length < 2) {
    return res.json({ ok: true, users: [] });
  }

  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.username, u.name,
              p.city, p.country, p.gender, p.age, p.photo
       FROM users u
       LEFT JOIN user_profiles p ON p.email = u.email
       WHERE u.username LIKE ? LIMIT 50`,
      [`%${username}%`]
    );

    res.json({ ok: true, users: rows });
  } catch (err) {
    console.error("search error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// UPDATE PROFILE - প্রোফাইল আপডেট করা
app.put("/api/profile", async (req, res) => {
  const { email, city, country, gender, age, photo } = req.body;
  
  if (!email) {
    return res.status(400).json({ ok: false, error: "Email required" });
  }

  try {
    await pool.query(
      `UPDATE user_profiles 
       SET city=?, country=?, gender=?, age=?, photo=?, updated_at=NOW()
       WHERE email = ?`,
      [city || "", country || "", gender || "", age || 0, photo || "", email.toLowerCase()]
    );

    res.json({ ok: true, message: "Profile updated" });
  } catch (err) {
    console.error("profile update error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Temporary cleanup endpoint - keep only latest account
app.get("/cleanup_old_accounts", async (_req, res) => {
  try {
    const [latest] = await pool.query(
      "SELECT email FROM users ORDER BY created_at DESC LIMIT 1"
    );
    
    if (latest.length === 0) {
      return res.json({ ok: true, message: "No accounts to keep" });
    }
    
    const latestEmail = latest[0].email;
    const [result] = await pool.query(
      "DELETE FROM users WHERE email != ?",
      [latestEmail]
    );
    
    res.json({
      ok: true,
      message: `Deleted ${result.affectedRows} old accounts. Kept: ${latestEmail}`
    });
  } catch (err) {
    console.error("cleanup error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Keep only watson@gmail.com account
app.get("/keep_watson_only", async (_req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM users WHERE email != ?",
      ["watson@gmail.com"]
    );
    
    const [remaining] = await pool.query("SELECT COUNT(*) as count FROM users");
    
    res.json({
      ok: true,
      message: `Deleted ${result.affectedRows} accounts. Kept watson@gmail.com. Remaining users: ${remaining[0].count}`
    });
  } catch (err) {
    console.error("watson cleanup error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ADMIN - Get all registered users
app.get("/api/admin/users", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.username, u.name,
              p.city, p.country, p.gender, p.age, p.photo,
              u.created_at
       FROM users u
       LEFT JOIN user_profiles p ON p.email = u.email
       ORDER BY u.created_at DESC
       LIMIT 1000`
    );

    res.json({ ok: true, users: rows });
  } catch (err) {
    console.error("admin users error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`DateMe server running on http://localhost:${PORT}`);
});
