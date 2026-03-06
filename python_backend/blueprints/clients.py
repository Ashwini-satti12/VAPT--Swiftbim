from flask import Blueprint, request, jsonify, g, current_app
from db import get_db
from auth_middleware import project_app_required, require_not_roles
import mysql.connector as mysql_connector

bp = Blueprint("clients", __name__, url_prefix="/api/clients")


def _get_users_db():
    """
    Connection to the marketing portal DB (new_swiftbim) where `users` live.
    """
    conn = mysql_connector.connect(
        host=current_app.config["MYSQL_HOST"],
        user=current_app.config["MYSQL_USER"],
        password=current_app.config["MYSQL_PASSWORD"],
        database="new_swiftbim",
        port=current_app.config.get("MYSQL_PORT", 3306),
    )
    return conn


@bp.route("", methods=["GET"])
@project_app_required
@require_not_roles("BIM Lead", "BIM Coordinator")
def list_clients():
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT * FROM clientinformation WHERE Company_id = %s ORDER BY fullName",
        (g.company_id,),
    )
    rows = cur.fetchall()
    clients = [dict(r) for r in rows]
    for c in clients:
        for k in list(c.keys()):
            v = c[k]
            if hasattr(v, "isoformat"):
                c[k] = v.isoformat()
    return jsonify({"clients": clients})


@bp.route("/from-users", methods=["GET"])
@project_app_required
def list_clients_from_users():
    """
    Return clients from new_swiftbim.users where role='client'.
    This is used for project creation dropdowns.
    """
    conn = _get_users_db()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "SELECT id, full_name, email, company_details, phone_number, role "
            "FROM users WHERE role = 'client' ORDER BY full_name"
        )
        rows = cur.fetchall()
        return jsonify({"clients": rows})
    finally:
        conn.close()


@bp.route("", methods=["POST"])
@project_app_required
@require_not_roles("BIM Lead", "BIM Coordinator")
def create_client():
    data = request.get_json() or request.form
    full_name = data.get("fullName") or data.get("full_name")
    email = data.get("email")
    phone_number = data.get("phoneNumber") or data.get("phone") or data.get("phone_number") or ""
    address = data.get("address") or ""
    # Optional columns as in PHP updateclient
    gst_number = data.get("GSTNumber") or ""
    project_name = data.get("projectName") or ""
    budget = data.get("budget") or ""
    start_date = data.get("startDate") or ""
    end_date = data.get("endDate") or ""
    total_hours = data.get("totalHours") or ""
    resource_involved = data.get("resourceInvolved") or ""
    if not full_name:
        return jsonify({"success": False, "message": "fullName required"}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO clientinformation (fullName, email, phoneNumber, address, GSTNumber, projectName, budget, startDate, endDate, totalHours, resourceInvolved, Company_id)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (full_name, email or "", phone_number, address, gst_number, project_name, budget, start_date, end_date, total_hours, resource_involved, g.company_id),
    )
    client_id = cur.lastrowid
    return jsonify({"success": True, "id": client_id})


@bp.route("/<int:client_id>", methods=["GET"])
@project_app_required
@require_not_roles("BIM Lead", "BIM Coordinator")
def get_client(client_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT * FROM clientinformation WHERE id = %s AND Company_id = %s",
        (client_id, g.company_id),
    )
    row = cur.fetchone()
    if not row:
        return jsonify({"success": False, "message": "Client not found"}), 404
    d = dict(row)
    for k in list(d.keys()):
        if hasattr(d.get(k), "isoformat"):
            d[k] = d[k].isoformat()
    return jsonify(d)


@bp.route("/<int:client_id>", methods=["PUT", "PATCH"])
@project_app_required
@require_not_roles("BIM Lead", "BIM Coordinator")
def update_client(client_id):
    data = request.get_json() or request.form
    conn = get_db()
    cur = conn.cursor()
    allowed = ("fullName", "email", "phoneNumber", "address", "GSTNumber", "projectName", "budget", "startDate", "endDate", "totalHours", "resourceInvolved")
    sets = []
    params = []
    for key in allowed:
        if key in data and data[key] is not None:
            sets.append(f"`{key}` = %s")
            params.append(data[key])
    if not sets:
        return jsonify({"success": False, "message": "No fields to update"}), 400
    params.extend([client_id, g.company_id])
    cur.execute("UPDATE clientinformation SET " + ", ".join(sets) + " WHERE id = %s AND Company_id = %s", params)
    if cur.rowcount:
        return jsonify({"success": True})
    return jsonify({"success": False, "message": "Client not found"}), 404


@bp.route("/dashboard-stats", methods=["GET"])
@project_app_required
@require_not_roles("BIM Lead", "BIM Coordinator")
def dashboard_stats():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) AS total FROM employee WHERE Company_id = %s", (g.company_id,))
    total_employees = (cur.fetchone() or {}).get("total") or 0
    cur.execute("SELECT COUNT(*) AS total FROM clientinformation WHERE Company_id = %s", (g.company_id,))
    total_clients = (cur.fetchone() or {}).get("total") or 0
    cur.execute("SELECT COUNT(*) AS total FROM projects WHERE Company_id = %s", (g.company_id,))
    total_projects = (cur.fetchone() or {}).get("total") or 0
    return jsonify({
        "total_employees": total_employees,
        "total_clients": total_clients,
        "total_projects": total_projects,
    })
