import mysql.connector
from config import Config

def check_vendor_task():
    try:
        conn = mysql.connector.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DB
        )
        cur = conn.cursor(dictionary=True)
        cur.execute("SHOW COLUMNS FROM vendor_task")
        cols = cur.fetchall()
        print("Columns in vendor_task:")
        for col in cols:
            print(col)
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_vendor_task()
