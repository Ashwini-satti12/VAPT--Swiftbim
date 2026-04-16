"""
Flask backend for Swifterz Project Management.
All PHP API endpoints have been converted to Flask blueprints.
"""
import os
from flask import Flask, send_from_directory
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
from blueprints.calendar import bp as calendar_bp
from blueprints.reports import bp as reports_bp
from blueprints.timeline import bp as timeline_bp
from blueprints.client_panel import bp as client_panel_bp
from blueprints.departments import bp as departments_bp
from blueprints.vendor import bp as vendor_bp


def create_app(config_class=Config): 
    app = Flask(__name__)
    app.config.from_object(config_class)
    CORS(app, origins=["*"], supports_credentials=True)

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
    app.register_blueprint(calendar_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(timeline_bp)
    app.register_blueprint(client_panel_bp)
    app.register_blueprint(departments_bp)
    app.register_blueprint(vendor_bp)

    @app.route("/")
    def index():
        return {"message": "Swifterz API", "version": "1.0", "docs": "See BACKEND_API_FLASK_CONVERSION.md"}

    @app.route("/api/health")
    def health():
        return {"status": "ok"}

    def _send_upload_with_fallback(filename: str, preferred_dirs: list[str]):
        """
        Serve uploaded file by trying multiple directories and legacy filename variants.
        Keeps backward compatibility for rows that stored only basename (or older naming).
        """
        upload_root = app.config["UPLOAD_FOLDER"]
        requested = (filename or "").strip()
        if not requested:
            return send_from_directory(upload_root, requested)

        basename = os.path.basename(requested)
        unquoted = basename
        try:
            # Flask usually provides decoded path already, but keep this for safety.
            from urllib.parse import unquote

            unquoted = unquote(basename)
        except Exception:
            pass

        candidates = []
        for name in (basename, unquoted):
            if not name:
                continue
            candidates.append(name)
            sf = secure_filename(name)
            if sf and sf not in candidates:
                candidates.append(sf)
            if name.startswith(("TL_", "GST_")):
                no_prefix = name.split("_", 1)[1] if "_" in name else name
                if no_prefix and no_prefix not in candidates:
                    candidates.append(no_prefix)
                sf_no_prefix = secure_filename(no_prefix)
                if sf_no_prefix and sf_no_prefix not in candidates:
                    candidates.append(sf_no_prefix)

        # Deduplicate while preserving order.
        seen = set()
        unique_candidates = []
        for c in candidates:
            if c and c not in seen:
                seen.add(c)
                unique_candidates.append(c)

        for sub_dir in preferred_dirs:
            target_dir = os.path.join(upload_root, sub_dir) if sub_dir else upload_root
            for c in unique_candidates:
                if os.path.isfile(os.path.join(target_dir, c)):
                    return send_from_directory(target_dir, c)

        # Keep previous fallback behavior: try root with original value.
        return send_from_directory(upload_root, basename)

    # Serve uploaded files (e.g., employee profile pictures)
    @app.route("/uploads/<path:filename>")
    def uploaded_file(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

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

    @app.route("/api/view_profile_picture/<int:emp_id>")
    def view_profile_picture(emp_id):
        from flask import current_app, jsonify, send_file, request
        import os
        import mimetypes
        from werkzeug.utils import safe_join
        from db import get_db
        
        try:
            conn = get_db()
            cur = conn.cursor()
            user_type = (request.args.get("user_type") or "").strip().lower()
            if user_type == "vendor":
                cur.execute(
                    "SELECT profile_picture FROM vendor_employee WHERE id = %s",
                    (emp_id,),
                )
            else:
                cur.execute("SELECT profile_picture FROM employee WHERE id = %s", (emp_id,))
            row = cur.fetchone()
            
            if not row or not row.get("profile_picture"):
                return jsonify({"error": "No profile picture found for this employee"}), 404
                
            profile_picture = row["profile_picture"]
            
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
