from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from flask import request
from flask_restx import Namespace, Resource

from app.services.openai_credentials import (
    CredentialEncryptionUnavailable,
    ensure_encryption_available,
    get_api_key,
    remove_api_key,
    save_api_key,
)

api = Namespace("integrations", description="External service connections")
OPENAI_MODELS_URL = "https://api.openai.com/v1/models"


def validate_api_key(api_key):
    request_to_openai = Request(
        OPENAI_MODELS_URL,
        headers={"Authorization": f"Bearer {api_key}"},
        method="GET",
    )
    with urlopen(request_to_openai, timeout=15) as response:
        return response.status == 200


@api.route("/openai/", strict_slashes=False)
class OpenAIIntegration(Resource):
    def get(self):
        """Return connection status without revealing the stored API key."""
        try:
            return {"connected": get_api_key() is not None}, 200
        except CredentialEncryptionUnavailable:
            return {
                "connected": False,
                "message": "Backend image must be rebuilt to install credential encryption.",
            }, 503

    def post(self):
        """Validate and store an OpenAI API key encrypted on the backend."""
        payload = request.get_json(silent=True)
        api_key = payload.get("api_key") if isinstance(payload, dict) else None
        if not isinstance(api_key, str) or not api_key.strip():
            return {"message": "შეიყვანე OpenAI API key."}, 400

        api_key = api_key.strip()
        try:
            ensure_encryption_available()
        except CredentialEncryptionUnavailable:
            return {
                "message": "Backend image must be rebuilt to install credential encryption."
            }, 503

        try:
            valid = validate_api_key(api_key)
        except HTTPError as error:
            if error.code in (401, 403):
                return {"message": "API key არასწორია ან ამ მოთხოვნის უფლება არ აქვს."}, 401
            return {"message": "OpenAI API-მ კავშირის შემოწმება ვერ დაასრულა."}, 502
        except (URLError, TimeoutError, OSError):
            return {"message": "OpenAI API-სთან დაკავშირება ვერ მოხერხდა."}, 502

        if not valid:
            return {"message": "OpenAI API key ვერ დადასტურდა."}, 401

        try:
            save_api_key(api_key)
        except CredentialEncryptionUnavailable:
            return {
                "message": "Backend image must be rebuilt to install credential encryption."
            }, 503
        except (OSError, ValueError):
            return {"message": "API key უსაფრთხოდ შენახვა ვერ მოხერხდა."}, 500
        return {"connected": True}, 200

    def delete(self):
        """Disconnect OpenAI and remove the encrypted API key."""
        try:
            remove_api_key()
        except OSError:
            return {"message": "API key წაშლა ვერ მოხერხდა."}, 500
        return {"connected": False}, 200
