import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

conn = mysql.connector.connect(
    host=os.getenv("MYSQL_HOST", "localhost"),
    user=os.getenv("MYSQL_USER", "root"),
    password="root@123",
    database="new_swiftbim",
    port=int(os.getenv("MYSQL_PORT", 3306))
)
cur = conn.cursor(dictionary=True)

cur.execute("DESCRIBE users")
cols = cur.fetchall()
print("Columns in users:")
for c in cols:
    print(c['Field'], c['Type'])
    
cur.execute("SELECT id, email, role FROM users LIMIT 5")
rows = cur.fetchall()
print("\nSample rows:")
for r in rows:
    print(r)

