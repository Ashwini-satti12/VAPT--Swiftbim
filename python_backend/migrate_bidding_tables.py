import os
import sys

# Add backend dir to python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from db import get_db

app = create_app()

with app.app_context():
    main_db = get_db()
    cur = main_db.cursor()
    
    print("Migrating vendor_bidding...")
    cur.execute("CREATE TABLE IF NOT EXISTS snh6_swiftproject.vendor_bidding LIKE new_swiftbim.vendor_bidding;")
    cur.execute("INSERT IGNORE INTO snh6_swiftproject.vendor_bidding SELECT * FROM new_swiftbim.vendor_bidding;")
    
    print("Migrating vendor_bids...")
    cur.execute("CREATE TABLE IF NOT EXISTS snh6_swiftproject.vendor_bids LIKE new_swiftbim.vendor_bids;")
    cur.execute("INSERT IGNORE INTO snh6_swiftproject.vendor_bids SELECT * FROM new_swiftbim.vendor_bids;")
    
    print("Dropping old tables...")
    cur.execute("DROP TABLE IF EXISTS new_swiftbim.vendor_bids;")
    cur.execute("DROP TABLE IF EXISTS new_swiftbim.vendor_bidding;")
    
    main_db.commit()
    print("Done!")
