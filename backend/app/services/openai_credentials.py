import os
from pathlib import Path

from flask import current_app


class CredentialEncryptionUnavailable(RuntimeError):
    """Raised when the optional encryption dependency is missing at runtime."""


def ensure_encryption_available():
    try:
        import cryptography.fernet  # noqa: F401
    except ImportError as error:
        raise CredentialEncryptionUnavailable from error


def _credential_paths():
    instance_dir = Path(current_app.instance_path)
    instance_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(instance_dir, 0o700)
    return instance_dir / "openai-credentials.key", instance_dir / "openai-api-key.enc"


def _cipher():
    ensure_encryption_available()
    try:
        from cryptography.fernet import Fernet
    except ImportError as error:
        raise CredentialEncryptionUnavailable from error

    key_path, _ = _credential_paths()
    try:
        descriptor = os.open(key_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        with os.fdopen(descriptor, "wb") as key_file:
            key_file.write(Fernet.generate_key())
    except FileExistsError:
        pass
    return Fernet(key_path.read_bytes())


def save_api_key(api_key):
    _, credential_path = _credential_paths()
    encrypted = _cipher().encrypt(api_key.encode("utf-8"))
    temporary_path = credential_path.with_suffix(".tmp")
    temporary_path.write_bytes(encrypted)
    os.chmod(temporary_path, 0o600)
    os.replace(temporary_path, credential_path)


def get_api_key():
    _, credential_path = _credential_paths()
    if not credential_path.exists():
        return None
    try:
        return _cipher().decrypt(credential_path.read_bytes()).decode("utf-8")
    except CredentialEncryptionUnavailable:
        raise
    except Exception:
        return None


def remove_api_key():
    _, credential_path = _credential_paths()
    credential_path.unlink(missing_ok=True)

