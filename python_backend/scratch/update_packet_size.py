import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def update_mysql_packet_size():
    try:
        conn = mysql.connector.connect(
            host=os.getenv("MYSQL_HOST", "localhost"),
            user=os.getenv("MYSQL_USER", "root"),
            password=os.getenv("MYSQL_PASSWORD", ""),
            database=os.getenv("MYSQL_DB", "snh6_swiftproject"),
            port=int(os.getenv("MYSQL_PORT", "3306"))
        )
        cur = conn.cursor()
        
        print("Attempting to set GLOBAL max_allowed_packet to 128MB...")
        try:
            cur.execute("SET GLOBAL max_allowed_packet=134217728")
            print("Successfully set GLOBAL max_allowed_packet to 128MB.")
        except Exception as e:
            print(f"Failed to set GLOBAL max_allowed_packet: {e}")
            print("You may need to manually update your my.ini file (usually under [mysqld] section) and restart MySQL.")

        cur.execute("SHOW VARIABLES LIKE 'max_allowed_packet'")
        result = cur.fetchone()
        print(f"Current session max_allowed_packet: {result}")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error connecting to MySQL: {e}")

if __name__ == "__main__":
    update_mysql_packet_size()
