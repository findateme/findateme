// fix-photo-paths.js - Clean up invalid photo paths in database
require("dotenv").config();
const mysql = require("mysql2/promise");

async function fixPhotoPaths() {
  console.log("🔧 Starting photo path cleanup...\n");

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  try {
    // 1. Find all users with invalid /assets/ photo paths
    const [usersWithAssets] = await pool.query(
      `SELECT email, photo 
       FROM user_profiles 
       WHERE photo LIKE '/assets/%' OR photo LIKE 'assets/%'`
    );

    console.log(`📊 Found ${usersWithAssets.length} users with invalid /assets/ photo paths\n`);

    if (usersWithAssets.length > 0) {
      console.log("Users with invalid paths:");
      usersWithAssets.forEach((u, i) => {
        console.log(`  ${i + 1}. ${u.email} - ${u.photo}`);
      });
      console.log("");
    }

    // 2. Clear invalid photo paths (set to empty string)
    const [result] = await pool.query(
      `UPDATE user_profiles 
       SET photo = '' 
       WHERE photo LIKE '/assets/%' OR photo LIKE 'assets/%'`
    );

    console.log(`✅ Cleared ${result.affectedRows} invalid photo paths\n`);

    // 3. Check remaining valid photos
    const [validPhotos] = await pool.query(
      `SELECT email, photo 
       FROM user_profiles 
       WHERE photo IS NOT NULL 
       AND photo != '' 
       AND photo NOT LIKE '/assets/%' 
       AND photo NOT LIKE 'assets/%'
       LIMIT 10`
    );

    console.log(`📸 Sample of ${validPhotos.length} users with valid photos:`);
    validPhotos.forEach((u, i) => {
      const photoType = u.photo.startsWith('data:image') ? 'BASE64' : u.photo;
      console.log(`  ${i + 1}. ${u.email} - ${photoType.substring(0, 60)}...`);
    });

    // 4. Summary
    const [summary] = await pool.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN photo IS NULL OR photo = '' THEN 1 ELSE 0 END) as no_photo,
        SUM(CASE WHEN photo LIKE 'data:image%' THEN 1 ELSE 0 END) as base64_photos,
        SUM(CASE WHEN photo LIKE '/uploads/%' THEN 1 ELSE 0 END) as file_photos
       FROM user_profiles`
    );

    console.log("\n📊 Database Summary:");
    console.log(`  Total users: ${summary[0].total}`);
    console.log(`  No photo: ${summary[0].no_photo}`);
    console.log(`  BASE64 photos: ${summary[0].base64_photos}`);
    console.log(`  File-based photos: ${summary[0].file_photos}`);

    console.log("\n✅ Photo path cleanup completed!");

  } catch (err) {
    console.error("❌ Error:", err.message);
    throw err;
  } finally {
    await pool.end();
  }
}

// Run the script
fixPhotoPaths()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
