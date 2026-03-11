import re

with open("blueprints/auth.py", "r") as f:
    code = f.read()

import_patch = "from werkzeug.security import generate_password_hash, check_password_hash"
if "werkzeug.security" not in code:
    code = code.replace("import hashlib\n", f"import hashlib\n{import_patch}\n")

# Replace md5_hash check with support for both Werkzeug hash and legacy MD5
login_patch = """
    stored_password = row.get("password") or ""
    
    # Try check_password_hash first (for scrypt/pbkdf2), fallback to MD5 for legacy
    password_match = False
    if stored_password.startswith("scrypt:") or stored_password.startswith("pbkdf2:"):
        password_match = check_password_hash(stored_password, password)
    else:
        password_match = (md5_hash(password) == stored_password)
        
    if not password_match:
        return jsonify({"success": False, "message": "Incorrect email or password. Please try again."}), 401
"""

code = re.sub(
    r'    stored_password = row\.get\("password"\) or ""\n    if md5_hash\(password\) != stored_password:\n        return jsonify\(\{"success": False, "message": "Incorrect email or password\. Please try again\."\}\), 401\n',
    login_patch.lstrip("\n") + "\n",
    code
)

with open("blueprints/auth.py", "w") as f:
    f.write(code)

print("Applied password hash patch to auth.py")
