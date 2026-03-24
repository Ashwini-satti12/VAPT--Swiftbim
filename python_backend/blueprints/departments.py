from flask import Blueprint, jsonify
from db import get_db
from auth_middleware import project_app_required
from flask import g

bp = Blueprint("departments", __name__, url_prefix="/api/departments")


@bp.route("", methods=["GET"])
@project_app_required
def list_departments():
    """
    Return all department names from the `department` table (name column),
    used to populate department dropdowns in the frontend.
    """
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT name FROM department WHERE Company_id = %s ORDER BY name", (g.company_id,))
    rows = cur.fetchall()
    names = [r.get("name") for r in rows if r.get("name")]
    return jsonify({"departments": names})


