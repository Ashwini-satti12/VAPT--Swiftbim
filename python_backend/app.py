"""
Flask backend for Swifterz Project Management.
All PHP API endpoints have been converted to Flask blueprints.
"""
import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from config import Config
from db import mysql

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

    # Serve uploaded files (e.g., employee profile pictures)
    @app.route("/uploads/<path:filename>")
    def uploaded_file(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    # Backward-compatible routes used by older frontend links / stored URLs
    @app.route("/static/uploads/vendor_docs/<path:filename>")
    def vendor_docs_static(filename):
        upload_root = app.config["UPLOAD_FOLDER"]
        # Prefer uploads/vendor_docs/<file>, fallback to uploads/<file>
        docs_dir = os.path.join(upload_root, "vendor_docs")
        if os.path.isfile(os.path.join(docs_dir, filename)):
            return send_from_directory(docs_dir, filename)
        return send_from_directory(upload_root, filename)

    @app.route("/static/uploads/vendors/<path:filename>")
    def vendors_static(filename):
        upload_root = app.config["UPLOAD_FOLDER"]
        # Prefer uploads/vendors/<file>, fallback to uploads/<file>
        vendors_dir = os.path.join(upload_root, "vendors")
        if os.path.isfile(os.path.join(vendors_dir, filename)):
            return send_from_directory(vendors_dir, filename)
        return send_from_directory(upload_root, filename)

    @app.route("/api/view_profile_picture/<int:emp_id>")
    def view_profile_picture(emp_id):
        from flask import current_app, jsonify, send_file, request
        import os
        import mimetypes
        from werkzeug.utils import safe_join
        from db import get_db
        
        try:
            user_type = request.args.get("user_type")
            conn = get_db()
            cur = conn.cursor(dictionary=True)
            
            row = None
            if user_type == "vendor":
                cur.execute("SELECT profile_picture FROM vendor_employee WHERE id = %s", (emp_id,))
                row = cur.fetchone()
            elif user_type == "employee":
                cur.execute("SELECT profile_picture FROM employee WHERE id = %s", (emp_id,))
                row = cur.fetchone()
            else:
                # Fallback: Try employee table first
                cur.execute("SELECT profile_picture FROM employee WHERE id = %s", (emp_id,))
                row = cur.fetchone()
                
                # If not found or no picture, try vendor_employee table
                if not row or not row.get("profile_picture"):
                    cur.execute("SELECT profile_picture FROM vendor_employee WHERE id = %s", (emp_id,))
                    row = cur.fetchone()

            if not row or not row.get("profile_picture"):
                return jsonify({"error": "No profile picture found for this user"}), 404
                
            profile_picture = row["profile_picture"]
            
            upload_dir = current_app.config.get("UPLOAD_FOLDER")
            if not upload_dir:
                return jsonify({"error": "UPLOAD_FOLDER not configured"}), 500

            # Find physical file (try employee dir first, then root upload dir)
            employee_dir = os.path.join(upload_dir, "employee")
            file_path = safe_join(employee_dir, profile_picture)
            
            if not (file_path and os.path.isfile(file_path)):
                file_path = safe_join(upload_dir, profile_picture)

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
