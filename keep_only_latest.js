const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "srv1733.hstgr.io",
  user: "u999287469_date_me",
  password: "Rafayat11799$",
  database: "u999287469_DateMe",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function deleteOldAccounts() {
  try {
    // Get latest account
    const [latest] = await pool.query(
      "SELECT id, name, email FROM users ORDER BY created_at DESC LIMIT 1"
    );

    if (latest.length === 0) {
      console.log("No accounts found");
      await pool.end();
      return;
    }

    const latestUser = latest[0];
    console.log("Latest account (KEEPING):");
    console.log(`- ID: ${latestUser.id}, Name: ${latestUser.name}, Email: ${latestUser.email}`);

    // Get all other accounts
    const [others] = await pool.query(
      "SELECT id, name, email FROM users WHERE id != ? ORDER BY created_at DESC",
      [latestUser.id]
    );

    if (others.length > 0) {
      console.log(`\nAccounts to DELETE (${others.length} accounts):`);
      others.forEach((u) => {
        console.log(`- ID: ${u.id}, Name: ${u.name}, Email: ${u.email}`);
      });

      const otherEmails = others.map((u) => u.email);
      const placeholders = otherEmails.map(() => "?").join(",");

      // Delete from user_profiles first
      const [profileResult] = await pool.query(
        `DELETE FROM user_profiles WHERE email IN (${placeholders})`,
        otherEmails
      );
      console.log(`\nDeleted ${profileResult.affectedRows} profiles`);

      // Delete users
      const [deleteResult] = await pool.query(
        `DELETE FROM users WHERE email IN (${placeholders})`,
        otherEmails
      );
      console.log(`Deleted ${deleteResult.affectedRows} user accounts`);
      console.log("\n✅ Done! Only the latest account remains.");
    } else {
      console.log("\n✅ Only one account exists (the latest one)");
    }

    await pool.end();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

deleteOldAccounts();
