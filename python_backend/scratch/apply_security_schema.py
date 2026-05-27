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
        port=Config.MYSQL_PORT,
        autocommit=True
    )
    
    tables = ['employee', 'vendor_employee', 'clientinformation']
    
    with conn.cursor() as cur:
        for table in tables:
            print(f"Checking {table}...")
            
            # Check if columns exist
            cur.execute(f"SHOW COLUMNS FROM {table} LIKE 'failed_login_attempts'")
            if not cur.fetchone():
                print(f"Adding failed_login_attempts to {table}")
                cur.execute(f"ALTER TABLE {table} ADD COLUMN failed_login_attempts INT DEFAULT 0")
            
            cur.execute(f"SHOW COLUMNS FROM {table} LIKE 'account_locked_until'")
            if not cur.fetchone():
                print(f"Adding account_locked_until to {table}")
                cur.execute(f"ALTER TABLE {table} ADD COLUMN account_locked_until DATETIME NULL")
        
        # Create user_devices
        print("Creating user_devices table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS user_devices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                user_type VARCHAR(50) NOT NULL,
                ip_address VARCHAR(45) NOT NULL,
                device_info TEXT NOT NULL,
                last_login DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create password_history
        print("Creating password_history table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS password_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                user_type VARCHAR(50) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
    print("Schema update complete.")

if __name__ == "__main__":
    main()
