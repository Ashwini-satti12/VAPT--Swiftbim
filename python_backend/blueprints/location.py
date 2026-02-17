from flask import Blueprint, request, jsonify, g
from db import get_db
from auth_middleware import project_app_required

bp = Blueprint("location", __name__, url_prefix="/api/location")


@bp.route("", methods=["POST"])
@project_app_required
def save_location():
    data = request.get_json() or request.form
    lat = data.get("lat") or data.get("latitude")
    lng = data.get("lng") or data.get("longitude")
    if lat is None or lng is None:
        return jsonify({"success": False, "message": "lat and lng required"}), 400
    try:
        lat = float(lat)
        lng = float(lng)
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "Invalid coordinates"}), 400
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return jsonify({"success": False, "message": "Invalid latitude or longitude values"}), 400

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """CREATE TABLE IF NOT EXISTS user_locations (
           id INT AUTO_INCREMENT PRIMARY KEY,
           userid INT NOT NULL,
           latitude DECIMAL(10,8) NOT NULL,
           longitude DECIMAL(11,8) NOT NULL,
           timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
           Company_id INT NOT NULL)"""
    )
    cur.execute("SELECT id FROM user_locations WHERE userid = %s", (g.user_id,))
    row = cur.fetchone()
    if row:
        cur.execute(
            "UPDATE user_locations SET latitude = %s, longitude = %s WHERE userid = %s",
            (lat, lng, g.user_id),
        )
    else:
        cur.execute(
            "INSERT INTO user_locations (userid, latitude, longitude, Company_id) VALUES (%s, %s, %s, %s)",
            (g.user_id, lat, lng, g.company_id),
        )
    return jsonify({"success": True, "message": "Location updated successfully"})


@bp.route("/employees", methods=["GET"])
@project_app_required
def list_employee_locations():
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """SELECT ul.*, e.full_name, e.profile_picture
           FROM user_locations ul
           JOIN employee e ON ul.userid = e.id
           WHERE ul.Company_id = %s""",
        (g.company_id,),
    )
    rows = cur.fetchall()
    locations = []
    for r in rows:
        d = dict(r)
        if d.get("timestamp") and hasattr(d["timestamp"], "isoformat"):
            d["timestamp"] = d["timestamp"].isoformat()
        locations.append(d)
    return jsonify({"locations": locations})
