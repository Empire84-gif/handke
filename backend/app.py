from flask import Flask, jsonify
from flask_cors import CORS

from config import (
    FRONTEND_URL,
    SECRET_KEY,
    SESSION_COOKIE_HTTPONLY,
    SESSION_COOKIE_NAME,
    SESSION_COOKIE_SAMESITE,
    SESSION_COOKIE_SECURE,
)
from routes.auth_routes import auth_bp
from routes.settings_routes import settings_bp
from routes.clients_routes import clients_bp
from routes.tasks_routes import tasks_bp
from routes.projects_routes import projects_bp
from routes.payments_routes import payments_bp
from routes.dashboard_routes import dashboard_bp
from routes.stats_routes import stats_bp
from routes.documents_routes import documents_bp
from routes.mails_routes import mails_bp
from routes.pdf_routes import pdf_bp


def create_app():
    app = Flask(__name__)

    app.config["SECRET_KEY"] = SECRET_KEY
    app.config["SESSION_COOKIE_NAME"] = SESSION_COOKIE_NAME
    app.config["SESSION_COOKIE_HTTPONLY"] = SESSION_COOKIE_HTTPONLY
    app.config["SESSION_COOKIE_SAMESITE"] = SESSION_COOKIE_SAMESITE
    app.config["SESSION_COOKIE_SECURE"] = SESSION_COOKIE_SECURE

    CORS(
        app,
        origins=[FRONTEND_URL],
        supports_credentials=True,
    )

    app.register_blueprint(auth_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(clients_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(payments_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(stats_bp)
    app.register_blueprint(documents_bp)
    app.register_blueprint(mails_bp)
    app.register_blueprint(pdf_bp)

    @app.get("/api/health")
    def health():
        return jsonify({
            "status": "ok",
            "message": "CRM backend działa."
        }), 200

    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True, port=5000)