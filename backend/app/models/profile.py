from app.extensions import db


class LearningProfile(db.Model):
    """The preferences for this personal, single-user learning installation."""

    __tablename__ = "learning_profile"

    id = db.Column(db.Integer, primary_key=True, default=1)
    display_name = db.Column(db.String(100), nullable=True)
    cefr_level = db.Column(db.String(2), nullable=False, default="A2")
    native_language = db.Column(db.String(10), nullable=False, default="ka")
    learning_goal = db.Column(db.String(500), nullable=True)
