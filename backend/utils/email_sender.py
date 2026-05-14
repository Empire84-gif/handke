import mimetypes
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


def build_recipients(to_email, cc=None, bcc=None):
    recipients = [
        email.strip()
        for email in str(to_email or "").split(",")
        if email.strip()
    ]

    if cc:
        recipients.extend([
            email.strip()
            for email in str(cc).split(",")
            if email.strip()
        ])

    if bcc:
        recipients.extend([
            email.strip()
            for email in str(bcc).split(",")
            if email.strip()
        ])

    return recipients


def add_attachments_to_message(message, attachments=None):
    if not attachments:
        return

    for attachment in attachments:
        filename = attachment.get("filename") or "attachment"
        content = attachment.get("content") or b""
        content_type = attachment.get("content_type") or ""

        guessed_type, _ = mimetypes.guess_type(filename)

        if not content_type:
            content_type = guessed_type or "application/octet-stream"

        if "/" in content_type:
            maintype, subtype = content_type.split("/", 1)
        else:
            maintype, subtype = "application", "octet-stream"

        message.add_attachment(
            content,
            maintype=maintype,
            subtype=subtype,
            filename=filename,
        )


def send_email(
    to_email,
    subject,
    text_body,
    html_body=None,
    cc=None,
    bcc=None,
    attachments=None,
):
    if not smtp_is_configured():
        raise RuntimeError("SMTP nie jest skonfigurowany.")

    if not to_email:
        raise RuntimeError("Brak adresu odbiorcy.")

    recipients = build_recipients(to_email, cc=cc, bcc=bcc)

    if not recipients:
        raise RuntimeError("Brak poprawnych adresów odbiorców.")

    message = EmailMessage()
    message["Subject"] = subject or "(bez tematu)"
    message["From"] = formataddr((SMTP_FROM_NAME, SMTP_FROM_EMAIL))
    message["To"] = to_email

    if cc:
        message["Cc"] = cc

    message.set_content(text_body or "")

    if html_body:
        message.add_alternative(html_body, subtype="html")

    add_attachments_to_message(message, attachments)

    if SMTP_USE_SSL:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=30) as smtp:
            smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
            smtp.send_message(message, to_addrs=recipients)
    else:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as smtp:
            smtp.starttls()
            smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
            smtp.send_message(message, to_addrs=recipients)