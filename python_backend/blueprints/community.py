from flask import Blueprint, request, jsonify, g
from db import get_db
from auth_middleware import project_app_required

bp = Blueprint("community", __name__, url_prefix="/api/community")


@bp.route("/posts", methods=["GET"])
@project_app_required
def list_posts():
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """SELECT community.id, community.user_id, community.date, community.employeeid, community.text,
                  community.likes, community.emojis, community.type, employee.full_name, employee.profile_picture
           FROM community
           JOIN employee ON employee.id = community.user_id
           WHERE community.type != 'ticket' AND community.Company_id = %s
           ORDER BY community.id DESC""",
        (g.company_id,),
    )
    rows = cur.fetchall()
    posts = []
    for r in rows:
        d = dict(r)
        if d.get("date") and hasattr(d["date"], "isoformat"):
            d["date"] = d["date"].isoformat()
        posts.append(d)
    return jsonify({"posts": posts})


@bp.route("/posts/<int:post_id>/react", methods=["POST"])
@project_app_required
def react(post_id):
    data = request.get_json() or request.form
    reaction_type = data.get("reactionType") or "like"
    employee_id = data.get("employeeId") or g.user_id
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT id FROM community WHERE id = %s AND FIND_IN_SET(%s, employeeid) > 0",
        (post_id, employee_id),
    )
    if cur.fetchone():
        return jsonify({"success": False, "message": "Employee has already liked the comment"}), 400
    col = "likes" if reaction_type == "like" else "emojis"
    cur.execute(
        f"UPDATE community SET {col} = {col} + 1, employeeid = CONCAT(COALESCE(employeeid,''), ', ', %s) WHERE id = %s",
        (employee_id, post_id),
    )
    if cur.rowcount:
        return jsonify({"success": True, "message": "Reaction updated successfully"})
    return jsonify({"success": False, "message": "Failed to update reaction"}), 400


@bp.route("/ring", methods=["POST"])
@project_app_required
def update_ring():
    data = request.get_json() or request.form
    user_id = data.get("user_id") or g.user_id
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE community SET ring = CONCAT(COALESCE(ring,''), ',', %s) WHERE FIND_IN_SET(%s, ring) = 0",
        (user_id, user_id),
    )
    return jsonify({"success": True})
