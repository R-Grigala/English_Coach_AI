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
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.4-mini")
    OPENAI_INPUT_PRICE_PER_MILLION = float(os.getenv("OPENAI_INPUT_PRICE_PER_MILLION", "0"))
    OPENAI_OUTPUT_PRICE_PER_MILLION = float(os.getenv("OPENAI_OUTPUT_PRICE_PER_MILLION", "0"))
    OPENAI_REQUEST_TIMEOUT = int(os.getenv("OPENAI_REQUEST_TIMEOUT", "60"))

