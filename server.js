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

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`DateMe server running on http://localhost:${PORT}`);
});
