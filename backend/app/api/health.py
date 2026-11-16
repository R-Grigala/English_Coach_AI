from flask_restx import Namespace, Resource

from app.extensions import db

api = Namespace("health", description="Service health")


@api.route("/", strict_slashes=False)
class Health(Resource):
    def get(self):
        """Check API and database availability."""
        try:
            db.session.execute(db.text("SELECT 1"))
        except Exception:
            db.session.rollback()
            return {"status": "error", "database": "unavailable"}, 503
        return {"status": "ok", "database": "available"}, 200

