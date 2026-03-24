import mysql.connector
import os
from werkzeug.security import check_password_hash
from dotenv import load_dotenv

load_dotenv()
conn = mysql.connector.connect(host=os.getenv('MYSQL_HOST','localhost'), user=os.getenv('MYSQL_USER','root'), password='root@123', database='snh6_swiftproject')
cur = conn.cursor(dictionary=True)

email = 'lakshmiprasanna.mine@gmail.com'
password = 'vjr4xRs!dDq2'

cur.execute("SELECT password FROM employee WHERE email=%s", (email,))
row = cur.fetchone()
if row:
    stored = row['password']
    match = check_password_hash(stored, password)
    print(f"User: {email}")
    print(f"Stored Hash: {stored}")
    print(f"Attempt Password: {password}")
    print(f"Match using check_password_hash: {match}")
else:
    print("User not found in employee table")
