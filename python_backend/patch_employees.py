import re

with open("blueprints/employees.py", "r") as f:
    code = f.read()

# For GET /<int:emp_id>
get_emp_patch = """
@bp.route("/<int:emp_id>", methods=["GET"])
@project_app_required
def get_employee(emp_id):
    conn = get_db()
    cur = conn.cursor(dictionary=True) if hasattr(conn.cursor(), 'dictionary') else conn.cursor()
    
    user_type = getattr(g, "user_type", "employee")
    if user_type == "vendor":
        cur.execute(
            "SELECT id, empid, full_name, email, phone_number, 'vendor' AS user_type, role AS user_role, NULL AS profile_picture, NULL AS address, NULL AS doj, NULL AS dob, 'Vendor' AS department, status AS active, 'Vendor' AS Allpannel, NULL AS salary, NULL AS accountnumber FROM vendor_employee WHERE id = %s AND vendor_id = %s",
            (emp_id, g.company_id)
        )
        row = cur.fetchone()
        if not row:
            return jsonify({"success": False, "message": "Employee not found"}), 404
        return jsonify(dict(row))
    
    # Internal employee fallback
"""

code = re.sub(
    r'@bp\.route\("/<int:emp_id>", methods=\["GET"\]\)\n@project_app_required\ndef get_employee\(emp_id\):\n    conn = get_db\(\)\n    cur = conn\.cursor\(\)',
    get_emp_patch.strip() + "\n    cur.execute(",
    code
)

with open("blueprints/employees.py", "w") as f:
    f.write(code)

print("Applied patch to get_employee")
