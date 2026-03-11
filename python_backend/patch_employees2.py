import re

with open("blueprints/employees.py", "r") as f:
    code = f.read()

# For update_employee (PUT/PATCH /<int:emp_id>)
update_emp_patch = """
@bp.route("/<int:emp_id>", methods=["PUT", "PATCH"])
@project_app_required
def update_employee(emp_id):
    if request.is_json:
        data = request.get_json() or {}
    else:
        data = request.form
        
    user_type = getattr(g, "user_type", "employee")
    conn = get_db()
    cur = conn.cursor()
    
    if user_type == "vendor":
        allowed = ("full_name", "phone_number", "email", "role", "status")
        # Map frontend fields to vendor_employee fields
        if "user_role" in data:
            data["role"] = data["user_role"]
        elif "userRole" in data:
            data["role"] = data["userRole"]
        if "active" in data:
            data["status"] = data["active"]
            
        sets = []
        params = []
        for key in allowed:
            if key in data and data[key] is not None:
                sets.append(f"`{key}` = %s")
                params.append(data[key])
                
        if not sets:
            return jsonify({"success": False, "message": "No fields to update for vendor"}), 400
            
        params.extend([emp_id, g.company_id])
        cur.execute("UPDATE vendor_employee SET " + ", ".join(sets) + " WHERE id = %s AND vendor_id = %s", params)
        if cur.rowcount:
            return jsonify({"success": True})
        return jsonify({"success": False, "message": "Employee not found"}), 404

    # Internal employee fallback
"""

code = re.sub(
    r'@bp\.route\("/<int:emp_id>", methods=\\["PUT", "PATCH"\\]\)\n@project_app_required\ndef update_employee\(emp_id\):\n(?:[ \t]*#.*\n)*[ \t]*if request\.is_json:',
    update_emp_patch.strip() + "\n    if request.is_json:",
    code
)

with open("blueprints/employees.py", "w") as f:
    f.write(code)

print("Applied patch to update_employee")
