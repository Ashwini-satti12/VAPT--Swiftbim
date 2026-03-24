import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

# Main DB (for employee table)
conn_main = mysql.connector.connect(
    host=os.getenv("MYSQL_HOST", "localhost"),
    user=os.getenv("MYSQL_USER", "root"),
    password="root@123",
    database=os.getenv("MYSQL_DB", "snh6_swiftproject"),
    port=int(os.getenv("MYSQL_PORT", 3306))
)
cur_main = conn_main.cursor(dictionary=True)

# Vendor DB (for vendor_employee)
conn_vendor = mysql.connector.connect(
    host=os.getenv("MYSQL_HOST", "localhost"),
    user=os.getenv("MYSQL_USER", "root"),
    password="root@123",
    database="new_swiftbim",
    port=int(os.getenv("MYSQL_PORT", 3306))
)
cur_vendor = conn_vendor.cursor(dictionary=True)

try:
    # Get all vendors from employee table
    cur_main.execute("SELECT * FROM employee WHERE user_type = 'Vendor' OR user_type = 'vendor'")
    vendors = cur_main.fetchall()
    
    migrated = 0
    for v in vendors:
        # Check if already in vendor_employee
        cur_vendor.execute("SELECT id FROM vendor_employee WHERE email = %s", (v["email"],))
        if cur_vendor.fetchone():
            # If already migrated, just delete from main
            cur_main.execute("DELETE FROM employee WHERE id = %s", (v["id"],))
            conn_main.commit()
            migrated += 1
            print(f"Skipped duplicate insert but cleaned up main DB for {v['email']}")
            continue
            
        cur_vendor.execute(
            "SELECT id, contact_mobile FROM vendor_onboarding WHERE contact_email = %s OR email = %s LIMIT 1",
            (v["email"], v["email"]),
        )
        vo = cur_vendor.fetchone() or {}
        
        vendor_id = vo.get("id") or v["Company_id"]
        onboarding_phone = (vo.get("contact_mobile") or "").strip()
        employee_phone = (v.get("phone_number") or "").strip()
        phone_to_use = onboarding_phone or employee_phone

        cur_vendor.execute(
            """
            INSERT INTO vendor_employee
            (vendor_id, empid, full_name, email, password, phone_number, role, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                vendor_id,
                v["empid"],
                v["full_name"],
                v["email"],
                v["password"],
                phone_to_use,
                v.get("user_role") or "Vendor Admin",
                v.get("active") or "active",
            )
        )
        
        # delete from main
        cur_main.execute("DELETE FROM employee WHERE id = %s", (v["id"],))
        
        migrated += 1
        
    conn_vendor.commit()
    conn_main.commit()
    print(f"Successfully migrated {migrated} vendor accounts from employee to vendor_employee table")
    
except Exception as e:
    conn_vendor.rollback()
    conn_main.rollback()
    print(f"Error migrating: {e}")
finally:
    cur_main.close()
    conn_main.close()
    cur_vendor.close()
    conn_vendor.close()
