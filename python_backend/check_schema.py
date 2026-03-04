from app import create_app
from db import mysql

app = create_app()
with app.app_context():
    cur = mysql.connection.cursor()
    cur.execute("DESCRIBE projects")
    for row in cur.fetchall():
        print(row)
