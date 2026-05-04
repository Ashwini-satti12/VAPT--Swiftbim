import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def test_large_packet():
    try:
        conn = mysql.connector.connect(
            host=os.getenv("MYSQL_HOST", "localhost"),
            user=os.getenv("MYSQL_USER", "root"),
            password=os.getenv("MYSQL_PASSWORD", ""),
            database=os.getenv("MYSQL_DB", "snh6_swiftproject"),
            port=int(os.getenv("MYSQL_PORT", "3306"))
        )
        cur = conn.cursor()
        
        # Try to send a 2MB string (previous limit was 1MB)
        large_string = "A" * (2 * 1024 * 1024)
        print("Attempting to execute a query with 2MB of data...")
        
        try:
            # We use a dummy SELECT with a large string
            cur.execute("SELECT LENGTH(%s)", (large_string,))
            result = cur.fetchone()
            print(f"Success! Result length: {result[0]}")
        except Exception as e:
            print(f"Failed to send large packet: {e}")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_large_packet()
