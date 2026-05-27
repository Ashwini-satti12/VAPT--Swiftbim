import mysql.connector
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import Config

def main():
    conn = mysql.connector.connect(
        host=Config.MYSQL_HOST,
        user=Config.MYSQL_USER,
        password=Config.MYSQL_PASSWORD,
        database=Config.MYSQL_DB,
        port=Config.MYSQL_PORT
    )
    
    with conn.cursor(dictionary=True) as cur:
        print("\n--- Schema for login_data ---")
        try:
            cur.execute("DESCRIBE login_data")
            columns = cur.fetchall()
            for col in columns:
                print(f"{col['Field']} - {col['Type']}")
        except Exception as e:
            print(f"Error describing login_data: {e}")

if __name__ == "__main__":
    main()
