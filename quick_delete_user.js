// Quick Delete User from Database
// Usage: node quick_delete_user.js email@example.com

require('dotenv').config();
const mysql = require('mysql2/promise');

const emailToDelete = process.argv[2];

if (!emailToDelete) {
  console.log("\n❌ Usage: node quick_delete_user.js email@example.com\n");
  process.exit(1);
}

(async function() {
  try {
    console.log("\n🔌 Connecting to database...");
    
    const pool = mysql.createPool({
      host: process.env.DB_HOST || "srv1733.hstgr.io",
      user: process.env.DB_USER || "u999287469_DateMe",
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "u999287469_DateMe",
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    const email = emailToDelete.toLowerCase();
    
    console.log(`\n🗑️  Deleting: ${email}\n`);

    // Delete in correct order (foreign keys)
    
    // 1. Photo history
    try {
      const [photo] = await pool.query("DELETE FROM photo_history WHERE email = ?", [email]);
      console.log(`  ✓ Photo history: ${photo.affectedRows} deleted`);
    } catch (e) {
      console.log(`  - Photo history: table not found or error`);
    }

    // 2. Messages
    try {
      const [msgs] = await pool.query(
        "DELETE FROM messages WHERE sender_email = ? OR receiver_email = ?",
        [email, email]
      );
      console.log(`  ✓ Messages: ${msgs.affectedRows} deleted`);
    } catch (e) {
      console.log(`  - Messages: table not found or error`);
    }

    // 3. Stories
    try {
      const [stories] = await pool.query("DELETE FROM stories WHERE email = ?", [email]);
      console.log(`  ✓ Stories: ${stories.affectedRows} deleted`);
    } catch (e) {
      console.log(`  - Stories: table not found or error`);
    }

    // 4. User profile
    const [profile] = await pool.query("DELETE FROM user_profiles WHERE email = ?", [email]);
    console.log(`  ✓ User profiles: ${profile.affectedRows} deleted`);

    // 5. User account (MAIN)
    const [user] = await pool.query("DELETE FROM users WHERE email = ?", [email]);
    console.log(`  ✓ User accounts: ${user.affectedRows} deleted`);

    if (user.affectedRows === 0) {
      console.log(`\n⚠️  No user found with email: ${email}`);
    } else {
      console.log(`\n✅ SUCCESS! User ${email} completely deleted!\n`);
    }
    
    await pool.end();
    process.exit(0);
    
  } catch (err) {
    console.error("\n❌ ERROR:", err.message);
    console.error("Stack:", err.stack);
    process.exit(1);
  }
})();
