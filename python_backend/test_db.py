from db import get_db
from flask import Flask
from dotenv import load_dotenv
import os
import pymysql.cursors

load_dotenv()

conn = pymysql.connect(
    host=os.getenv("MYSQL_HOST", "localhost"),
    user=os.getenv("MYSQL_USER", "root"),
    password=os.getenv("MYSQL_PASSWORD", "root"),
    database=os.getenv("MYSQL_DB", "snh6_swiftproject"),
    cursorclass=pymysql.cursors.DictCursor
)

with conn.cursor() as cursor:
    cursor.execute("SELECT * FROM employee")
    rows = cursor.fetchall()
    print("Total employees:", len(rows))
    print("Employee 1:", rows[0] if rows else None)
