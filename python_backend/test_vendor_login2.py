import mysql.connector
import os
import hashlib
from dotenv import load_dotenv

load_dotenv()

# Simulate the exact logic in auth.py
conn_main = mysql.connector.connect(
    host=os.getenv("MYSQL_HOST", "localhost"),
    user=os.getenv("MYSQL_USER", "root"),
    password="root@123",
    database=os.getenv("MYSQL_DB", "snh6_swiftproject"),
    port=int(os.getenv("MYSQL_PORT", 3306))
)
cur = conn_main.cursor(dictionary=True)

test_email = "lakshmiprasanna.mine@gmail.com"

# Check everywhere
print("--- Checking employee table ---")
cur.execute("SELECT id, email, user_type FROM employee WHERE email = %s", (test_email,))
for r in cur.fetchall():
    print(r)
    
print("--- Checking vendor_employee table ---")
cur.execute("SELECT id, email FROM vendor_employee WHERE email = %s", (test_email,))
for r in cur.fetchall():
    print(r)
