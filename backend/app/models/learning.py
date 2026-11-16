from app.extensions import db


class LearningPlan(db.Model):
    __tablename__ = "learning_plans"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(160), nullable=False)
    description = db.Column(db.Text)
    cefr_level = db.Column(db.String(2), nullable=False, default="A2")
    goals = db.Column(db.JSON, nullable=False, default=list)
    starts_on = db.Column(db.Date, nullable=True)
    ends_on = db.Column(db.Date, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True, index=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now(), onupdate=db.func.now())

    lessons = db.relationship("Lesson", back_populates="plan")


class Lesson(db.Model):
    __tablename__ = "lessons"

    id = db.Column(db.Integer, primary_key=True)
    plan_id = db.Column(db.Integer, db.ForeignKey("learning_plans.id", ondelete="SET NULL"), index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    cefr_level = db.Column(db.String(2), nullable=False, default="A2", index=True)
    topic = db.Column(db.String(120), nullable=True, index=True)
    status = db.Column(db.String(20), nullable=False, default="planned", index=True)
    scheduled_for = db.Column(db.Date, nullable=True, index=True)
    completed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())

    plan = db.relationship("LearningPlan", back_populates="lessons")
    sections = db.relationship(
        "LessonSection", back_populates="lesson", cascade="all, delete-orphan",
        order_by="LessonSection.position",
    )


class LessonSection(db.Model):
    __tablename__ = "lesson_sections"
    __table_args__ = (db.UniqueConstraint("lesson_id", "position", name="uq_lesson_section_position"),)

    id = db.Column(db.Integer, primary_key=True)
    lesson_id = db.Column(db.Integer, db.ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    section_type = db.Column(db.String(30), nullable=False)
    content = db.Column(db.JSON, nullable=False, default=dict)
    position = db.Column(db.Integer, nullable=False, default=0)

    lesson = db.relationship("Lesson", back_populates="sections")
