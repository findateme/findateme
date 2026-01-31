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
const UPGRADE_AMOUNT = Number(process.env.UPGRADE_AMOUNT || 14);
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
        is_online TINYINT DEFAULT 0,
        last_seen TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`
    );
    
    // Add is_online and last_seen columns if they don't exist (migration)
    try {
      await pool.query(
        `ALTER TABLE user_profiles 
         ADD COLUMN is_online TINYINT DEFAULT 0,
         ADD COLUMN last_seen TIMESTAMP NULL`
      );
      console.log("✓ Added online status columns to user_profiles table");
    } catch (e) {
      if (!String(e.message).includes("Duplicate column")) {
        console.log("✓ Online status columns already exist");
      }
    }
    
    profileTableReady = true;
  } catch (err) {
    console.error("user_profiles table error:", err);
    profileTableReady = false;
  }
}

ensureProfileTable();

// Photo History Table
async function ensurePhotoHistoryTable(){
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS photo_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        photo MEDIUMTEXT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX(email),
        INDEX(uploaded_at)
      )`
    );
    console.log("✓ photo_history table ready");
  } catch (err) {
    console.error("photo_history table error:", err);
  }
}

ensurePhotoHistoryTable();

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
        read_status TINYINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );
    // Add read_status column if it doesn't exist (for existing tables)
    try {
      await pool.query(
        `ALTER TABLE messages ADD COLUMN read_status TINYINT DEFAULT 0`
      );
    } catch(err) {
      // Column may already exist, ignore error
    }
    messagesTableReady = true;
  } catch (err) {
    console.error("messages table error:", err);
    messagesTableReady = false;
  }
}

ensureMessagesTable();

async function ensureStoriesTable(){
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS stories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255),
        username VARCHAR(255),
        photo MEDIUMTEXT,
        story_image MEDIUMTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 24 HOUR),
        INDEX idx_expires (expires_at),
        INDEX idx_email (email)
      )`
    );
    console.log("✓ stories table ready");
  } catch (err) {
    console.error("stories table error:", err);
  }
}

ensureStoriesTable();

async function ensureStoryReactionsTable(){
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS story_reactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        story_id INT NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        reaction VARCHAR(10) DEFAULT '👍',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_story_user (story_id, user_email),
        INDEX idx_story (story_id)
      )`
    );
    console.log("✓ story_reactions table ready");
  } catch (err) {
    console.error("story_reactions table error:", err);
  }
}

ensureStoryReactionsTable();

async function ensureStoryCommentsTable(){
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS story_comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        story_id INT NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        username VARCHAR(255),
        user_photo MEDIUMTEXT,
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_story (story_id),
        INDEX idx_created (created_at)
      )`
    );
    console.log("✓ story_comments table ready");
  } catch (err) {
    console.error("story_comments table error:", err);
  }
}

ensureStoryCommentsTable();

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// ✅ CORS middleware - Always enabled for all origins
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); // Allow all origins
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  // Handle OPTIONS preflight request
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  
  next();
});

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
   
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    let rows = [];
    try {
      const [joined] = await pool.query(
        `SELECT u.id, u.email, u.username, u.name, u.created_at,
                COALESCE(p.city, '') as city, 
                COALESCE(p.country, '') as country, 
                COALESCE(p.gender, '') as gender, 
                COALESCE(p.age, 0) as age, 
                COALESCE(p.photo, '') as photo,
                p.is_online, p.last_seen, p.updated_at
         FROM users u
         LEFT JOIN user_profiles p ON p.email = u.email
         ORDER BY u.created_at DESC
         LIMIT 200`
      );
      rows = joined;
      console.log(`✅ Loaded ${rows.length} users with profiles`);
    } catch (joinErr) {
      console.error("JOIN query failed:", joinErr.message);
      // Fallback: return users without profile data
      const [fallback] = await pool.query(
        `SELECT id, name, username, email, created_at,
                '' as city, '' as country, '' as gender, 
                0 as age, '' as photo
         FROM users 
         ORDER BY created_at DESC 
         LIMIT 200`
      );
      rows = fallback;
      console.log(`⚠️ Using fallback query: ${rows.length} users (no profiles)`);
    }
    res.json({ ok: true, users: rows, timestamp: Date.now() });
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
      "INSERT INTO messages (sender_email, receiver_email, body, profile_key, profile_name, profile_img, read_status) VALUES (?, ?, ?, ?, ?, ?, 0)",
      [sender, receiver, body, profile_key, profile_name, profile_img]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("send_message error:", err);
    res.status(500).json({ ok: false, error: "Server error", code: err.code || "UNKNOWN" });
  }
});

app.get("/get_unread_count.php", async (req, res) => {
  const email = String(req.query.email || "").trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ ok: false, error: "Missing email." });
  }
  try {
    const [rows] = await pool.query(
      "SELECT COUNT(*) as count FROM messages WHERE receiver_email = ? AND read_status = 0",
      [email]
    );
    res.json({ ok: true, count: rows[0]?.count || 0 });
  } catch (err) {
    console.error("get_unread_count error:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

app.post("/mark_messages_read.php", async (req, res) => {
  const input = req.body || {};
  const email = String(input.email || "").trim().toLowerCase();
  const sender = String(input.sender || "").trim().toLowerCase();
  
  if (!email) {
    return res.status(400).json({ ok: false, error: "Missing email." });
  }
  try {
    if (sender) {
      await pool.query(
        "UPDATE messages SET read_status = 1 WHERE receiver_email = ? AND sender_email = ? AND read_status = 0",
        [email, sender]
      );
    } else {
      await pool.query(
        "UPDATE messages SET read_status = 1 WHERE receiver_email = ? AND read_status = 0",
        [email]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("mark_messages_read error:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

app.post("/upload_story.php", async (req, res) => {
  const input = req.body || {};
  const email = String(input.email || "").trim();
  const username = String(input.username || "").trim();
  const photo = String(input.photo || "").trim();
  const story_image = String(input.story_image || "").trim();

  if (!email || !story_image) {
    return res.status(400).json({ ok: false, error: "Missing email or story image." });
  }

  try {
    await pool.query("DELETE FROM stories WHERE email = ?", [email]);
    
    await pool.query(
      "INSERT INTO stories (email, username, photo, story_image) VALUES (?, ?, ?, ?)",
      [email, username, photo, story_image]
    );
    
    res.json({ ok: true });
  } catch (err) {
    console.error("upload_story error:", err);
    res.status(500).json({ ok: false, error: "Server error", code: err.code || "UNKNOWN" });
  }
});

app.get("/get_stories.php", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, email, username, photo, story_image, created_at 
       FROM stories 
       WHERE expires_at > NOW()
       ORDER BY created_at DESC`
    );
    res.json({ ok: true, stories: rows });
  } catch (err) {
    console.error("get_stories error:", err);
    res.status(500).json({ ok: false, error: "Server error", code: err.code || "UNKNOWN" });
  }
});

app.post("/delete_story.php", async (req, res) => {
  const input = req.body || {};
  const email = String(input.email || "").trim();
  const story_id = Number(input.story_id || 0);

  if (!email) {
    return res.status(400).json({ ok: false, error: "Missing email." });
  }

  try {
    if (story_id) {
      await pool.query("DELETE FROM stories WHERE id = ? AND email = ?", [story_id, email]);
      await pool.query("DELETE FROM story_reactions WHERE story_id = ?", [story_id]);
      await pool.query("DELETE FROM story_comments WHERE story_id = ?", [story_id]);
    } else {
      const [stories] = await pool.query("SELECT id FROM stories WHERE email = ?", [email]);
      for (const story of stories) {
        await pool.query("DELETE FROM story_reactions WHERE story_id = ?", [story.id]);
        await pool.query("DELETE FROM story_comments WHERE story_id = ?", [story.id]);
      }
      await pool.query("DELETE FROM stories WHERE email = ?", [email]);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("delete_story error:", err);
    res.status(500).json({ ok: false, error: "Server error", code: err.code || "UNKNOWN" });
  }
});

app.post("/toggle_story_reaction.php", async (req, res) => {
  const input = req.body || {};
  const story_id = Number(input.story_id || 0);
  const user_email = String(input.user_email || "").trim();
  const reaction = String(input.reaction || "👍").trim();

  if (!story_id || !user_email) {
    return res.status(400).json({ ok: false, error: "Missing story_id or user_email." });
  }

  try {
    const [existing] = await pool.query(
      "SELECT id FROM story_reactions WHERE story_id = ? AND user_email = ?",
      [story_id, user_email]
    );

    if (existing.length > 0) {
      await pool.query(
        "DELETE FROM story_reactions WHERE story_id = ? AND user_email = ?",
        [story_id, user_email]
      );
      res.json({ ok: true, action: "removed" });
    } else {
      await pool.query(
        "INSERT INTO story_reactions (story_id, user_email, reaction) VALUES (?, ?, ?)",
        [story_id, user_email, reaction]
      );
      res.json({ ok: true, action: "added" });
    }
  } catch (err) {
    console.error("toggle_story_reaction error:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

app.get("/get_story_reactions.php", async (req, res) => {
  const story_id = Number(req.query.story_id || 0);

  if (!story_id) {
    return res.status(400).json({ ok: false, error: "Missing story_id." });
  }

  try {
    const [rows] = await pool.query(
      "SELECT user_email, reaction, created_at FROM story_reactions WHERE story_id = ? ORDER BY created_at DESC",
      [story_id]
    );
    res.json({ ok: true, reactions: rows, count: rows.length });
  } catch (err) {
    console.error("get_story_reactions error:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

app.post("/add_story_comment.php", async (req, res) => {
  const input = req.body || {};
  const story_id = Number(input.story_id || 0);
  const user_email = String(input.user_email || "").trim();
  const username = String(input.username || "").trim();
  const user_photo = String(input.user_photo || "").trim();
  const comment = String(input.comment || "").trim();

  if (!story_id || !user_email || !comment) {
    return res.status(400).json({ ok: false, error: "Missing required fields." });
  }

  try {
    await pool.query(
      "INSERT INTO story_comments (story_id, user_email, username, user_photo, comment) VALUES (?, ?, ?, ?, ?)",
      [story_id, user_email, username, user_photo, comment]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("add_story_comment error:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

app.get("/get_story_comments.php", async (req, res) => {
  const story_id = Number(req.query.story_id || 0);

  if (!story_id) {
    return res.status(400).json({ ok: false, error: "Missing story_id." });
  }

  try {
    const [rows] = await pool.query(
      "SELECT id, user_email, username, user_photo, comment, created_at FROM story_comments WHERE story_id = ? ORDER BY created_at ASC",
      [story_id]
    );
    res.json({ ok: true, comments: rows, count: rows.length });
  } catch (err) {
    console.error("get_story_comments error:", err);
    res.status(500).json({ ok: false, error: "Server error" });
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
      const userObj = {
        id: email.toLowerCase(),
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        name: name || "",
        city: city || "",
        country: country || "",
        gender: gender || "",
        age: Number(age) || 0,
        photo: photo || ""
      };
      res.json({ ok: true, message: "Registration successful", email: email.toLowerCase(), user: userObj });
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

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

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


app.post("/api/register", async (req, res) => {
  const { email, username, password, name, city, country, gender, age, photo } = req.body;
  
  console.log("📝 Registration request:", { 
    email, 
    username, 
    name, 
    hasPhoto: !!photo, 
    photoLength: photo ? photo.length : 0 
  });
  
  if (!email || !username || !password) {
    return res.status(400).json({ ok: false, error: "Missing required fields" });
  }

  try {
    const [existing] = await pool.query(
      "SELECT email, username FROM users WHERE email = ? OR username = ?",
      [email.toLowerCase(), username.toLowerCase()]
    );

    if (existing.length > 0) {
      return res.status(409).json({ ok: false, error: "Email or username already taken" });
    }

    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(password + email).digest('hex');

    await pool.query(
      `INSERT INTO users (email, username, name, password_hash, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [email.toLowerCase(), username.toLowerCase(), name || "", hash]
    );

    console.log("✅ User created in users table");

    await pool.query(
      `INSERT INTO user_profiles (email, city, country, gender, age, photo)
       VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE
       city=VALUES(city), country=VALUES(country), gender=VALUES(gender), age=VALUES(age), photo=VALUES(photo)`,
      [email.toLowerCase(), city || "", country || "", gender || "", age || 0, photo || ""]
    );
    
    console.log("✅ Profile saved with photo:", !!photo);

        const userObj = {
          id: email.toLowerCase(),
          email: email.toLowerCase(),
          username: username.toLowerCase(),
          name: name || "",
          city: city || "",
          country: country || "",
          gender: gender || "",
          age: Number(age) || 0,
          photo: photo || ""
        };

        res.json({ ok: true, message: "Registration successful", email: email.toLowerCase(), user: userObj });
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});


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
      const [deletedCheck] = await pool.query(
        "SELECT email FROM users WHERE email = ?",
        [email.toLowerCase()]
      );
      
      if (deletedCheck.length === 0) {
        return res.status(401).json({ 
          ok: false, 
          error: "Invalid email or password. If you deleted your account, please sign up again."
        });
      }
      
      return res.status(401).json({ ok: false, error: "Invalid password" });
    }

    res.json({ ok: true, user: rows[0] });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

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

app.put("/api/profile", async (req, res) => {
  const { email, city, country, gender, age, photo } = req.body;
  
  if (!email) {
    return res.status(400).json({ ok: false, error: "Email required" });
  }

  try {
    if (photo && photo.trim()) {
      try {
        const [current] = await pool.query(
          "SELECT photo FROM user_profiles WHERE email = ?",
          [email.toLowerCase()]
        );
        
        if (current.length > 0 && current[0].photo && current[0].photo.trim()) {
          await pool.query(
            "INSERT INTO photo_history (email, photo) VALUES (?, ?)",
            [email.toLowerCase(), current[0].photo]
          );
        }
      } catch (historyErr) {
        console.log("Photo history save error (continuing):", historyErr.message);
      }
    }
    
    await pool.query(
      `UPDATE user_profiles 
       SET city=?, country=?, gender=?, age=?, photo=?, updated_at=NOW()
       WHERE email = ?`,
      [city || "", country || "", gender || "", age || 0, photo || "", email.toLowerCase()]
    );

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.json({ 
      ok: true, 
      message: "Profile updated successfully",
      timestamp: Date.now()
    });
  } catch (err) {
    console.error("profile update error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/photo_history", async (req, res) => {
  const email = String(req.query.email || "").trim().toLowerCase();
  
  if (!email) {
    return res.status(400).json({ ok: false, error: "Email required" });
  }

  try {
    const [photos] = await pool.query(
      `SELECT id, photo, uploaded_at 
       FROM photo_history 
       WHERE email = ? 
       ORDER BY uploaded_at DESC 
       LIMIT 50`,
      [email]
    );

    res.json({ ok: true, photos: photos });
  } catch (err) {
    console.error("photo history error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/set_photo_from_history", async (req, res) => {
  const { email, photo_id } = req.body;
  
  if (!email || !photo_id) {
    return res.status(400).json({ ok: false, error: "Email and photo_id required" });
  }

  try {
    const [historyPhoto] = await pool.query(
      "SELECT photo FROM photo_history WHERE id = ? AND email = ?",
      [photo_id, email.toLowerCase()]
    );

    if (historyPhoto.length === 0) {
      return res.status(404).json({ ok: false, error: "Photo not found in history" });
    }

    const [current] = await pool.query(
      "SELECT photo FROM user_profiles WHERE email = ?",
      [email.toLowerCase()]
    );

    if (current.length > 0 && current[0].photo && current[0].photo.trim()) {
      await pool.query(
        "INSERT INTO photo_history (email, photo) VALUES (?, ?)",
        [email.toLowerCase(), current[0].photo]
      );
    }

    await pool.query(
      "UPDATE user_profiles SET photo = ?, updated_at = NOW() WHERE email = ?",
      [historyPhoto[0].photo, email.toLowerCase()]
    );

    res.json({ 
      ok: true, 
      message: "Photo updated successfully",
      timestamp: Date.now()
    });
  } catch (err) {
    console.error("set photo from history error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete("/api/delete_history_photo", async (req, res) => {
  const { email, photo_id } = req.body;
  
  if (!email || !photo_id) {
    return res.status(400).json({ ok: false, error: "Email and photo_id required" });
  }

  try {
    const [result] = await pool.query(
      "DELETE FROM photo_history WHERE id = ? AND email = ?",
      [photo_id, email.toLowerCase()]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: "Photo not found" });
    }

    res.json({ 
      ok: true, 
      message: "Photo deleted successfully"
    });
  } catch (err) {
    console.error("delete history photo error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/update_online_status", async (req, res) => {
  const { email, is_online } = req.body;
  
  if (!email) {
    return res.status(400).json({ ok: false, error: "Email required" });
  }

  try {
    const status = is_online ? 1 : 0;
    await pool.query(
      `UPDATE user_profiles 
       SET is_online=?, last_seen=NOW(), updated_at=NOW()
       WHERE email = ?`,
      [status, email.toLowerCase()]
    );

    res.json({ ok: true, message: "Online status updated" });
  } catch (err) {
    console.error("online status update error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/verify_user", async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ ok: false, error: "Email required" });
  }

  try {
    const emailLower = email.toLowerCase();
    const [rows] = await pool.query(
      "SELECT email, name, username FROM users WHERE email = ? LIMIT 1",
      [emailLower]
    );
    
    if (rows.length === 0) {
      return res.json({ ok: false, exists: false, error: "Account has been deleted" });
    }
    
    res.json({ ok: true, exists: true, user: rows[0] });
  } catch (err) {
    console.error("verify user error:", err);
    res.status(500).json({ ok: false, error: "Failed to verify user" });
  }
});

app.delete("/api/delete_account", async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ ok: false, error: "Email required" });
  }

  try {
    const emailLower = email.toLowerCase();
    
    console.log("🗑️ Starting permanent deletion for:", emailLower);
    
    try {
      const photoResult = await pool.query("DELETE FROM photo_history WHERE email = ?", [emailLower]);
      console.log(`  ✓ Deleted ${photoResult.affectedRows || 0} photo history records`);
    } catch (e) {
      console.log("  ⚠️ Could not delete photo_history:", e.message);
    }
    
    try {
      const msgResult = await pool.query(
        "DELETE FROM messages WHERE sender_email = ? OR receiver_email = ?",
        [emailLower, emailLower]
      );
      console.log(`  ✓ Deleted ${msgResult.affectedRows || 0} messages`);
    } catch (e) {
      console.log("  ⚠️ Could not delete messages:", e.message);
    }
    
    try {
      const storyResult = await pool.query("DELETE FROM stories WHERE email = ?", [emailLower]);
      console.log(`  ✓ Deleted ${storyResult.affectedRows || 0} stories`);
    } catch (e) {
      console.log("  ⚠️ Could not delete stories:", e.message);
    }
    
    const profileResult = await pool.query("DELETE FROM user_profiles WHERE email = ?", [emailLower]);
    console.log(`  ✓ Deleted ${profileResult.affectedRows || 0} profile records`);
    
    const userResult = await pool.query("DELETE FROM users WHERE email = ?", [emailLower]);
    console.log(`  ✓ Deleted ${userResult.affectedRows || 0} user accounts`);
    
    console.log("✅ Account permanently deleted from database:", emailLower);

    res.json({ ok: true, message: "Account permanently deleted from all database tables" });
  } catch (err) {
    console.error("delete account error:", err);
    res.status(500).json({ ok: false, error: "Failed to delete account" });
  }
});

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
