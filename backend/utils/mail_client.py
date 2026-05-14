import imaplib
from email import policy
from email.header import decode_header, make_header
from email.parser import BytesParser
from email.utils import getaddresses, parsedate_to_datetime

from config import (
    MAIL_IMAP_HOST,
    MAIL_IMAP_PORT,
    MAIL_IMAP_USE_SSL,
    MAIL_PASSWORD,
    MAIL_USERNAME,
)


def mail_client_is_configured():
    return all([
        MAIL_IMAP_HOST,
        MAIL_IMAP_PORT,
        MAIL_USERNAME,
        MAIL_PASSWORD,
    ])


def decode_text(value):
    if not value:
        return ""

    try:
        return str(make_header(decode_header(value)))
    except Exception:
        return str(value)


def parse_email_address(value):
    if not value:
        return {
            "name": "",
            "email": "",
        }

    parsed = getaddresses([value])

    if not parsed:
        return {
            "name": "",
            "email": "",
        }

    name, email = parsed[0]

    return {
        "name": decode_text(name).strip(),
        "email": (email or "").strip(),
    }


def format_email_date(value):
    if not value:
        return ""

    try:
        parsed_date = parsedate_to_datetime(value)

        if parsed_date:
            return parsed_date.strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return ""

    return ""


def extract_body(message):
    plain_body = ""
    html_body = ""

    if message.is_multipart():
        for part in message.walk():
            content_type = part.get_content_type()
            disposition = (part.get_content_disposition() or "").lower()

            if disposition == "attachment":
                continue

            try:
                content = part.get_content()
            except Exception:
                continue

            if not content:
                continue

            if content_type == "text/plain" and not plain_body:
                plain_body = str(content).strip()

            if content_type == "text/html" and not html_body:
                html_body = str(content).strip()
    else:
        try:
            content = message.get_content()
        except Exception:
            content = ""

        if message.get_content_type() == "text/html":
            html_body = str(content).strip()
        else:
            plain_body = str(content).strip()

    return plain_body or html_body or ""


def extract_attachments(message):
    attachments = []

    if not message.is_multipart():
        return attachments

    for part in message.walk():
        disposition = (part.get_content_disposition() or "").lower()

        if disposition != "attachment":
            continue

        filename = decode_text(part.get_filename() or "")

        if not filename:
            continue

        try:
            content = part.get_payload(decode=True)
        except Exception:
            content = None

        if not content:
            continue

        attachments.append({
            "filename": filename,
            "content": content,
            "mime_type": part.get_content_type() or "application/octet-stream",
            "size_bytes": len(content),
        })

    return attachments


def connect_imap():
    if not mail_client_is_configured():
        raise RuntimeError("Konfiguracja IMAP nie jest ustawiona.")

    if MAIL_IMAP_USE_SSL:
        client = imaplib.IMAP4_SSL(MAIL_IMAP_HOST, MAIL_IMAP_PORT)
    else:
        client = imaplib.IMAP4(MAIL_IMAP_HOST, MAIL_IMAP_PORT)

    client.login(MAIL_USERNAME, MAIL_PASSWORD)

    return client


def fetch_latest_emails(limit=50):
    client = connect_imap()

    try:
        client.select("INBOX")

        status, data = client.uid("search", None, "ALL")

        if status != "OK":
            raise RuntimeError("Nie udało się pobrać listy wiadomości z IMAP.")

        uids = data[0].split()

        if not uids:
            return []

        latest_uids = list(reversed(uids[-limit:]))
        emails = []

        for uid in latest_uids:
            uid_text = uid.decode("utf-8", errors="ignore")

            status, message_data = client.uid("fetch", uid, "(RFC822)")

            if status != "OK" or not message_data:
                continue

            raw_message = None

            for item in message_data:
                if isinstance(item, tuple):
                    raw_message = item[1]
                    break

            if not raw_message:
                continue

            message = BytesParser(policy=policy.default).parsebytes(raw_message)

            sender = parse_email_address(message.get("From", ""))
            recipient = parse_email_address(message.get("To", ""))

            subject = decode_text(message.get("Subject", "")) or "(bez tematu)"
            body = extract_body(message)
            attachments = extract_attachments(message)

            attachment_names = [
                attachment["filename"]
                for attachment in attachments
                if attachment.get("filename")
            ]

            emails.append({
                "imap_uid": uid_text,
                "from_name": sender["name"],
                "from_email": sender["email"],
                "to_email": recipient["email"],
                "subject": subject,
                "body": body,
                "preview": body[:180],
                "created_at": format_email_date(message.get("Date", "")),
                "has_attachment": 1 if attachments else 0,
                "attachment_name": ", ".join(attachment_names),
                "attachments": attachments,
            })

        return emails
    finally:
        try:
            client.logout()
        except Exception:
            pass