from datetime import date, datetime, time, timedelta, timezone
import json

from flask import request
from flask_restx import Namespace, Resource
from sqlalchemy import func

from app.extensions import db
from app.models import (
    Conversation,
    Exercise,
    ExerciseAttempt,
    ExerciseQuestion,
    LearningPlan,
    LearningProgress,
    Lesson,
    LearningProfile,
    UserVocabulary,
    Vocabulary,
    VocabularyReview,
)

api = Namespace("learning_actions", description="Learning workflows and progress", path="/learning")


def _error(code, message, status, **details):
    payload = {"code": code, "message": message}
    if details:
        payload["details"] = details
    return {"error": payload}, status


def _iso(value):
    return value.isoformat() if value is not None else None


def _serialize_vocabulary(word):
    return {
        "id": word.id,
        "word": word.word,
        "translation": word.translation,
        "pronunciation": word.pronunciation,
        "part_of_speech": word.part_of_speech,
        "cefr_level": word.cefr_level,
        "examples": word.examples,
        "categories": [{"id": category.id, "name": category.name} for category in word.categories],
    }


def _serialize_state(state):
    return {
        "id": state.id,
        "vocabulary_id": state.vocabulary_id,
        "status": state.status,
        "is_favorite": state.is_favorite,
        "ease_factor": state.ease_factor,
        "interval_days": state.interval_days,
        "repetitions": state.repetitions,
        "last_reviewed_at": _iso(state.last_reviewed_at),
        "next_review_at": _iso(state.next_review_at),
        "vocabulary": _serialize_vocabulary(state.vocabulary),
    }


class VocabularyReviewQueue(Resource):
    def get(self):
        try:
            page = max(1, int(request.args.get("page", "1")))
            per_page = min(100, max(1, int(request.args.get("per_page", "20"))))
        except ValueError:
            return _error("validation_error", "page and per_page must be integers", 400)
        now = datetime.now(timezone.utc)
        query = UserVocabulary.query.filter(
            db.or_(UserVocabulary.next_review_at.is_(None), UserVocabulary.next_review_at <= now)
        ).order_by(UserVocabulary.next_review_at.asc().nullsfirst(), UserVocabulary.id.asc())
        result = query.paginate(page=page, per_page=per_page, error_out=False)
        return {
            "items": [_serialize_state(state) for state in result.items],
            "pagination": {"page": result.page, "per_page": result.per_page, "total": result.total, "pages": result.pages},
        }, 200


class VocabularyReviewResource(Resource):
    def post(self, vocabulary_id):
        word = db.session.get(Vocabulary, vocabulary_id)
        if word is None:
            return _error("not_found", "Vocabulary word not found", 404)
        payload = request.get_json(silent=True)
        rating = payload.get("rating") if isinstance(payload, dict) else None
        if type(rating) is not int or not 0 <= rating <= 5:
            return _error("validation_error", "rating must be an integer from 0 to 5", 400)

        state = UserVocabulary.query.filter_by(vocabulary_id=word.id).first()
        if state is None:
            state = UserVocabulary(vocabulary_id=word.id)
            db.session.add(state)
            db.session.flush()

        now = datetime.now(timezone.utc)
        old_ease = state.ease_factor or 2.5
        state.ease_factor = max(1.3, old_ease + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02)))
        if rating < 3:
            state.repetitions = 0
            interval_days = 1
            state.status = "difficult"
        else:
            if state.repetitions == 0:
                interval_days = 1
            elif state.repetitions == 1:
                interval_days = 6
            else:
                interval_days = max(1, round(state.interval_days * state.ease_factor))
            state.repetitions += 1
            state.status = "learned" if state.repetitions >= 3 else "learning"

        state.interval_days = interval_days
        state.last_reviewed_at = now
        state.next_review_at = now + timedelta(days=interval_days)
        review = VocabularyReview(
            learner_state=state,
            rating=rating,
            interval_days=interval_days,
            reviewed_at=now,
            next_review_at=state.next_review_at,
        )
        db.session.add(review)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return {
            "review": {
                "id": review.id,
                "rating": review.rating,
                "reviewed_at": _iso(review.reviewed_at),
                "interval_days": review.interval_days,
                "next_review_at": _iso(review.next_review_at),
            },
            "progress": _serialize_state(state),
        }, 201


class LessonTodayResource(Resource):
    def get(self):
        today = date.today()
        lessons = Lesson.query.filter_by(scheduled_for=today).order_by(Lesson.id.asc()).all()
        return {"date": today.isoformat(), "items": [{"id": lesson.id, "title": lesson.title, "status": lesson.status, "cefr_level": lesson.cefr_level, "topic": lesson.topic} for lesson in lessons]}, 200


class LessonHistoryResource(Resource):
    def get(self):
        try:
            page = max(1, int(request.args.get("page", "1")))
            per_page = min(100, max(1, int(request.args.get("per_page", "20"))))
        except ValueError:
            return _error("validation_error", "page and per_page must be integers", 400)
        result = Lesson.query.filter_by(status="completed").order_by(Lesson.completed_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        items = [{"id": lesson.id, "title": lesson.title, "cefr_level": lesson.cefr_level, "topic": lesson.topic, "completed_at": _iso(lesson.completed_at)} for lesson in result.items]
        return {"items": items, "pagination": {"page": result.page, "per_page": result.per_page, "total": result.total, "pages": result.pages}}, 200


class WeeklyPlanResource(Resource):
    def get(self):
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        plan = LearningPlan.query.filter_by(is_active=True).order_by(LearningPlan.created_at.desc()).first()
        query = Lesson.query.filter(Lesson.scheduled_for.between(week_start, week_end))
        if plan is not None:
            query = query.filter(Lesson.plan_id == plan.id)
        lessons = query.order_by(Lesson.scheduled_for.asc(), Lesson.id.asc()).all()
        return {
            "week_start": week_start.isoformat(),
            "week_end": week_end.isoformat(),
            "plan": {"id": plan.id, "title": plan.title, "cefr_level": plan.cefr_level} if plan else None,
            "items": [{"id": lesson.id, "title": lesson.title, "scheduled_for": _iso(lesson.scheduled_for), "status": lesson.status} for lesson in lessons],
        }, 200


class LessonCompleteResource(Resource):
    def post(self, lesson_id):
        lesson = db.session.get(Lesson, lesson_id)
        if lesson is None:
            return _error("not_found", "Lesson not found", 404)
        if lesson.status == "completed":
            return {"lesson": {"id": lesson.id, "status": lesson.status, "completed_at": _iso(lesson.completed_at)}}, 200
        now = datetime.now(timezone.utc)
        lesson.status = "completed"
        lesson.completed_at = now
        db.session.add(LearningProgress(
            activity_date=now.date(), activity_type="lesson", duration_seconds=0,
            words_learned=0, details={"lesson_id": lesson.id, "title": lesson.title},
        ))
        db.session.commit()
        return {"lesson": {"id": lesson.id, "status": lesson.status, "completed_at": _iso(lesson.completed_at)}}, 200


def _normalize_answer(value):
    if isinstance(value, str):
        return " ".join(value.casefold().split())
    return json.dumps(value, sort_keys=True, ensure_ascii=False)


class ExerciseSubmitResource(Resource):
    def post(self, exercise_id):
        exercise = db.session.get(Exercise, exercise_id)
        if exercise is None:
            return _error("not_found", "Exercise not found", 404)
        payload = request.get_json(silent=True)
        raw_answers = payload.get("answers") if isinstance(payload, dict) else None
        if isinstance(raw_answers, dict):
            answers = {}
            for question_id, answer in raw_answers.items():
                try:
                    answers[int(question_id)] = answer
                except (TypeError, ValueError):
                    return _error("validation_error", "Answer keys must be question IDs", 400)
        elif isinstance(raw_answers, list):
            try:
                answers = {int(item["question_id"]): item["answer"] for item in raw_answers if isinstance(item, dict)}
            except (KeyError, TypeError, ValueError):
                return _error("validation_error", "Each answer must include question_id and answer", 400)
            if len(answers) != len(raw_answers):
                return _error("validation_error", "Each answer must include a unique question_id and answer", 400)
        else:
            return _error("validation_error", "answers must be an object or array", 400)

        questions = ExerciseQuestion.query.filter_by(exercise_id=exercise.id).order_by(ExerciseQuestion.position).all()
        if not questions:
            return _error("validation_error", "Exercise has no questions", 409)
        question_ids = {question.id for question in questions}
        if set(answers) - question_ids:
            return _error("validation_error", "Answers contain a question that does not belong to this exercise", 400)

        feedback = []
        correct_count = 0
        for question in questions:
            submitted = answers.get(question.id)
            expected_answers = question.correct_answer if isinstance(question.correct_answer, list) else [question.correct_answer]
            correct = any(_normalize_answer(submitted) == _normalize_answer(expected) for expected in expected_answers)
            correct_count += int(correct)
            feedback.append({
                "question_id": question.id,
                "is_correct": correct,
                "explanation": question.explanation,
                "correct_answer": question.correct_answer,
            })

        now = datetime.now(timezone.utc)
        total = len(questions)
        percentage = round((correct_count / total) * 100, 2)
        attempt = ExerciseAttempt(
            exercise_id=exercise.id,
            answers=[{"question_id": question_id, "answer": answer} for question_id, answer in answers.items()],
            score=correct_count,
            max_score=total,
            feedback={"questions": feedback, "percentage": percentage},
            completed_at=now,
        )
        db.session.add(attempt)
        db.session.flush()
        db.session.add(LearningProgress(
            activity_date=now.date(), activity_type="exercise", duration_seconds=0,
            words_learned=0, score=percentage,
            cefr_level=exercise.cefr_level,
            details={"exercise_id": exercise.id, "attempt_id": attempt.id},
        ))
        db.session.commit()
        return {"attempt": {"id": attempt.id, "score": attempt.score, "max_score": attempt.max_score, "percentage": percentage, "feedback": attempt.feedback}}, 201


class ProgressSummaryResource(Resource):
    def get(self):
        today = date.today()
        since = today - timedelta(days=6)
        total = db.session.query(
            func.coalesce(func.sum(LearningProgress.duration_seconds), 0),
            func.coalesce(func.sum(LearningProgress.words_learned), 0),
            func.count(LearningProgress.id),
        ).filter(LearningProgress.activity_date >= since).one()

        active_dates = {
            row[0] for row in db.session.query(LearningProgress.activity_date)
            .filter(LearningProgress.activity_date <= today)
            .distinct().all()
        }
        cursor = today if today in active_dates else today - timedelta(days=1)
        streak = 0
        while cursor in active_dates:
            streak += 1
            cursor -= timedelta(days=1)

        cutoff = datetime.combine(today - timedelta(days=29), time.min, tzinfo=timezone.utc)
        review_counts = db.session.query(
            func.count(VocabularyReview.id),
            func.sum(db.case((VocabularyReview.rating >= 3, 1), else_=0)),
        ).filter(VocabularyReview.reviewed_at >= cutoff).one()
        review_total = review_counts[0] or 0
        retained = review_counts[1] or 0
        retention = round((retained / review_total) * 100, 2) if review_total else None

        level_rows = LearningProgress.query.filter(LearningProgress.cefr_level.isnot(None)).order_by(
            LearningProgress.activity_date.asc(), LearningProgress.id.asc()
        ).all()
        profile = db.session.get(LearningProfile, 1)
        return {
            "current_cefr_level": profile.cefr_level if profile else "A2",
            "cefr_history": {
                "first_recorded": level_rows[0].cefr_level if level_rows else None,
                "latest_recorded": level_rows[-1].cefr_level if level_rows else None,
            },
            "last_7_days": {"duration_seconds": int(total[0]), "words_learned": int(total[1]), "activities": total[2]},
            "daily_streak": streak,
            "vocabulary_retention_30d_percent": retention,
            "vocabulary_reviews_30d": review_total,
        }, 200


api.add_resource(VocabularyReviewQueue, "/vocabulary/review-queue")
api.add_resource(VocabularyReviewResource, "/vocabulary/<int:vocabulary_id>/review")
api.add_resource(LessonTodayResource, "/lessons/today")
api.add_resource(LessonHistoryResource, "/lessons/history")
api.add_resource(WeeklyPlanResource, "/plans/weekly")
api.add_resource(LessonCompleteResource, "/lessons/<int:lesson_id>/complete")
api.add_resource(ExerciseSubmitResource, "/exercises/<int:exercise_id>/submit")
api.add_resource(ProgressSummaryResource, "/progress/summary")
