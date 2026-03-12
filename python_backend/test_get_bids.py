import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()
conn = mysql.connector.connect(
    host=os.getenv("MYSQL_HOST", "localhost"),
    user=os.getenv("MYSQL_USER", "root"),
    password="root@123",
    database=os.getenv("MYSQL_DB", "snh6_swiftproject"),
    port=int(os.getenv("MYSQL_PORT", 3306))
)
cur = conn.cursor(dictionary=True)
bidding_id = 5

try:
    cur.execute("SELECT * FROM vendor_bids WHERE opportunity_id = %s", (bidding_id,))
    rows = cur.fetchall()
    print(f"Found {len(rows)} bids")

    if rows:
        vendor_ids = [r["vendor_id"] for r in rows]
        placeholders = ",".join(["%s"] * len(vendor_ids))
        query = f"SELECT id, full_name, email, phone_number, user_role FROM vendor_employee WHERE id IN ({placeholders})"
        print("Executing:", query, "with args:", vendor_ids)
        cur.execute(query, vendor_ids)
        emps = cur.fetchall()
        print("Vendor info:", emps)

except Exception as e:
    print("EXCEPTION:", e)

