from flask import Blueprint, jsonify, request, session

from utils.db import get_connection, row_to_dict, rows_to_list
from utils.security import now_text
from utils.mail_client import fetch_latest_emails, mail_client_is_configured

mails_bp = Blueprint("mails", __name__, url_prefix="/api/mails")


def require_auth():
    return session.get("user_id") is not None


def get_mail_by_id(mail_id):
    connection = get_connection()

    mail = connection.execute("""
        SELECT *
        FROM mails
        WHERE id = ?
        LIMIT 1
    """, (mail_id,)).fetchone()

    connection.close()

    return row_to_dict(mail)


@mails_bp.get("")
def get_mails():
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    query = (request.args.get("query") or "").strip().lower()
    status = (request.args.get("status") or "").strip()
    folder = (request.args.get("folder") or "").strip()
    direction = (request.args.get("direction") or "").strip()

    connection = get_connection()

    sql = """
        SELECT *
        FROM mails
        WHERE 1 = 1
    """

    params = []

    if query:
        sql += """
            AND (
                LOWER(from_name) LIKE ?
                OR LOWER(from_email) LIKE ?
                OR LOWER(to_email) LIKE ?
                OR LOWER(subject) LIKE ?
                OR LOWER(client_name) LIKE ?
                OR LOWER(project_name) LIKE ?
                OR LOWER(preview) LIKE ?
                OR LOWER(body) LIKE ?
                OR LOWER(notes) LIKE ?
                OR LOWER(tags) LIKE ?
            )
        """

        search_value = f"%{query}%"
        params.extend([
            search_value,
            search_value,
            search_value,
            search_value,
            search_value,
            search_value,
            search_value,
            search_value,
            search_value,
            search_value,
        ])

    if status and status != "Wszystkie":
        sql += " AND status = ?"
        params.append(status)

    if folder and folder != "Wszystkie":
        sql += " AND folder = ?"
        params.append(folder)

    if direction and direction != "Wszystkie":
        sql += " AND direction = ?"
        params.append(direction)

    sql += " ORDER BY created_at DESC, id DESC"

    mails = connection.execute(sql, params).fetchall()
    connection.close()

    return jsonify({
        "mails": rows_to_list(mails)
    }), 200

@mails_bp.post("/sync")
def sync_mails():
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    if not mail_client_is_configured():
        return jsonify({
            "message": "Skrzynka mailowa nie jest skonfigurowana po stronie backendu."
        }), 400

    data = request.get_json(silent=True) or {}
    limit = int(data.get("limit") or 25)

    if limit < 1:
        limit = 25

    if limit > 100:
        limit = 100

    try:
        fetched_mails = fetch_latest_emails(limit=limit)
    except Exception as error:
        print("")
        print("========================================")
        print("BŁĄD SYNCHRONIZACJI MAILI")
        print(str(error))
        print("========================================")
        print("")

        return jsonify({
            "message": "Nie udało się połączyć ze skrzynką mailową."
        }), 500

    connection = get_connection()

    created_count = 0
    skipped_count = 0
    current_time = now_text()

    for mail in fetched_mails:
        imap_uid = mail.get("imap_uid") or ""

        if not imap_uid:
            skipped_count += 1
            continue

        existing_mail = connection.execute("""
            SELECT id
            FROM mails
            WHERE tags LIKE ?
            LIMIT 1
        """, (f"%imap_uid:{imap_uid}%",)).fetchone()

        if existing_mail:
            skipped_count += 1
            continue

        mail_created_at = mail.get("created_at") or current_time
        tags = f"IMAP, imap_uid:{imap_uid}"

        connection.execute("""
            INSERT INTO mails (
                direction,
                from_name,
                from_email,
                to_email,
                subject,
                client_name,
                project_name,
                client_status,
                status,
                priority,
                folder,
                preview,
                body,
                notes,
                tags,
                has_attachment,
                attachment_name,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "inbox",
            mail.get("from_name") or "",
            mail.get("from_email") or "",
            mail.get("to_email") or "",
            mail.get("subject") or "(bez tematu)",
            "",
            "",
            "Nieprzypisany",
            "Nieprzeczytany",
            "Normalny",
            "Odebrane",
            mail.get("preview") or "",
            mail.get("body") or "",
            "",
            tags,
            1 if mail.get("has_attachment") else 0,
            mail.get("attachment_name") or "",
            mail_created_at,
            current_time,
        ))

        created_count += 1

    connection.commit()
    connection.close()

    return jsonify({
        "message": f"Synchronizacja zakończona. Dodano: {created_count}, pominięto: {skipped_count}.",
        "created_count": created_count,
        "skipped_count": skipped_count,
    }), 200

@mails_bp.get("/<int:mail_id>")
def get_mail(mail_id):
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    mail = get_mail_by_id(mail_id)

    if not mail:
        return jsonify({
            "message": "Mail nie istnieje."
        }), 404

    return jsonify({
        "mail": mail
    }), 200


@mails_bp.post("")
def create_mail():
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    data = request.get_json(silent=True) or {}

    subject = (data.get("subject") or "").strip()

    if not subject:
        return jsonify({
            "message": "Podaj temat maila."
        }), 400

    current_time = now_text()

    values = {
        "direction": (data.get("direction") or "inbox").strip(),
        "from_name": (data.get("from_name") or "").strip(),
        "from_email": (data.get("from_email") or "").strip(),
        "to_email": (data.get("to_email") or "").strip(),
        "subject": subject,
        "client_name": (data.get("client_name") or "").strip(),
        "project_name": (data.get("project_name") or "").strip(),
        "client_status": (data.get("client_status") or "Nieprzypisany").strip(),
        "status": (data.get("status") or "Do odpowiedzi").strip(),
        "priority": (data.get("priority") or "Normalny").strip(),
        "folder": (data.get("folder") or "Odebrane").strip(),
        "preview": (data.get("preview") or "").strip(),
        "body": (data.get("body") or "").strip(),
        "notes": (data.get("notes") or "").strip(),
        "tags": (data.get("tags") or "").strip(),
        "has_attachment": 1 if data.get("has_attachment") else 0,
        "attachment_name": (data.get("attachment_name") or "").strip(),
    }

    connection = get_connection()

    cursor = connection.execute("""
        INSERT INTO mails (
            direction,
            from_name,
            from_email,
            to_email,
            subject,
            client_name,
            project_name,
            client_status,
            status,
            priority,
            folder,
            preview,
            body,
            notes,
            tags,
            has_attachment,
            attachment_name,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        values["direction"],
        values["from_name"],
        values["from_email"],
        values["to_email"],
        values["subject"],
        values["client_name"],
        values["project_name"],
        values["client_status"],
        values["status"],
        values["priority"],
        values["folder"],
        values["preview"],
        values["body"],
        values["notes"],
        values["tags"],
        values["has_attachment"],
        values["attachment_name"],
        current_time,
        current_time,
    ))

    mail_id = cursor.lastrowid

    connection.commit()

    mail = connection.execute("""
        SELECT *
        FROM mails
        WHERE id = ?
        LIMIT 1
    """, (mail_id,)).fetchone()

    connection.close()

    return jsonify({
        "message": "Mail został dodany.",
        "mail": row_to_dict(mail),
    }), 201


@mails_bp.put("/<int:mail_id>")
def update_mail(mail_id):
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    data = request.get_json(silent=True) or {}

    subject = (data.get("subject") or "").strip()

    if not subject:
        return jsonify({
            "message": "Podaj temat maila."
        }), 400

    connection = get_connection()

    existing_mail = connection.execute("""
        SELECT id
        FROM mails
        WHERE id = ?
        LIMIT 1
    """, (mail_id,)).fetchone()

    if not existing_mail:
        connection.close()

        return jsonify({
            "message": "Mail nie istnieje."
        }), 404

    current_time = now_text()

    connection.execute("""
        UPDATE mails
        SET direction = ?,
            from_name = ?,
            from_email = ?,
            to_email = ?,
            subject = ?,
            client_name = ?,
            project_name = ?,
            client_status = ?,
            status = ?,
            priority = ?,
            folder = ?,
            preview = ?,
            body = ?,
            notes = ?,
            tags = ?,
            has_attachment = ?,
            attachment_name = ?,
            updated_at = ?
        WHERE id = ?
    """, (
        (data.get("direction") or "inbox").strip(),
        (data.get("from_name") or "").strip(),
        (data.get("from_email") or "").strip(),
        (data.get("to_email") or "").strip(),
        subject,
        (data.get("client_name") or "").strip(),
        (data.get("project_name") or "").strip(),
        (data.get("client_status") or "Nieprzypisany").strip(),
        (data.get("status") or "Do odpowiedzi").strip(),
        (data.get("priority") or "Normalny").strip(),
        (data.get("folder") or "Odebrane").strip(),
        (data.get("preview") or "").strip(),
        (data.get("body") or "").strip(),
        (data.get("notes") or "").strip(),
        (data.get("tags") or "").strip(),
        1 if data.get("has_attachment") else 0,
        (data.get("attachment_name") or "").strip(),
        current_time,
        mail_id,
    ))

    connection.commit()

    updated_mail = connection.execute("""
        SELECT *
        FROM mails
        WHERE id = ?
        LIMIT 1
    """, (mail_id,)).fetchone()

    connection.close()

    return jsonify({
        "message": "Mail został zapisany.",
        "mail": row_to_dict(updated_mail),
    }), 200


@mails_bp.delete("/<int:mail_id>")
def delete_mail(mail_id):
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    connection = get_connection()

    existing_mail = connection.execute("""
        SELECT id
        FROM mails
        WHERE id = ?
        LIMIT 1
    """, (mail_id,)).fetchone()

    if not existing_mail:
        connection.close()

        return jsonify({
            "message": "Mail nie istnieje."
        }), 404

    connection.execute("""
        DELETE FROM mails
        WHERE id = ?
    """, (mail_id,))

    connection.commit()
    connection.close()

    return jsonify({
        "message": "Mail został usunięty."
    }), 200