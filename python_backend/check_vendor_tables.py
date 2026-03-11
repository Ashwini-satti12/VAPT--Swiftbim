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
cur = conn.cursor()

cur.execute("SHOW TABLES")
tables = cur.fetchall()
print("Tables in new_swiftbim:")
for t in tables:
    print(t[0])

