import re

with open("blueprints/auth.py", "r") as f:
    code = f.read()

# Make sure we import mysql_connector to get the vendor DB
if "import mysql.connector as mysql_connector" not in code:
    code = code.replace("from db import get_db, admin_required", "from db import get_db, admin_required\nimport mysql.connector as mysql_connector\nfrom flask import current_app")


# Function to get vendor DB
vendor_db_func = """
def _get_vendor_db():
    conn = mysql_connector.connect(
        host=current_app.config["MYSQL_HOST"],
        user=current_app.config["MYSQL_USER"],
        password=current_app.config["MYSQL_PASSWORD"],
        database="new_swiftbim",
        port=current_app.config.get("MYSQL_PORT", 3306),
        autocommit=True,
    )
    return conn
"""
if "def _get_vendor_db():" not in code:
    code = code.replace("bp = Blueprint(\"auth\", __name__)", vendor_db_func + "\n\nbp = Blueprint(\"auth\", __name__)")

# Patch login logic to use vendor DB
login_patch = """
    # 1. Try Employee table
    user_type = "employee"
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM employee WHERE email = %s", (email,))
        row = cur.fetchone()

    # 2. Try Vendor table
    if not row:
        vendor_conn = _get_vendor_db()
        try:
            with vendor_conn.cursor(dictionary=True) as v_cur:
                v_cur.execute("SELECT * FROM vendor_employee WHERE email = %s", (email,))
                row = v_cur.fetchone()
                if row:
                    user_type = "vendor"
        finally:
            vendor_conn.close()
"""
code = re.sub(
    r'    # 1\. Try Employee table.*?if not row:\n        with conn\.cursor.*?user_type = "vendor"',
    login_patch.strip(),
    code,
    flags=re.DOTALL
)

with open("blueprints/auth.py", "w") as f:
    f.write(code)

print("Applied patch to auth.py")
