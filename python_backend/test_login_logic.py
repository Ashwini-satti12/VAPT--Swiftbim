
import hashlib
import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

def md5_hash(text):
    return hashlib.md5(text.encode()).hexdigest()

host = os.getenv("MYSQL_HOST", "localhost")
user = os.getenv("MYSQL_USER", "root")
password = os.getenv("MYSQL_PASSWORD", "root@123")
db = os.getenv("MYSQL_DB", "snh6_swiftproject")
port = int(os.getenv("MYSQL_PORT", "3306"))

print(f"Testing login logic with db={db}...")

try:
    conn = pymysql.connect(
        host=host,
        user=user,
        password=password,
        database=db,
        port=port,
        cursorclass=pymysql.cursors.DictCursor
    )
    email = "admin@example.com" # Just a guess
    print(f"Checking email: {email}")
    
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM employee")
        rows = cur.fetchall()
        print(f"Found {len(rows)} employees.")
        if rows:
            print("First employee sample:", {k: v for k, v in rows[0].items() if k in ['id', 'email', 'full_name', 'Company_id']})
            
    conn.close()
except Exception as e:
    print(f"Error: {e}")
