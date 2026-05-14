from flask import Blueprint, jsonify, request, session

from utils.db import get_connection, row_to_dict, rows_to_list
from utils.security import now_text

payments_bp = Blueprint("payments", __name__, url_prefix="/api/payments")


def require_auth():
    return session.get("user_id") is not None


def get_payment_by_id(payment_id):
    connection = get_connection()

    payment = connection.execute("""
        SELECT *
        FROM payments
        WHERE id = ?
        LIMIT 1
    """, (payment_id,)).fetchone()

    connection.close()

    return row_to_dict(payment)


@payments_bp.get("")
def get_payments():
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    query = (request.args.get("query") or "").strip().lower()
    status = (request.args.get("status") or "").strip()
    payment_type = (request.args.get("type") or "").strip()

    connection = get_connection()

    sql = """
        SELECT *
        FROM payments
        WHERE 1 = 1
    """

    params = []

    if query:
        sql += """
            AND (
                LOWER(client_name) LIKE ?
                OR LOWER(contact_person) LIKE ?
                OR LOWER(project_name) LIKE ?
                OR LOWER(title) LIKE ?
                OR LOWER(description) LIKE ?
                OR LOWER(document_number) LIKE ?
                OR LOWER(related_document) LIKE ?
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
            search_value,
        ])

    if status and status != "Wszystkie":
        sql += " AND status = ?"
        params.append(status)

    if payment_type and payment_type != "Wszystkie":
        sql += " AND type = ?"
        params.append(payment_type)

    sql += " ORDER BY created_at DESC, id DESC"

    payments = connection.execute(sql, params).fetchall()
    connection.close()

    return jsonify({
        "payments": rows_to_list(payments)
    }), 200


@payments_bp.get("/<int:payment_id>")
def get_payment(payment_id):
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    payment = get_payment_by_id(payment_id)

    if not payment:
        return jsonify({
            "message": "Płatność nie istnieje."
        }), 404

    return jsonify({
        "payment": payment
    }), 200


@payments_bp.post("")
def create_payment():
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    data = request.get_json(silent=True) or {}

    title = (data.get("title") or "").strip()

    if not title:
        return jsonify({
            "message": "Podaj nazwę płatności."
        }), 400

    current_time = now_text()

    values = {
        "client_name": (data.get("client_name") or "").strip(),
        "contact_person": (data.get("contact_person") or "").strip(),
        "project_name": (data.get("project_name") or "").strip(),
        "title": title,
        "description": (data.get("description") or "").strip(),
        "amount": (data.get("amount") or "").strip(),
        "currency": (data.get("currency") or "PLN").strip(),
        "type": (data.get("type") or "Zaliczka").strip(),
        "status": (data.get("status") or "Planowane").strip(),
        "due_date": (data.get("due_date") or "").strip(),
        "paid_date": (data.get("paid_date") or "").strip(),
        "method": (data.get("method") or "Przelew").strip(),
        "document_number": (data.get("document_number") or "").strip(),
        "related_document": (data.get("related_document") or "").strip(),
        "notes": (data.get("notes") or "").strip(),
    }

    connection = get_connection()

    cursor = connection.execute("""
        INSERT INTO payments (
            client_name,
            contact_person,
            project_name,
            title,
            description,
            amount,
            currency,
            type,
            status,
            due_date,
            paid_date,
            method,
            document_number,
            related_document,
            notes,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        values["client_name"],
        values["contact_person"],
        values["project_name"],
        values["title"],
        values["description"],
        values["amount"],
        values["currency"],
        values["type"],
        values["status"],
        values["due_date"],
        values["paid_date"],
        values["method"],
        values["document_number"],
        values["related_document"],
        values["notes"],
        current_time,
        current_time,
    ))

    payment_id = cursor.lastrowid

    connection.commit()

    payment = connection.execute("""
        SELECT *
        FROM payments
        WHERE id = ?
        LIMIT 1
    """, (payment_id,)).fetchone()

    connection.close()

    return jsonify({
        "message": "Płatność została dodana.",
        "payment": row_to_dict(payment),
    }), 201


@payments_bp.put("/<int:payment_id>")
def update_payment(payment_id):
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    data = request.get_json(silent=True) or {}

    title = (data.get("title") or "").strip()

    if not title:
        return jsonify({
            "message": "Podaj nazwę płatności."
        }), 400

    connection = get_connection()

    existing_payment = connection.execute("""
        SELECT id
        FROM payments
        WHERE id = ?
        LIMIT 1
    """, (payment_id,)).fetchone()

    if not existing_payment:
        connection.close()

        return jsonify({
            "message": "Płatność nie istnieje."
        }), 404

    current_time = now_text()

    connection.execute("""
        UPDATE payments
        SET client_name = ?,
            contact_person = ?,
            project_name = ?,
            title = ?,
            description = ?,
            amount = ?,
            currency = ?,
            type = ?,
            status = ?,
            due_date = ?,
            paid_date = ?,
            method = ?,
            document_number = ?,
            related_document = ?,
            notes = ?,
            updated_at = ?
        WHERE id = ?
    """, (
        (data.get("client_name") or "").strip(),
        (data.get("contact_person") or "").strip(),
        (data.get("project_name") or "").strip(),
        title,
        (data.get("description") or "").strip(),
        (data.get("amount") or "").strip(),
        (data.get("currency") or "PLN").strip(),
        (data.get("type") or "Zaliczka").strip(),
        (data.get("status") or "Planowane").strip(),
        (data.get("due_date") or "").strip(),
        (data.get("paid_date") or "").strip(),
        (data.get("method") or "Przelew").strip(),
        (data.get("document_number") or "").strip(),
        (data.get("related_document") or "").strip(),
        (data.get("notes") or "").strip(),
        current_time,
        payment_id,
    ))

    connection.commit()

    updated_payment = connection.execute("""
        SELECT *
        FROM payments
        WHERE id = ?
        LIMIT 1
    """, (payment_id,)).fetchone()

    connection.close()

    return jsonify({
        "message": "Płatność została zapisana.",
        "payment": row_to_dict(updated_payment),
    }), 200


@payments_bp.delete("/<int:payment_id>")
def delete_payment(payment_id):
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    connection = get_connection()

    existing_payment = connection.execute("""
        SELECT id
        FROM payments
        WHERE id = ?
        LIMIT 1
    """, (payment_id,)).fetchone()

    if not existing_payment:
        connection.close()

        return jsonify({
            "message": "Płatność nie istnieje."
        }), 404

    connection.execute("""
        DELETE FROM payments
        WHERE id = ?
    """, (payment_id,))

    connection.commit()
    connection.close()

    return jsonify({
        "message": "Płatność została usunięta."
    }), 200