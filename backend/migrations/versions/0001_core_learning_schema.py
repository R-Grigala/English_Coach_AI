"""Create the single-learner English Coach schema.

Revision ID: 0001_core_learning
Revises:
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_core_learning"
down_revision = None
branch_labels = None
depends_on = None


def _create(table, *columns, constraints=()):
    op.create_table(table, *columns, *constraints)


def upgrade():
    _create("learning_profile",
        sa.Column("id", sa.Integer(), primary_key=True), sa.Column("display_name", sa.String(100)),
        sa.Column("cefr_level", sa.String(2), nullable=False, server_default="A2"),
        sa.Column("native_language", sa.String(10), nullable=False, server_default="ka"),
        sa.Column("learning_goal", sa.String(500)))
    _create("learning_plans",
        sa.Column("id", sa.Integer(), primary_key=True), sa.Column("title", sa.String(160), nullable=False),
        sa.Column("description", sa.Text()), sa.Column("cefr_level", sa.String(2), nullable=False, server_default="A2"),
        sa.Column("goals", sa.JSON(), nullable=False), sa.Column("starts_on", sa.Date()), sa.Column("ends_on", sa.Date()),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")))
    _create("vocabulary_categories",
        sa.Column("id", sa.Integer(), primary_key=True), sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("description", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")))
    _create("vocabulary",
        sa.Column("id", sa.Integer(), primary_key=True), sa.Column("word", sa.String(160), nullable=False),
        sa.Column("translation", sa.String(240), nullable=False), sa.Column("pronunciation", sa.String(240)),
        sa.Column("part_of_speech", sa.String(40), nullable=False), sa.Column("cefr_level", sa.String(2), nullable=False),
        sa.Column("examples", sa.JSON(), nullable=False), sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        constraints=(sa.UniqueConstraint("word", "part_of_speech", name="uq_vocabulary_word_pos"),))
    _create("vocabulary_category_links",
        sa.Column("vocabulary_id", sa.Integer(), sa.ForeignKey("vocabulary.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("vocabulary_categories.id", ondelete="CASCADE"), primary_key=True))
    _create("lessons",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("plan_id", sa.Integer(), sa.ForeignKey("learning_plans.id", ondelete="SET NULL")),
        sa.Column("title", sa.String(200), nullable=False), sa.Column("description", sa.Text()),
        sa.Column("cefr_level", sa.String(2), nullable=False), sa.Column("topic", sa.String(120)),
        sa.Column("status", sa.String(20), nullable=False), sa.Column("scheduled_for", sa.Date()),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")))
    _create("lesson_sections",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("lesson_id", sa.Integer(), sa.ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False), sa.Column("section_type", sa.String(30), nullable=False),
        sa.Column("content", sa.JSON(), nullable=False), sa.Column("position", sa.Integer(), nullable=False),
        constraints=(sa.UniqueConstraint("lesson_id", "position", name="uq_lesson_section_position"),))
    _create("user_vocabulary",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("vocabulary_id", sa.Integer(), sa.ForeignKey("vocabulary.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("status", sa.String(20), nullable=False), sa.Column("is_favorite", sa.Boolean(), nullable=False),
        sa.Column("ease_factor", sa.Float(), nullable=False), sa.Column("interval_days", sa.Integer(), nullable=False),
        sa.Column("repetitions", sa.Integer(), nullable=False), sa.Column("last_reviewed_at", sa.DateTime(timezone=True)),
        sa.Column("next_review_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")))
    _create("vocabulary_reviews",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_vocabulary_id", sa.Integer(), sa.ForeignKey("user_vocabulary.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False), sa.Column("interval_days", sa.Integer(), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("next_review_at", sa.DateTime(timezone=True)))
    _create("grammar_topics",
        sa.Column("id", sa.Integer(), primary_key=True), sa.Column("title", sa.String(180), nullable=False),
        sa.Column("cefr_level", sa.String(2), nullable=False), sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("examples", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")))
    _create("exercises",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("lesson_id", sa.Integer(), sa.ForeignKey("lessons.id", ondelete="SET NULL")),
        sa.Column("grammar_topic_id", sa.Integer(), sa.ForeignKey("grammar_topics.id", ondelete="SET NULL")),
        sa.Column("title", sa.String(200), nullable=False), sa.Column("instructions", sa.Text()),
        sa.Column("exercise_type", sa.String(40), nullable=False), sa.Column("cefr_level", sa.String(2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")))
    _create("exercise_questions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("exercise_id", sa.Integer(), sa.ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False), sa.Column("options", sa.JSON(), nullable=False),
        sa.Column("correct_answer", sa.JSON(), nullable=False), sa.Column("explanation", sa.Text()),
        sa.Column("position", sa.Integer(), nullable=False),
        constraints=(sa.UniqueConstraint("exercise_id", "position", name="uq_exercise_question_position"),))
    _create("exercise_attempts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("exercise_id", sa.Integer(), sa.ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False),
        sa.Column("answers", sa.JSON(), nullable=False), sa.Column("score", sa.Float(), nullable=False),
        sa.Column("max_score", sa.Float(), nullable=False), sa.Column("feedback", sa.JSON(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")))
    _create("conversations",
        sa.Column("id", sa.Integer(), primary_key=True), sa.Column("title", sa.String(200)),
        sa.Column("scenario", sa.String(160)), sa.Column("cefr_level", sa.String(2), nullable=False),
        sa.Column("status", sa.String(20), nullable=False), sa.Column("feedback", sa.JSON(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("ended_at", sa.DateTime(timezone=True)))
    _create("conversation_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("conversation_id", sa.Integer(), sa.ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(20), nullable=False), sa.Column("content", sa.Text(), nullable=False),
        sa.Column("feedback", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")))
    _create("learning_progress",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("activity_date", sa.Date(), nullable=False), sa.Column("activity_type", sa.String(30), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=False), sa.Column("words_learned", sa.Integer(), nullable=False),
        sa.Column("score", sa.Float()), sa.Column("cefr_level", sa.String(2)), sa.Column("details", sa.JSON(), nullable=False))

    indexes = {
        "learning_plans": ("is_active",),
        "lessons": ("plan_id", "cefr_level", "topic", "status", "scheduled_for"),
        "lesson_sections": ("lesson_id",), "vocabulary": ("word", "cefr_level"),
        "user_vocabulary": ("status", "is_favorite", "next_review_at"),
        "vocabulary_reviews": ("user_vocabulary_id", "reviewed_at"), "grammar_topics": ("cefr_level",),
        "exercises": ("lesson_id", "grammar_topic_id", "cefr_level"), "exercise_questions": ("exercise_id",),
        "exercise_attempts": ("exercise_id", "completed_at"), "conversations": ("status",),
        "conversation_messages": ("conversation_id", "created_at"),
        "learning_progress": ("recorded_at", "activity_date", "activity_type"),
    }
    for table, columns in indexes.items():
        for column in columns:
            op.create_index(f"ix_{table}_{column}", table, [column])


def downgrade():
    for table in (
        "learning_progress", "conversation_messages", "conversations", "exercise_attempts",
        "exercise_questions", "exercises", "grammar_topics", "vocabulary_reviews", "user_vocabulary",
        "lesson_sections", "lessons", "vocabulary_category_links", "vocabulary", "vocabulary_categories",
        "learning_plans", "learning_profile",
    ):
        op.drop_table(table)
