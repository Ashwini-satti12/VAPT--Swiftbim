import mysql.connector
import os

# We try to get credentials from environment or common config locations
# For this scratch script, we will try to connect to the DB directly if possible.

# Based on db.py:
# current_app.config['MYSQL_HOST'] etc.

def check_db():
    try:
        # These are common defaults in this codebase based on previous context
        host = "localhost"
        user = "root"
        password = "root@123"
        db_name = "snh6_swiftproject"
        
        print(f"Connecting to {db_name} as {user}...")
        
        conn = mysql.connector.connect(
            host=host, user=user, password=password, database=db_name
        )
        cur = conn.cursor(dictionary=True)
        
        print("\n--- Projects table (Sample) ---")
        cur.execute("SELECT id, project_name, currency, budget FROM projects WHERE project_name LIKE '%Testing full name%'")
        for row in cur.fetchall():
            print(row)
            
        print("\n--- Vendor Bidding table (Sample) ---")
        cur.execute("SELECT id, project_id, project_name, currency, outsource_budget FROM vendor_bidding WHERE project_name LIKE '%Testing full name%'")
        for row in cur.fetchall():
            print(row)
            
        print("\n--- Vendor Bids table (Sample) ---")
        cur.execute("SELECT vb.id, vb.opportunity_id, vb.bid_amount, vb.bid_currency, vbi.project_name FROM vendor_bids vb JOIN vendor_bidding vbi ON vbi.id = vb.opportunity_id WHERE vbi.project_name LIKE '%Testing full name%'")
        for row in cur.fetchall():
            print(row)

        conn.close()
    except Exception as e:
        print(f"Failed to check DB: {e}")

if __name__ == "__main__":
    check_db()
