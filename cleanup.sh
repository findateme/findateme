#!/bin/bash

cd "/Users/tarek/Downloads/NEW DATE ME/NEW DATE ME"

node << 'EOF'
const mysql = require('mysql2/promise');

(async () => {
  const pool = mysql.createPool({
    host: 'srv1733.hstgr.io',
    user: 'u999287469_date_me',
    password: 'Rafayat11799$',
    database: 'u999287469_DateMe'
  });

  try {
    const [latest] = await pool.query('SELECT id, email FROM users ORDER BY created_at DESC LIMIT 1');
    if (latest.length === 0) {
      console.log('No accounts');
      process.exit(0);
    }

    const latestEmail = latest[0].email;
    const [result] = await pool.query('DELETE FROM users WHERE email != ?', [latestEmail]);
    console.log('Deleted ' + result.affectedRows + ' old accounts');
    console.log('Kept latest: ' + latest[0].email);
  } finally {
    await pool.end();
  }
})();
EOF
