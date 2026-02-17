from flask import Blueprint, request, jsonify, g
from auth_middleware import project_app_required

bp = Blueprint("company", __name__, url_prefix="/api/company")


@bp.route("/switch", methods=["POST"])
@project_app_required
def switch_company():
    data = request.get_json() or request.form
    company_id = data.get("company_id")
    if company_id is None:
        return jsonify({"success": False, "message": "company_id required"}), 400
    # In API-only mode we would return a new JWT with the new company_id; client stores it.
    # For now just acknowledge; actual switch is done by re-login or token refresh with company_id.
    return jsonify({"success": True, "message": "Company switch requested", "company_id": company_id})
