import mysql.connector
import sys

try:
    conn = mysql.connector.connect(
        host="srv1733.hstgr.io",
        user="u999287469_date_me",
        password="Rafayat11799$",
        database="u999287469_DateMe"
    )
    cursor = conn.cursor()
    
    # Get latest account
    cursor.execute("SELECT id, email FROM users ORDER BY created_at DESC LIMIT 1")
    latest = cursor.fetchone()
    
    if not latest:
        print("No accounts found")
        sys.exit(0)
    
    latest_email = latest[1]
    print(f"Keeping: {latest_email}")
    
    # Delete all others
    cursor.execute("DELETE FROM users WHERE email != %s", (latest_email,))
    conn.commit()
    
    print(f"Deleted {cursor.rowcount} old accounts")
    print("✅ Done!")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
