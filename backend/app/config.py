import os


class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", "sqlite:///english_coach.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    _redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    RATELIMIT_STORAGE_URI = os.getenv(
        "RATELIMIT_STORAGE_URI", _redis_url.rsplit("/", 1)[0] + "/1"
    )
    MAX_CONTENT_LENGTH = 1024 * 1024

