import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

# Main DB (for employee table)
conn_main = mysql.connector.connect(
    host=os.getenv("MYSQL_HOST", "localhost"),
    user=os.getenv("MYSQL_USER", "root"),
    password="root@123",
    database=os.getenv("MYSQL_DB", "snh6_swiftproject"),
    port=int(os.getenv("MYSQL_PORT", 3306))
)
cur_main = conn_main.cursor(dictionary=True)

cur_main.execute("SELECT id, full_name, user_type FROM employee WHERE user_type LIKE '%vendor%'")
vendors = cur_main.fetchall()
print(f"Found {len(vendors)} vendors in employee table:")
for v in vendors:
    print(v)

