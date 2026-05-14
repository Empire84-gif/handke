import secrets
from datetime import datetime, timedelta

from werkzeug.security import generate_password_hash, check_password_hash


def now_text():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def normalize_email(email):
    return (email or "").strip().lower()


def hash_password(password):
    return generate_password_hash(password)


def check_password(password_hash, password):
    if not password_hash or not password:
        return False

    return check_password_hash(password_hash, password)


def generate_reset_token():
    return secrets.token_urlsafe(48)


def reset_token_expiry(hours=1):
    return (datetime.now() + timedelta(hours=hours)).strftime("%Y-%m-%d %H:%M:%S")


def is_expired(date_text):
    if not date_text:
        return True

    try:
        expiry_date = datetime.strptime(date_text, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return True

    return datetime.now() > expiry_date