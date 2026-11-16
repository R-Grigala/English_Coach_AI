from flask import Flask
from flask_restx import Api
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.exceptions import HTTPException

from app.config import Config
from app.extensions import db, migrate

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["120 per hour", "30 per minute"],
)


def create_app(config_object=Config):
    app = Flask(__name__)
    app.config.from_object(config_object)

    db.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)
    from app import models  # noqa: F401  Register models with SQLAlchemy metadata.
    from app.api.health import api as health_namespace
    from app.api.integrations import api as integrations_namespace
    from app.api.crud import api as learning_namespace
    from app.api.learning_system import api as learning_system_namespace
    from app.api.profile import api as profile_namespace

    api = Api(
        app,
        title="English Coach AI API",
        version="1.0",
        description="API for the English Coach AI learning platform.",
        doc="/api/docs",
        prefix="/api",
    )
    api.add_namespace(health_namespace)
    api.add_namespace(integrations_namespace)
    api.add_namespace(profile_namespace)
    api.add_namespace(learning_namespace)
    api.add_namespace(learning_system_namespace)

    @api.errorhandler(HTTPException)
    def handle_http_error(error):
        return {
            "error": {
                "code": error.name.lower().replace(" ", "_"),
                "message": error.description,
            }
        }, error.code

    @api.errorhandler(Exception)
    def handle_unexpected_error(error):
        app.logger.exception("Unhandled API error", exc_info=error)
        return {"error": {"code": "internal_error", "message": "An unexpected error occurred"}}, 500

    return app

