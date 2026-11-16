from datetime import date, datetime

from flask import request
from flask_restx import Namespace, Resource
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.extensions import db
from app.models import (
    Conversation,
    ConversationMessage,
    Exercise,
    ExerciseAttempt,
    ExerciseQuestion,
    GrammarTopic,
    LearningPlan,
    LearningProgress,
    Lesson,
    LessonSection,
    UserVocabulary,
    Vocabulary,
    VocabularyCategory,
    VocabularyReview,
)
from app.models.vocabulary import VocabularyCategory as Category

api = Namespace("learning", description="Learning plans, content, practice and progress", path="/learning")
PAGE_DEFAULT = 20
PAGE_MAX = 100


def _error(code, message, status, **details):
    error = {"code": code, "message": message}
    if details:
        error["details"] = details
    return {"error": error}, status


def _serialize(instance):
    result = {}
    for column in instance.__table__.columns:
        if instance.__tablename__ == "exercise_questions" and column.name == "correct_answer":
            continue
        value = getattr(instance, column.name)
        if isinstance(value, (date, datetime)):
            value = value.isoformat()
        result[column.name] = value
    return result


def _coerce_value(column, value):
    if value is None:
        if not column.nullable and column.default is None and column.server_default is None:
            raise ValueError("null is not allowed")
        return None

    kind = column.type
    if isinstance(kind, db.Boolean):
        if not isinstance(value, bool):
            raise ValueError("must be a boolean")
        return value
    if isinstance(kind, db.Integer):
        if isinstance(value, bool) or not isinstance(value, int):
            raise ValueError("must be an integer")
        return value
    if isinstance(kind, db.Float):
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError("must be a number")
        return float(value)
    if isinstance(kind, db.DateTime):
        if not isinstance(value, str):
            raise ValueError("must be an ISO date-time string")
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as error:
            raise ValueError("must be an ISO date-time string") from error
    if isinstance(kind, db.Date):
        if not isinstance(value, str):
            raise ValueError("must be an ISO date string")
        try:
            return date.fromisoformat(value)
        except ValueError as error:
            raise ValueError("must be an ISO date string") from error
    if isinstance(kind, db.JSON):
        if not isinstance(value, (dict, list, str, int, float, bool)):
            raise ValueError("must be a JSON value")
        return value
    if isinstance(kind, (db.String, db.Text)):
        if not isinstance(value, str):
            raise ValueError("must be a string")
        if getattr(kind, "length", None) and len(value) > kind.length:
            raise ValueError(f"must contain at most {kind.length} characters")
        return value
    return value


class CRUDCollection(Resource):
    model = None
    required_fields = ()
    writable_fields = None
    filter_fields = ()

    def get(self):
        try:
            page = int(request.args.get("page", "1"))
            per_page = int(request.args.get("per_page", str(PAGE_DEFAULT)))
        except ValueError:
            return _error("validation_error", "page and per_page must be integers", 400)
        if page < 1 or per_page < 1 or per_page > PAGE_MAX:
            return _error("validation_error", f"page must be positive and per_page must be 1-{PAGE_MAX}", 400)

        query = self.model.query
        for field in self.filter_fields:
            raw_value = request.args.get(field)
            if raw_value is None:
                continue
            column = getattr(self.model, field)
            try:
                if isinstance(column.property.columns[0].type, db.Boolean):
                    lowered = raw_value.lower()
                    if lowered not in {"true", "false"}:
                        raise ValueError
                    value = lowered == "true"
                elif isinstance(column.property.columns[0].type, db.Integer):
                    value = int(raw_value)
                elif isinstance(column.property.columns[0].type, db.Date):
                    value = date.fromisoformat(raw_value)
                else:
                    value = raw_value
            except ValueError:
                return _error("validation_error", f"Invalid filter value for {field}", 400)
            query = query.filter(column == value)

        if self.model is Vocabulary:
            search = request.args.get("q", "").strip()
            if search:
                pattern = f"%{search}%"
                query = query.filter(db.or_(Vocabulary.word.ilike(pattern), Vocabulary.translation.ilike(pattern)))
            category_id = request.args.get("category_id")
            if category_id is not None:
                try:
                    category_id = int(category_id)
                except ValueError:
                    return _error("validation_error", "category_id must be an integer", 400)
                query = query.join(Vocabulary.categories).filter(VocabularyCategory.id == category_id)

        if self.model is UserVocabulary:
            due_only = request.args.get("due_only")
            if due_only is not None:
                if due_only.lower() not in {"true", "false"}:
                    return _error("validation_error", "due_only must be true or false", 400)
                if due_only.lower() == "true":
                    query = query.filter(
                        db.or_(UserVocabulary.next_review_at.is_(None), UserVocabulary.next_review_at <= db.func.now())
                    )

        query = query.order_by(self.model.id.desc())
        result = query.paginate(page=page, per_page=per_page, error_out=False)
        return {
            "items": [_serialize(item) for item in result.items],
            "pagination": {
                "page": result.page,
                "per_page": result.per_page,
                "total": result.total,
                "pages": result.pages,
            },
        }, 200

    def post(self):
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return _error("validation_error", "A JSON object is required", 400)
        instance, error = self._build(payload, creating=True)
        if error:
            return error
        db.session.add(instance)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return _error("conflict", "The record conflicts with an existing record or reference", 409)
        except SQLAlchemyError:
            db.session.rollback()
            return _error("database_error", "The record could not be saved", 500)
        return {"item": _serialize(instance)}, 201

    def _build(self, payload, creating, instance=None):
        columns = {column.name: column for column in self.model.__table__.columns}
        writable = (
            set(columns) - {"id", "created_at", "updated_at"}
            if self.writable_fields is None
            else set(self.writable_fields)
        )
        unknown = set(payload) - writable
        if unknown:
            return None, _error("validation_error", "Payload contains unsupported fields", 400, fields=sorted(unknown))
        missing = set(self.required_fields) - set(payload) if creating else set()
        if missing:
            return None, _error("validation_error", "Required fields are missing", 400, fields=sorted(missing))

        values = {}
        for name, raw_value in payload.items():
            try:
                values[name] = _coerce_value(columns[name], raw_value)
            except ValueError as error:
                return None, _error("validation_error", f"Invalid value for {name}", 400, reason=str(error))
            if name == "cefr_level" and values[name] not in {"A1", "A2", "B1", "B2", "C1", "C2"}:
                return None, _error("validation_error", "cefr_level must be A1, A2, B1, B2, C1 or C2", 400)
            if name == "rating" and not 0 <= values[name] <= 5:
                return None, _error("validation_error", "rating must be between 0 and 5", 400)
            if name == "position" and values[name] < 0:
                return None, _error("validation_error", "position cannot be negative", 400)
            if name == "status":
                allowed_statuses = {
                    UserVocabulary: {"new", "learning", "learned", "difficult"},
                    Lesson: {"planned", "in_progress", "completed", "skipped"},
                    Conversation: {"active", "completed", "archived"},
                }.get(self.model)
                if allowed_statuses is not None and values[name] not in allowed_statuses:
                    return None, _error("validation_error", f"Invalid status for {self.model.__name__}", 400)
        if creating and "position" not in values:
            parent_field = {
                LessonSection: "lesson_id",
                ExerciseQuestion: "exercise_id",
            }.get(self.model)
            if parent_field and parent_field in values:
                highest_position = db.session.query(db.func.max(self.model.position)).filter_by(
                    **{parent_field: values[parent_field]}
                ).scalar()
                values["position"] = 0 if highest_position is None else highest_position + 1
        instance = instance or self.model()
        for name, value in values.items():
            setattr(instance, name, value)
        return instance, None


class CRUDItem(Resource):
    model = None
    required_fields = ()
    writable_fields = None

    def get(self, item_id):
        instance = db.session.get(self.model, item_id)
        if instance is None:
            return _error("not_found", "Record not found", 404)
        return {"item": _serialize(instance)}, 200

    def put(self, item_id):
        instance = db.session.get(self.model, item_id)
        if instance is None:
            return _error("not_found", "Record not found", 404)
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict) or not payload:
            return _error("validation_error", "A non-empty JSON object is required", 400)
        collection = CRUDCollection()
        collection.model = self.model
        collection.required_fields = self.required_fields
        collection.writable_fields = self.writable_fields
        instance, error = collection._build(payload, creating=False, instance=instance)
        if error:
            return error
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return _error("conflict", "The record conflicts with an existing record or reference", 409)
        except SQLAlchemyError:
            db.session.rollback()
            return _error("database_error", "The record could not be saved", 500)
        return {"item": _serialize(instance)}, 200

    def delete(self, item_id):
        instance = db.session.get(self.model, item_id)
        if instance is None:
            return _error("not_found", "Record not found", 404)
        db.session.delete(instance)
        try:
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            return _error("database_error", "The record could not be deleted", 500)
        return "", 204


def register_crud(name, model, required_fields=(), writable_fields=None, filter_fields=()):
    collection = type(
        f"{name}Collection",
        (CRUDCollection,),
        {"model": model, "required_fields": required_fields, "writable_fields": writable_fields, "filter_fields": filter_fields},
    )
    item = type(
        f"{name}Item",
        (CRUDItem,),
        {"model": model, "required_fields": required_fields, "writable_fields": writable_fields, "filter_fields": filter_fields},
    )
    api.add_resource(collection, f"/{name.replace('_', '-')}", endpoint=f"{name}_collection")
    api.add_resource(item, f"/{name.replace('_', '-')}/<int:item_id>", endpoint=f"{name}_item")


register_crud("plans", LearningPlan, ("title",), filter_fields=("cefr_level", "is_active"))
register_crud("lessons", Lesson, ("title",), filter_fields=("plan_id", "cefr_level", "topic", "status", "scheduled_for"))
register_crud("lesson_sections", LessonSection, ("lesson_id", "title", "section_type"), filter_fields=("lesson_id",))
register_crud("vocabulary", Vocabulary, ("word", "translation"), filter_fields=("cefr_level", "part_of_speech"))
register_crud("vocabulary_categories", VocabularyCategory, ("name",))
register_crud("user_vocabulary", UserVocabulary, ("vocabulary_id",), filter_fields=("status", "is_favorite", "vocabulary_id"))
register_crud("vocabulary_reviews", VocabularyReview, ("user_vocabulary_id", "rating"), writable_fields=(), filter_fields=("user_vocabulary_id", "rating"))
register_crud("grammar_topics", GrammarTopic, ("title", "explanation"), filter_fields=("cefr_level",))
register_crud("exercises", Exercise, ("title",), filter_fields=("lesson_id", "grammar_topic_id", "cefr_level", "exercise_type"))
register_crud("exercise_questions", ExerciseQuestion, ("exercise_id", "prompt", "correct_answer"), filter_fields=("exercise_id",))
register_crud("exercise_attempts", ExerciseAttempt, ("exercise_id",), writable_fields=(), filter_fields=("exercise_id",))
register_crud("conversations", Conversation, filter_fields=("status", "cefr_level"))
register_crud("conversation_messages", ConversationMessage, ("conversation_id", "role", "content"), filter_fields=("conversation_id", "role"))
register_crud("progress", LearningProgress, ("activity_date", "activity_type"), filter_fields=("activity_date", "activity_type", "cefr_level"))


@api.route("/vocabulary/<int:vocabulary_id>/categories")
class VocabularyCategoriesResource(Resource):
    def get(self, vocabulary_id):
        vocabulary = db.session.get(Vocabulary, vocabulary_id)
        if vocabulary is None:
            return _error("not_found", "Vocabulary word not found", 404)
        return {"items": [_serialize(category) for category in vocabulary.categories]}, 200

    def put(self, vocabulary_id):
        vocabulary = db.session.get(Vocabulary, vocabulary_id)
        if vocabulary is None:
            return _error("not_found", "Vocabulary word not found", 404)
        payload = request.get_json(silent=True)
        category_ids = payload.get("category_ids") if isinstance(payload, dict) else None
        if not isinstance(category_ids, list) or any(type(value) is not int for value in category_ids):
            return _error("validation_error", "category_ids must be an array of integer IDs", 400)
        if len(category_ids) != len(set(category_ids)):
            return _error("validation_error", "category_ids cannot contain duplicates", 400)
        categories = Category.query.filter(Category.id.in_(category_ids)).all() if category_ids else []
        if len(categories) != len(category_ids):
            return _error("validation_error", "One or more categories do not exist", 400)
        vocabulary.categories = categories
        try:
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            return _error("database_error", "Categories could not be updated", 500)
        return {"items": [_serialize(category) for category in vocabulary.categories]}, 200
