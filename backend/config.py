import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

DATABASE_PATH = Path(
    os.getenv(
        "DATABASE_PATH",
        BASE_DIR / "database" / "crm.db",
    )
)

SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    SECRET_KEY = "local-dev-secret-key-change-before-production"

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

APP_ENV = os.getenv("APP_ENV", "development").lower()
IS_PRODUCTION = APP_ENV == "production"

SESSION_COOKIE_NAME = os.getenv("SESSION_COOKIE_NAME", "crm_session")
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = os.getenv(
    "SESSION_COOKIE_SAMESITE",
    "None" if IS_PRODUCTION else "Lax",
)
SESSION_COOKIE_SECURE = os.getenv(
    "SESSION_COOKIE_SECURE",
    "true" if IS_PRODUCTION else "false",
).lower() == "true"

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USE_SSL = os.getenv("SMTP_USE_SSL", "true").lower() == "true"
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USERNAME)
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "SDE CRM")

MAIL_IMAP_HOST = os.getenv("MAIL_IMAP_HOST", "")
MAIL_IMAP_PORT = int(os.getenv("MAIL_IMAP_PORT", "993"))
MAIL_IMAP_USE_SSL = os.getenv("MAIL_IMAP_USE_SSL", "true").lower() == "true"

MAIL_USERNAME = os.getenv("MAIL_USERNAME", SMTP_USERNAME)
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", SMTP_PASSWORD)
MAIL_FROM_EMAIL = os.getenv("MAIL_FROM_EMAIL", MAIL_USERNAME)
MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", SMTP_FROM_NAME or "SDE CRM")