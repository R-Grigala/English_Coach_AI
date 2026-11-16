from app.extensions import db


class GrammarTopic(db.Model):
    __tablename__ = "grammar_topics"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(180), nullable=False)
    cefr_level = db.Column(db.String(2), nullable=False, default="A2", index=True)
    explanation = db.Column(db.Text, nullable=False)
    examples = db.Column(db.JSON, nullable=False, default=list)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())

    exercises = db.relationship("Exercise", back_populates="grammar_topic")


class Exercise(db.Model):
    __tablename__ = "exercises"

    id = db.Column(db.Integer, primary_key=True)
    lesson_id = db.Column(db.Integer, db.ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True, index=True)
    grammar_topic_id = db.Column(db.Integer, db.ForeignKey("grammar_topics.id", ondelete="SET NULL"), nullable=True, index=True)
    title = db.Column(db.String(200), nullable=False)
    instructions = db.Column(db.Text)
    exercise_type = db.Column(db.String(40), nullable=False, default="multiple_choice")
    cefr_level = db.Column(db.String(2), nullable=False, default="A2", index=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())

    grammar_topic = db.relationship("GrammarTopic", back_populates="exercises")
    questions = db.relationship("ExerciseQuestion", back_populates="exercise", cascade="all, delete-orphan", order_by="ExerciseQuestion.position")
    attempts = db.relationship("ExerciseAttempt", back_populates="exercise", cascade="all, delete-orphan")


class ExerciseQuestion(db.Model):
    __tablename__ = "exercise_questions"
    __table_args__ = (db.UniqueConstraint("exercise_id", "position", name="uq_exercise_question_position"),)

    id = db.Column(db.Integer, primary_key=True)
    exercise_id = db.Column(db.Integer, db.ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False, index=True)
    prompt = db.Column(db.Text, nullable=False)
    options = db.Column(db.JSON, nullable=False, default=list)
    correct_answer = db.Column(db.JSON, nullable=False)
    explanation = db.Column(db.Text)
    position = db.Column(db.Integer, nullable=False, default=0)

    exercise = db.relationship("Exercise", back_populates="questions")


class ExerciseAttempt(db.Model):
    __tablename__ = "exercise_attempts"

    id = db.Column(db.Integer, primary_key=True)
    exercise_id = db.Column(db.Integer, db.ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False, index=True)
    answers = db.Column(db.JSON, nullable=False, default=list)
    score = db.Column(db.Float, nullable=False, default=0)
    max_score = db.Column(db.Float, nullable=False, default=0)
    feedback = db.Column(db.JSON, nullable=False, default=dict)
    completed_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now(), index=True)

    exercise = db.relationship("Exercise", back_populates="attempts")


class Conversation(db.Model):
    __tablename__ = "conversations"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=True)
    scenario = db.Column(db.String(160), nullable=True)
    cefr_level = db.Column(db.String(2), nullable=False, default="A2")
    status = db.Column(db.String(20), nullable=False, default="active", index=True)
    feedback = db.Column(db.JSON, nullable=False, default=dict)
    started_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())
    ended_at = db.Column(db.DateTime(timezone=True), nullable=True)

    messages = db.relationship("ConversationMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="ConversationMessage.created_at")


class ConversationMessage(db.Model):
    __tablename__ = "conversation_messages"

    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = db.Column(db.String(20), nullable=False)
    content = db.Column(db.Text, nullable=False)
    feedback = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now(), index=True)

    conversation = db.relationship("Conversation", back_populates="messages")
