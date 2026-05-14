from datetime import datetime

from flask import Blueprint, jsonify, request, session

from utils.db import get_connection, row_to_dict, rows_to_list
from utils.security import now_text

documents_bp = Blueprint("documents", __name__, url_prefix="/api/documents")


def require_auth():
    return session.get("user_id") is not None


def get_document_by_id(document_id):
    connection = get_connection()

    document = connection.execute("""
        SELECT *
        FROM documents
        WHERE id = ?
        LIMIT 1
    """, (document_id,)).fetchone()

    connection.close()

    return row_to_dict(document)


def get_document_prefix(document_type):
    prefixes = {
        "Oferta": "OF",
        "Faktura": "FV",
        "Umowa": "UM",
        "Notatka": "NT",
        "Inny": "DOC",
    }

    return prefixes.get(document_type, "DOC")


def generate_next_document_number(document_type):
    current_year = datetime.now().year
    prefix = get_document_prefix(document_type)
    number_prefix = f"{prefix}/{current_year}/"

    connection = get_connection()

    rows = connection.execute("""
        SELECT document_number
        FROM documents
        WHERE document_number LIKE ?
    """, (f"{number_prefix}%",)).fetchall()

    connection.close()

    highest_number = 0

    for row in rows:
        document_number = row["document_number"] or ""

        try:
            last_part = document_number.split("/")[-1]
            numeric_value = int(last_part)

            if numeric_value > highest_number:
                highest_number = numeric_value
        except (ValueError, IndexError):
            continue

    next_number = highest_number + 1

    return f"{number_prefix}{next_number:03d}"


@documents_bp.get("")
def get_documents():
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    query = (request.args.get("query") or "").strip().lower()
    status = (request.args.get("status") or "").strip()
    document_type = (request.args.get("type") or "").strip()

    connection = get_connection()

    sql = """
        SELECT *
        FROM documents
        WHERE 1 = 1
    """

    params = []

    if query:
        sql += """
            AND (
                LOWER(title) LIKE ?
                OR LOWER(document_number) LIKE ?
                OR LOWER(client_name) LIKE ?
                OR LOWER(contact_person) LIKE ?
                OR LOWER(project_name) LIKE ?
                OR LOWER(content) LIKE ?
                OR LOWER(notes) LIKE ?
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
        ])

    if status and status != "Wszystkie":
        sql += " AND status = ?"
        params.append(status)

    if document_type and document_type != "Wszystkie":
        sql += " AND document_type = ?"
        params.append(document_type)

    sql += " ORDER BY created_at DESC, id DESC"

    documents = connection.execute(sql, params).fetchall()
    connection.close()

    return jsonify({
        "documents": rows_to_list(documents)
    }), 200


@documents_bp.get("/next-number")
def get_next_document_number():
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    document_type = (request.args.get("type") or "Oferta").strip()
    document_number = generate_next_document_number(document_type)

    return jsonify({
        "document_number": document_number
    }), 200


@documents_bp.get("/<int:document_id>")
def get_document(document_id):
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    document = get_document_by_id(document_id)

    if not document:
        return jsonify({
            "message": "Dokument nie istnieje."
        }), 404

    return jsonify({
        "document": document
    }), 200


@documents_bp.post("")
def create_document():
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    data = request.get_json(silent=True) or {}

    title = (data.get("title") or "").strip()

    if not title:
        return jsonify({
            "message": "Podaj tytuł dokumentu."
        }), 400

    current_time = now_text()

    values = {
        "document_type": (data.get("document_type") or "Oferta").strip(),
        "document_number": (data.get("document_number") or "").strip(),
        "title": title,
        "client_name": (data.get("client_name") or "").strip(),
        "contact_person": (data.get("contact_person") or "").strip(),
        "project_name": (data.get("project_name") or "").strip(),
        "status": (data.get("status") or "Roboczy").strip(),
        "amount": (data.get("amount") or "").strip(),
        "currency": (data.get("currency") or "PLN").strip(),
        "issue_date": (data.get("issue_date") or "").strip(),
        "due_date": (data.get("due_date") or "").strip(),
        "valid_until": (data.get("valid_until") or "").strip(),
        "content": (data.get("content") or "").strip(),
        "notes": (data.get("notes") or "").strip(),
        "payload_json": (data.get("payload_json") or "").strip(),
    }

    connection = get_connection()

    cursor = connection.execute("""
        INSERT INTO documents (
            document_type,
            document_number,
            title,
            client_name,
            contact_person,
            project_name,
            status,
            amount,
            currency,
            issue_date,
            due_date,
            valid_until,
            content,
            notes,
            payload_json,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        values["document_type"],
        values["document_number"],
        values["title"],
        values["client_name"],
        values["contact_person"],
        values["project_name"],
        values["status"],
        values["amount"],
        values["currency"],
        values["issue_date"],
        values["due_date"],
        values["valid_until"],
        values["content"],
        values["notes"],
        values["payload_json"],
        current_time,
        current_time,
    ))

    document_id = cursor.lastrowid

    connection.commit()

    document = connection.execute("""
        SELECT *
        FROM documents
        WHERE id = ?
        LIMIT 1
    """, (document_id,)).fetchone()

    connection.close()

    return jsonify({
        "message": "Dokument został dodany.",
        "document": row_to_dict(document),
    }), 201


@documents_bp.put("/<int:document_id>")
def update_document(document_id):
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    data = request.get_json(silent=True) or {}

    title = (data.get("title") or "").strip()

    if not title:
        return jsonify({
            "message": "Podaj tytuł dokumentu."
        }), 400

    connection = get_connection()

    existing_document = connection.execute("""
        SELECT id
        FROM documents
        WHERE id = ?
        LIMIT 1
    """, (document_id,)).fetchone()

    if not existing_document:
        connection.close()

        return jsonify({
            "message": "Dokument nie istnieje."
        }), 404

    current_time = now_text()

    connection.execute("""
        UPDATE documents
        SET document_type = ?,
            document_number = ?,
            title = ?,
            client_name = ?,
            contact_person = ?,
            project_name = ?,
            status = ?,
            amount = ?,
            currency = ?,
            issue_date = ?,
            due_date = ?,
            valid_until = ?,
            content = ?,
            notes = ?,
            payload_json = ?,
            updated_at = ?
        WHERE id = ?
    """, (
        (data.get("document_type") or "Oferta").strip(),
        (data.get("document_number") or "").strip(),
        title,
        (data.get("client_name") or "").strip(),
        (data.get("contact_person") or "").strip(),
        (data.get("project_name") or "").strip(),
        (data.get("status") or "Roboczy").strip(),
        (data.get("amount") or "").strip(),
        (data.get("currency") or "PLN").strip(),
        (data.get("issue_date") or "").strip(),
        (data.get("due_date") or "").strip(),
        (data.get("valid_until") or "").strip(),
        (data.get("content") or "").strip(),
        (data.get("notes") or "").strip(),
        (data.get("payload_json") or "").strip(),
        current_time,
        document_id,
    ))

    connection.commit()

    updated_document = connection.execute("""
        SELECT *
        FROM documents
        WHERE id = ?
        LIMIT 1
    """, (document_id,)).fetchone()

    connection.close()

    return jsonify({
        "message": "Dokument został zapisany.",
        "document": row_to_dict(updated_document),
    }), 200


@documents_bp.delete("/<int:document_id>")
def delete_document(document_id):
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    connection = get_connection()

    existing_document = connection.execute("""
        SELECT id
        FROM documents
        WHERE id = ?
        LIMIT 1
    """, (document_id,)).fetchone()

    if not existing_document:
        connection.close()

        return jsonify({
            "message": "Dokument nie istnieje."
        }), 404

    connection.execute("""
        DELETE FROM documents
        WHERE id = ?
    """, (document_id,))

    connection.commit()
    connection.close()

    return jsonify({
        "message": "Dokument został usunięty."
    }), 200