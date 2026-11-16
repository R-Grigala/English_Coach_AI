from app.extensions import db


vocabulary_category_links = db.Table(
    "vocabulary_category_links",
    db.Column("vocabulary_id", db.Integer, db.ForeignKey("vocabulary.id", ondelete="CASCADE"), primary_key=True),
    db.Column("category_id", db.Integer, db.ForeignKey("vocabulary_categories.id", ondelete="CASCADE"), primary_key=True),
)


class VocabularyCategory(db.Model):
    __tablename__ = "vocabulary_categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())

    words = db.relationship("Vocabulary", secondary=vocabulary_category_links, back_populates="categories")


class Vocabulary(db.Model):
    __tablename__ = "vocabulary"
    __table_args__ = (db.UniqueConstraint("word", "part_of_speech", name="uq_vocabulary_word_pos"),)

    id = db.Column(db.Integer, primary_key=True)
    word = db.Column(db.String(160), nullable=False, index=True)
    translation = db.Column(db.String(240), nullable=False)
    pronunciation = db.Column(db.String(240))
    part_of_speech = db.Column(db.String(40), nullable=False, default="other")
    cefr_level = db.Column(db.String(2), nullable=False, default="A2", index=True)
    examples = db.Column(db.JSON, nullable=False, default=list)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())

    categories = db.relationship("VocabularyCategory", secondary=vocabulary_category_links, back_populates="words")
    learner_state = db.relationship("UserVocabulary", back_populates="vocabulary", uselist=False, cascade="all, delete-orphan")


class UserVocabulary(db.Model):
    """Vocabulary progress for this installation's single learner."""

    __tablename__ = "user_vocabulary"

    id = db.Column(db.Integer, primary_key=True)
    vocabulary_id = db.Column(db.Integer, db.ForeignKey("vocabulary.id", ondelete="CASCADE"), nullable=False, unique=True)
    status = db.Column(db.String(20), nullable=False, default="new", index=True)
    is_favorite = db.Column(db.Boolean, nullable=False, default=False, index=True)
    ease_factor = db.Column(db.Float, nullable=False, default=2.5)
    interval_days = db.Column(db.Integer, nullable=False, default=0)
    repetitions = db.Column(db.Integer, nullable=False, default=0)
    last_reviewed_at = db.Column(db.DateTime(timezone=True))
    next_review_at = db.Column(db.DateTime(timezone=True), index=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())

    vocabulary = db.relationship("Vocabulary", back_populates="learner_state")
    reviews = db.relationship("VocabularyReview", back_populates="learner_state", cascade="all, delete-orphan", order_by="VocabularyReview.reviewed_at")


class VocabularyReview(db.Model):
    __tablename__ = "vocabulary_reviews"

    id = db.Column(db.Integer, primary_key=True)
    user_vocabulary_id = db.Column(db.Integer, db.ForeignKey("user_vocabulary.id", ondelete="CASCADE"), nullable=False, index=True)
    rating = db.Column(db.Integer, nullable=False)
    interval_days = db.Column(db.Integer, nullable=False, default=0)
    reviewed_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now(), index=True)
    next_review_at = db.Column(db.DateTime(timezone=True), nullable=True)

    learner_state = db.relationship("UserVocabulary", back_populates="reviews")
