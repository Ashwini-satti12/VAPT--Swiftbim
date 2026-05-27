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
    
    tables_to_check = ['employee', 'vendor_employee', 'clientinformation']
    
    with conn.cursor(dictionary=True) as cur:
        # Check tables
        cur.execute("SHOW TABLES")
        tables = [list(row.values())[0] for row in cur.fetchall()]
        print("Existing tables:", tables)
        
        for table in tables_to_check:
            if table in tables:
                print(f"\n--- Schema for {table} ---")
                cur.execute(f"DESCRIBE {table}")
                columns = cur.fetchall()
                for col in columns:
                    print(f"{col['Field']} - {col['Type']}")
                
            else:
                print(f"\nTable {table} not found.")
                
        # Look for any device or password history tables
        print("\n--- Other relevant tables ---")
        for table in tables:
            if 'device' in table.lower() or 'password' in table.lower() or 'login' in table.lower() or 'auth' in table.lower() or 'attempt' in table.lower() or 'lock' in table.lower():
                print(f"Found table: {table}")

if __name__ == "__main__":
    main()
