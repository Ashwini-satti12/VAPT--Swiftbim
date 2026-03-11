import mysql.connector
import hashlib
import os

from dotenv import load_dotenv
load_dotenv()
conn = mysql.connector.connect(host=os.getenv('MYSQL_HOST','localhost'), user=os.getenv('MYSQL_USER','root'), password='root@123', database='snh6_swiftproject')
cur = conn.cursor(dictionary=True)
cur.execute("SELECT password FROM employee WHERE email='lakshmiprasanna.mine@gmail.com'")
row = cur.fetchone()
if row:
    stored = row['password']
    test = hashlib.md5('vjr4xRs!dDq2'.encode()).hexdigest()
    print(f'Stored: {stored} \nTested: {test} \nMatch: {stored == test}')
else:
    print("User not found.")
