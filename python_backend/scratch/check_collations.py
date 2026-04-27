import mysql.connector
import os
from dotenv import load_dotenv

# Load .env if it exists
load_dotenv()

def check_collations():
    try:
        host = os.getenv("MYSQL_HOST", "localhost")
        user = os.getenv("MYSQL_USER", "root")
        password = os.getenv("MYSQL_PASSWORD", "root@123")
        db_name = os.getenv("MYSQL_DB", "snh6_swiftproject")
        
        print(f"Connecting to {db_name} as {user}...")
        
        conn = mysql.connector.connect(
            host=host, user=user, password=password, database=db_name
        )
        cur = conn.cursor(dictionary=True)
        
        # Check work_orders collation
        print("\n--- Collation for work_orders.project_name ---")
        cur.execute("SHOW FULL COLUMNS FROM work_orders LIKE 'project_name'")
        print(cur.fetchone())
        
        # Check projects collation
        print("\n--- Collation for projects.project_name ---")
        cur.execute("SHOW FULL COLUMNS FROM projects LIKE 'project_name'")
        print(cur.fetchone())

        # Check vendor_name collation in work_orders
        print("\n--- Collation for work_orders.vendor_name ---")
        cur.execute("SHOW FULL COLUMNS FROM work_orders LIKE 'vendor_name'")
        print(cur.fetchone())

        conn.close()
    except Exception as e:
        print(f"Failed to check collations: {e}")

if __name__ == "__main__":
    check_collations()
