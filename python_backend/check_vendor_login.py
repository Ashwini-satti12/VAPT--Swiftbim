import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

conn_vendor = mysql.connector.connect(
    host=os.getenv("MYSQL_HOST", "localhost"),
    user=os.getenv("MYSQL_USER", "root"),
    password="root@123",
    database="new_swiftbim",
    port=int(os.getenv("MYSQL_PORT", 3306))
)
cur_vendor = conn_vendor.cursor(dictionary=True)

cur_vendor.execute("SELECT id, email, password, status FROM vendor_employee WHERE email = 'lakshmiprasanna.mine@gmail.com'")
row = cur_vendor.fetchone()
if row:
    print(f"Found in vendor_employee: {row}")
else:
    print("Not found in vendor_employee")

cur_vendor.close()
conn_vendor.close()
