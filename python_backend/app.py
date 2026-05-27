"""
Flask backend for Swifterz Project Management.
All PHP API endpoints have been converted to Flask blueprints.
"""
import os
from flask import Flask, send_from_directory, request
from flask_cors import CORS
from config import Config
from db import mysql
from werkzeug.utils import secure_filename

# Blueprints
from blueprints.auth import bp as auth_bp
from blueprints.dashboard import bp as dashboard_bp
from blueprints.notifications import bp as notifications_bp
from blueprints.tasks import bp as tasks_bp
from blueprints.projects import bp as projects_bp
from blueprints.employees import bp as employees_bp
from blueprints.clients import bp as clients_bp
from blueprints.messages import bp as messages_bp, chat_bp
from blueprints.location import bp as location_bp
from blueprints.timesheet import bp as timesheet_bp
from blueprints.attendance import bp as attendance_bp
from blueprints.leave import bp as leave_bp
from blueprints.community import bp as community_bp
from blueprints.profile import bp as profile_bp
from blueprints.company import bp as company_bp
from blueprints.teams import bp as teams_bp
from blueprints.milestones import bp as milestones_bp
from blueprints.payment_milestones_swiftbim import bp as payment_milestones_swiftbim_bp
from blueprints.calendar import bp as calendar_bp
from blueprints.reports import bp as reports_bp
from blueprints.timeline import bp as timeline_bp
from blueprints.client_panel import bp as client_panel_bp
from blueprints.departments import bp as departments_bp
from blueprints.vendor import bp as vendor_bp
from blueprints.workorder import bp as workorder_bp


def create_app(config_class=Config):
    app = Flask(__name__)
    app.url_map.strict_slashes = False
    app.config.from_object(config_class)

    app.config["MAIL_SERVER"] = os.environ.get("MAIL_SERVER", "smtp.gmail.com")
    app.config["MAIL_PORT"] = int(os.environ.get("MAIL_PORT", "587"))
    app.config["MAIL_USE_TLS"] = os.environ.get("MAIL_USE_TLS", "true").lower() == "true"
    app.config["MAIL_USERNAME"] = (os.environ.get("MAIL_USERNAME") or "").strip() or None
    _mail_pass = os.environ.get("MAIL_PASSWORD") or ""
    app.config["MAIL_PASSWORD"] = _mail_pass.replace(" ", "") if _mail_pass else None
    app.config["MAIL_DEFAULT_SENDER"] = (
        os.environ.get("MAIL_DEFAULT_SENDER") or app.config["MAIL_USERNAME"] or ""
    )
    app.config["MAIL_FROM_NAME"] = os.environ.get("MAIL_FROM_NAME", "SwiftBIM")
    app.config["APP_LOGIN_URL"] = os.environ.get("APP_LOGIN_URL", "http://localhost:5173/login")

    CORS(
        app,
        origins=["*"],
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        expose_headers=["WWW-Authenticate", "Authorization"],
    )

    mysql.init_app(app)

    @app.teardown_appcontext
    def close_vendor_db(exception):
        """Close the vendor DB (new_swiftbim) connection at end of each request."""
        from flask import g
        conn = g.pop("vendor_db", None)
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass

    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(employees_bp)
    app.register_blueprint(clients_bp)
    app.register_blueprint(messages_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(location_bp)
    app.register_blueprint(timesheet_bp)
    app.register_blueprint(attendance_bp)
    app.register_blueprint(leave_bp)
    app.register_blueprint(community_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(company_bp)
    app.register_blueprint(teams_bp)
    app.register_blueprint(milestones_bp)
    app.register_blueprint(payment_milestones_swiftbim_bp)
    app.register_blueprint(calendar_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(timeline_bp)
    app.register_blueprint(client_panel_bp)
    app.register_blueprint(departments_bp)
    app.register_blueprint(vendor_bp)
    app.register_blueprint(workorder_bp)

    @app.route("/")
    def index():
        return {"message": "Swifterz API", "version": "1.0", "docs": "See BACKEND_API_FLASK_CONVERSION.md"}

    @app.route("/api/health")
    def health():
        return {"status": "ok"}

    def _send_upload_with_fallback(filename: str, preferred_dirs: list[str]):
        """
        Serve uploaded file from phase-2 and/or phase-1 upload roots.
        """
        from upload_resolver import find_upload_file

        requested = (filename or "").strip()
        if not requested:
            upload_root = app.config["UPLOAD_FOLDER"]
            return send_from_directory(upload_root, requested)

        found = find_upload_file(app.config, requested, preferred_dirs)
        if found:
            directory, name = found
            return send_from_directory(directory, name)

        upload_root = app.config["UPLOAD_FOLDER"]
        return send_from_directory(upload_root, os.path.basename(requested))

    @app.after_request
    def _api_auth_response_header(response):
        """
        Echo Authorization: Bearer <jwt> on API responses (visible in DevTools → Network),
        same as priority-tasks and other authenticated endpoints.
        """
        if request.path.startswith("/api/"):
            from auth_middleware import get_token
            from flask import g

            token = getattr(g, "auth_token", None) or get_token()
            if token:
                response.headers["Authorization"] = f"Bearer {token}"
        return response

    @app.after_request
    def _upload_security_headers(response):
        """VAPT: prevent MIME sniffing on served uploads."""
        if request.path.startswith(("/uploads/", "/static/uploads/")):
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["Content-Security-Policy"] = "default-src 'none'"
        return response

    # Serve uploaded files (e.g., employee profile pictures)
    @app.route("/uploads/<path:filename>")
    def uploaded_file(filename):
        from werkzeug.utils import safe_join
        from upload_resolver import DANGEROUS_EXTENSIONS

        rel = (filename or "").strip().replace("\\", "/")
        if not rel or ".." in rel.split("/"):
            return {"error": "Invalid path"}, 400
        ext = os.path.splitext(rel)[1].lower()
        if ext in DANGEROUS_EXTENSIONS:
            return {"error": "File type not allowed"}, 403
        root = app.config["UPLOAD_FOLDER"]
        directory = safe_join(root, os.path.dirname(rel)) or root
        name = os.path.basename(rel)
        return send_from_directory(directory, name)

    # Backward-compatible routes used by older frontend links / stored URLs
    @app.route("/static/uploads/vendor_docs/<path:filename>")
    def vendor_docs_static(filename):
        # Prefer vendor_docs, then vendors, then upload root for legacy records.
        return _send_upload_with_fallback(filename, ["vendor_docs", "vendors", ""])

    @app.route("/static/uploads/vendors/<path:filename>")
    def vendors_static(filename):
        # Vendor/company/resources files have existed in multiple folders over time.
        return _send_upload_with_fallback(
            filename,
            ["vendors", "vendor_resources", "vendor_docs", ""],
        )

    @app.route("/static/uploads/<path:filename>")
    def static_uploads_root(filename):
        """Client enquiry / phase-1 files (e.g. /static/uploads/<hash>_Screenshot.png)."""
        from urllib.parse import unquote

        name = unquote(filename or "").strip()
        if name.startswith("vendor_docs/"):
            return vendor_docs_static(name[len("vendor_docs/") :])
        if name.startswith("vendors/"):
            return vendors_static(name[len("vendors/") :])
        return _send_upload_with_fallback(name, ["vendor_docs", "", "enquiries"])

    @app.route("/api/view_profile_picture/<emp_id>")
    def view_profile_picture(emp_id):
        from flask import current_app, jsonify, send_file, request
        import os
        import mimetypes
        from werkzeug.utils import safe_join
        from db import get_db
        
        try:
            conn = get_db()
            cur = conn.cursor(dictionary=True)
            user_type = (request.args.get("user_type") or "").strip().lower()
            
            # Check if emp_id is an integer ID or a name
            is_digit = str(emp_id).isdigit()
            
            profile_picture = None
            if user_type == "vendor":
                if is_digit:
                    cur.execute("SELECT profile_picture FROM vendor_employee WHERE id = %s", (emp_id,))
                    row = cur.fetchone()
                    profile_picture = row.get("profile_picture") if row else None
                    if not profile_picture:
                        try:
                            from blueprints.vendor import vendor_cursor

                            vcur = vendor_cursor()
                            vcur.execute(
                                """
                                SELECT profile_picture, vendor_employee_id
                                FROM vendor_resource_profiles
                                WHERE id = %s
                                   OR vendor_employee_id = %s
                                ORDER BY (id = %s) DESC
                                LIMIT 1
                                """,
                                (emp_id, emp_id, emp_id),
                            )
                            res = vcur.fetchone()
                            if res:
                                profile_picture = res.get("profile_picture")
                                if not profile_picture and res.get("vendor_employee_id"):
                                    cur.execute(
                                        "SELECT profile_picture FROM vendor_employee WHERE id = %s",
                                        (res.get("vendor_employee_id"),),
                                    )
                                    ve_row = cur.fetchone()
                                    profile_picture = (
                                        ve_row.get("profile_picture") if ve_row else None
                                    )
                        except Exception:
                            pass
                else:
                    cur.execute(
                        "SELECT profile_picture FROM vendor_employee WHERE LOWER(TRIM(full_name)) = LOWER(TRIM(%s))",
                        (emp_id,),
                    )
                    row = cur.fetchone()
                    profile_picture = row.get("profile_picture") if row else None
            else:
                if is_digit:
                    cur.execute("SELECT profile_picture FROM employee WHERE id = %s", (emp_id,))
                else:
                    cur.execute("SELECT profile_picture FROM employee WHERE LOWER(TRIM(full_name)) = LOWER(TRIM(%s))", (emp_id,))
                row = cur.fetchone()
                profile_picture = row.get("profile_picture") if row else None

            if not profile_picture:
                return jsonify({"error": "No profile picture found for this employee"}), 404
            
            upload_dir = current_app.config.get("UPLOAD_FOLDER")
            if not upload_dir:
                return jsonify({"error": "UPLOAD_FOLDER not configured"}), 500

            # Find physical file:
            # - new stored format: "employee/<file>"
            # - old stored format: "<file>" (implicitly under uploads/employee)
            employee_dir = os.path.join(upload_dir, "employee")
            file_path = safe_join(upload_dir, profile_picture)

            if not (file_path and os.path.isfile(file_path)):
                # fallback for old DB values that store only filename
                file_path = safe_join(employee_dir, os.path.basename(profile_picture))

            if not (file_path and os.path.isfile(file_path)):
                return jsonify({
                    "error": "File not found on server",
                    "path_checked": file_path
                }), 404

            # Force correct mimetype so images render in browser
            mime_type, _ = mimetypes.guess_type(file_path)
            if not mime_type:
                mime_type = "application/octet-stream"

            resp = send_file(file_path, mimetype=mime_type, as_attachment=False)
            resp.headers["Content-Disposition"] = f'inline; filename="{profile_picture}"'
            return resp

        except Exception as e:
            return jsonify({"error": str(e)}), 500

    return app

app = create_app()

if __name__ == "__main__":
    app.run(port=5000, debug=True)
