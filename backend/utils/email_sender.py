import smtplib
from email.message import EmailMessage
from email.utils import formataddr

from config import (
    SMTP_FROM_EMAIL,
    SMTP_FROM_NAME,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_USERNAME,
    SMTP_USE_SSL,
)


def smtp_is_configured():
    return all([
        SMTP_HOST,
        SMTP_PORT,
        SMTP_USERNAME,
        SMTP_PASSWORD,
        SMTP_FROM_EMAIL,
    ])


def send_email(to_email, subject, text_body, html_body=None):
    if not smtp_is_configured():
        raise RuntimeError("SMTP nie jest skonfigurowany.")

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = formataddr((SMTP_FROM_NAME, SMTP_FROM_EMAIL))
    message["To"] = to_email

    message.set_content(text_body)

    if html_body:
        message.add_alternative(html_body, subtype="html")

    if SMTP_USE_SSL:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=30) as smtp:
            smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
            smtp.send_message(message)
    else:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as smtp:
            smtp.starttls()
            smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
            smtp.send_message(message)