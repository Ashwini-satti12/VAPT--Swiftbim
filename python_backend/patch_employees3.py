import re

with open("blueprints/employees.py", "r") as f:
    code = f.read()

# patch create_employee
create_emp_patch = """
    # Vendor logic
    user_type_env = getattr(g, "user_type", "employee")
    if user_type_env == "vendor":
        conn = get_db()
        cur = conn.cursor()
        # check duplicate
        cur.execute("SELECT id FROM vendor_employee WHERE email = %s AND vendor_id = %s LIMIT 1", (email, g.company_id))
        if cur.fetchone():
            return jsonify({"success": False, "message": "Email already exists"}), 400
        
        hashed = hashlib.md5(password.encode()).hexdigest()
        try:
            cur.execute(
                "INSERT INTO vendor_employee (vendor_id, empid, full_name, email, password, phone_number, role, status) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                (g.company_id, empid, full_name, email, hashed, phone_number, user_role, active)
            )
            emp_id = cur.lastrowid
            return jsonify({"success": True, "id": emp_id, "profile_picture": None})
        except Exception as e:
            return jsonify({"success": False, "message": str(e)}), 400

    # Internal employee fallback
"""

code = re.sub(
    r'(    if not full_name or not email or not password:\n        return jsonify\(\{"success": False, "message": "full_name, email, password required"\}\), 400\n)',
    r'\1' + create_emp_patch.lstrip("\n"),
    code
)

# patch bulk_status
bulk_status_patch = """
    user_type = getattr(g, "user_type", "employee")
    conn = get_db()
    cur = conn.cursor()
    placeholders = ",".join(["%s"] * len(ids))
    
    if user_type == "vendor":
        cur.execute(
            f"UPDATE vendor_employee SET status = %s WHERE id IN ({placeholders}) AND vendor_id = %s",
            [action] + list(ids) + [g.company_id],
        )
        return jsonify({"success": True, "updated": cur.rowcount})
"""
code = re.sub(
    r'(    conn = get_db\(\)\n    cur = conn\.cursor\(\)\n    placeholders = ","\.join\(\["%s"\] \* len\(ids\)\)\n)',
    bulk_status_patch.lstrip("\n") + r'\1',
    code
)

with open("blueprints/employees.py", "w") as f:
    f.write(code)

print("Applied patch to create_employee and bulk_status")
