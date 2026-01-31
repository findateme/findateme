// Manual Database User Delete Script
// Run: node manual_delete_user.js

require('dotenv').config();
const mysql = require('mysql2/promise');

const USER_EMAIL_TO_DELETE = "test@example.com"; // ← CHANGE THIS

(async function() {
  try {
    console.log("🔌 Connecting to database...");
    
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    const email = USER_EMAIL_TO_DELETE.toLowerCase();
    
    console.log(`\n🗑️  Deleting user: ${email}\n`);

    // 1. Delete photo history
    const [photo] = await pool.query("DELETE FROM photo_history WHERE email = ?", [email]);
    console.log(`  ✓ Deleted ${photo.affectedRows} photo history records`);

    // 2. Delete messages
    const [msgs] = await pool.query(
      "DELETE FROM messages WHERE sender_email = ? OR receiver_email = ?",
      [email, email]
    );
    console.log(`  ✓ Deleted ${msgs.affectedRows} messages`);

    // 3. Delete stories
    const [stories] = await pool.query("DELETE FROM stories WHERE email = ?", [email]);
    console.log(`  ✓ Deleted ${stories.affectedRows} stories`);

    // 4. Delete user profile
    const [profile] = await pool.query("DELETE FROM user_profiles WHERE email = ?", [email]);
    console.log(`  ✓ Deleted ${profile.affectedRows} user profiles`);

    // 5. Delete user account
    const [user] = await pool.query("DELETE FROM users WHERE email = ?", [email]);
    console.log(`  ✓ Deleted ${user.affectedRows} user accounts`);

    console.log(`\n✅ User ${email} completely deleted from database!\n`);
    
    await pool.end();
    process.exit(0);
    
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
})();
