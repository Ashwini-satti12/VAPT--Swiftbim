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
test_password = "vjr4xRs!dDq2"

cur.execute("SELECT * FROM vendor_employee WHERE email = %s", (test_email,))
row = cur.fetchone()

if not row:
    print(f"User {test_email} not found in vendor_employee")
else:
    print(f"Found user. Checking password string...")
    stored_password = row.get("password")
    hashed_attempt = hashlib.md5(test_password.encode()).hexdigest()
    if hashed_attempt == stored_password:
        print("Password Match!")
    else:
        print(f"PASSWORD MISMATCH:\nStored Hash: {stored_password}\nGenerated:   {hashed_attempt}")
