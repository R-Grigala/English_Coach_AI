from flask import Flask
from flask_restx import Api

from app.config import Config
from app.extensions import db, migrate


def create_app(config_object=Config):
    app = Flask(__name__)
    app.config.from_object(config_object)

    db.init_app(app)
    migrate.init_app(app, db)
    from app import models  # noqa: F401  Register models with SQLAlchemy metadata.
    from app.api.health import api as health_namespace
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
    api.add_namespace(profile_namespace)

    return app

