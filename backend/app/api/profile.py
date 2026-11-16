from flask import request
from flask_restx import Namespace, Resource

from app.extensions import db
from app.models import LearningProfile

api = Namespace("profile", description="Personal learning profile")
CEFR_LEVELS = {"A1", "A2", "B1", "B2", "C1", "C2"}


def get_profile():
    profile = db.session.get(LearningProfile, 1)
    if profile is None:
        profile = LearningProfile(id=1)
        db.session.add(profile)
        db.session.commit()
    return profile


def serialize_profile(profile):
    return {
        "display_name": profile.display_name,
        "cefr_level": profile.cefr_level,
        "native_language": profile.native_language,
        "learning_goal": profile.learning_goal,
    }


@api.route("/", strict_slashes=False)
class ProfileResource(Resource):
    def get(self):
        """Get this installation's learning profile, creating defaults if needed."""
        return {"profile": serialize_profile(get_profile())}, 200

    def put(self):
        """Update this installation's learning preferences."""
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return {"message": "A JSON object is required."}, 400

        allowed_fields = {
            "display_name", "cefr_level", "native_language", "learning_goal"
        }
        unknown_fields = set(payload) - allowed_fields
        if unknown_fields:
            return {"message": "Unknown profile fields.", "fields": sorted(unknown_fields)}, 400

        profile = get_profile()
        for field, value in payload.items():
            if value is not None and not isinstance(value, str):
                return {"message": f"{field} must be a string or null."}, 400
            if field == "cefr_level" and value is not None:
                value = value.upper()
                if value not in CEFR_LEVELS:
                    return {"message": "cefr_level must be one of A1, A2, B1, B2, C1, C2."}, 400
            if isinstance(value, str):
                value = value.strip()
                if field == "native_language":
                    value = value.lower()
            setattr(profile, field, value)

        db.session.commit()
        return {"profile": serialize_profile(profile)}, 200
