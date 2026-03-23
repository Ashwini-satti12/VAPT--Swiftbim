from db import mysql
from flask import Flask

app = Flask(__name__)
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = '' # Usually empty in local XAMPP
app.config['MYSQL_DB'] = 'swiftbim_swift' # I'll check config.py for the actual name
app.config['MYSQL_CURSORCLASS'] = 'DictCursor'
mysql.init_app(app)

with app.app_context():
    from db import get_db
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DESC projects")
    for row in cur.fetchall():
        print(f"{row['Field']}: {row['Type']}")
