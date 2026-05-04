import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def check_mysql_packet_size():
    try:
        conn = mysql.connector.connect(
            host=os.getenv("MYSQL_HOST", "localhost"),
            user=os.getenv("MYSQL_USER", "root"),
            password=os.getenv("MYSQL_PASSWORD", ""),
            database=os.getenv("MYSQL_DB", "snh6_swiftproject"),
            port=int(os.getenv("MYSQL_PORT", "3306"))
        )
        cur = conn.cursor()
        cur.execute("SHOW VARIABLES LIKE 'max_allowed_packet'")
        result = cur.fetchone()
        print(f"Current max_allowed_packet: {result}")
        
        # Try to increase it globally if possible (often fails due to permissions)
        # try:
        #     cur.execute("SET GLOBAL max_allowed_packet=104857600") # 100MB
        #     print("Successfully attempted to set GLOBAL max_allowed_packet to 100MB")
        # except Exception as e:
        #     print(f"Failed to set GLOBAL max_allowed_packet: {e}")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error connecting to MySQL: {e}")

if __name__ == "__main__":
    check_mysql_packet_size()
