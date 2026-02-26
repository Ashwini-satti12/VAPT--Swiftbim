
import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

host = os.getenv("MYSQL_HOST", "localhost")
user = os.getenv("MYSQL_USER", "root")
password = os.getenv("MYSQL_PASSWORD", "")
db = os.getenv("MYSQL_DB", "swiftproject")
port = int(os.getenv("MYSQL_PORT", "3306"))

print(f"Connecting to {host}:{port}, db={db} with user={user}")

try:
    conn = mysql.connector.connect(
        host=host,
        user=user,
        password=password,
        database=db,
        port=port
    )
    print("Connection successful!")
    cur = conn.cursor()
    cur.execute("SHOW TABLES")
    tables = cur.fetchall()
    print(f"Tables in {db}: {[t[0] for t in tables]}")

    if ('employee',) in tables or any('employee' in str(t) for t in tables):
        cur.execute("DESCRIBE employee")
        cols = cur.fetchall()
        print("Columns in employee table:")
        for c in cols:
            print(c)
    else:
        print("Employee table not found!")

    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")

# Check for swiftmanagement too
db2 = "swiftmanagement"
print(f"\nChecking database: {db2}")
try:
    conn = mysql.connector.connect(
        host=host,
        user=user,
        password=password,
        database=db2,
        port=port
    )
    print(f"Connection to {db2} successful!")
    conn.close()
except Exception as e:
    print(f"Error connecting to {db2}: {e}")
