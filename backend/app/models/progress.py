from app.extensions import db


class LearningProgress(db.Model):
    __tablename__ = "learning_progress"

    id = db.Column(db.Integer, primary_key=True)
    recorded_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now(), index=True)
    activity_date = db.Column(db.Date, nullable=False, index=True)
    activity_type = db.Column(db.String(30), nullable=False, index=True)
    duration_seconds = db.Column(db.Integer, nullable=False, default=0)
    words_learned = db.Column(db.Integer, nullable=False, default=0)
    score = db.Column(db.Float, nullable=True)
    cefr_level = db.Column(db.String(2), nullable=True)
    details = db.Column(db.JSON, nullable=False, default=dict)
