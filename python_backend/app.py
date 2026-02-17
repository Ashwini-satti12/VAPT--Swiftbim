"""
Flask backend for Swifterz Project Management.
All PHP API endpoints have been converted to Flask blueprints.
"""
import os
from flask import Flask
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
from blueprints.messages import bp as messages_bp
from blueprints.location import bp as location_bp
from blueprints.timesheet import bp as timesheet_bp
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


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    CORS(app, origins=["*"], supports_credentials=True)

    mysql.init_app(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(employees_bp)
    app.register_blueprint(clients_bp)
    app.register_blueprint(messages_bp)
    app.register_blueprint(location_bp)
    app.register_blueprint(timesheet_bp)
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

    @app.route("/")
    def index():
        return {"message": "Swifterz API", "version": "1.0", "docs": "See BACKEND_API_FLASK_CONVERSION.md"}

    @app.route("/api/health")
    def health():
        return {"status": "ok"}

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
