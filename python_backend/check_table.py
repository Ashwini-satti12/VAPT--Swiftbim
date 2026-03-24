import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

# Main DB
try:
    conn = mysql.connector.connect(
        host=os.getenv("MYSQL_HOST"),
        user=os.getenv("MYSQL_USER"),
        password=os.getenv("MYSQL_PASSWORD"),
        database=os.getenv("MYSQL_DB"),
        port=int(os.getenv("MYSQL_PORT", 3306))
    )
    cur = conn.cursor()
    cur.execute("DESCRIBE vendor_employee")
    print("vendor_employee in main DB:")
    for row in cur.fetchall():
        print(row)
except Exception as e:
    print(f"Error in main DB: {e}")

# vendor DB
try:
    conn2 = mysql.connector.connect(
        host=os.getenv("MYSQL_HOST"),
        user=os.getenv("MYSQL_USER"),
        password=os.getenv("MYSQL_PASSWORD"),
        database="new_swiftbim",
        port=int(os.getenv("MYSQL_PORT", 3306))
    )
    cur2 = conn2.cursor()
    cur2.execute("DESCRIBE vendor_employee")
    print("\nvendor_employee in new_swiftbim DB:")
    for row in cur2.fetchall():
        print(row)
except Exception as e:
    print(f"Error in second DB: {e}")

