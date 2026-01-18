const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "srv1733.hstgr.io",
  user: "u999287469_date_me",
  password: "Rafayat11799$",
  database: "u999287469_DateMe"
});

(async () => {
  try {
    const [allUsers] = await pool.query("SELECT id, name, email FROM users");
    console.log("All users before deletion:");
    allUsers.forEach(u => console.log(`- ${u.email}: ${u.name}`));
    
    const [result] = await pool.query(
      "DELETE FROM users WHERE email != ?",
      ["watson@gmail.com"]
    );
    
    console.log(`\n✅ Deleted ${result.affectedRows} accounts`);
    
    const [remaining] = await pool.query("SELECT * FROM users");
    console.log(`✅ Remaining: ${remaining.length} user`);
    console.log(`✅ Kept: watson@gmail.com`);
    
    await pool.end();
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
})();
