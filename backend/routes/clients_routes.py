from flask import Blueprint, jsonify, request, session

from utils.db import get_connection, row_to_dict, rows_to_list
from utils.security import now_text

clients_bp = Blueprint("clients", __name__, url_prefix="/api/clients")


def require_auth():
    return session.get("user_id") is not None


def get_client_by_id(client_id):
    connection = get_connection()

    client = connection.execute("""
        SELECT *
        FROM clients
        WHERE id = ?
        LIMIT 1
    """, (client_id,)).fetchone()

    connection.close()

    return row_to_dict(client)


@clients_bp.get("")
def get_clients():
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    query = (request.args.get("query") or "").strip().lower()
    status = (request.args.get("status") or "").strip()

    connection = get_connection()

    sql = """
        SELECT *
        FROM clients
        WHERE 1 = 1
    """

    params = []

    if query:
        sql += """
            AND (
                LOWER(full_name) LIKE ?
                OR LOWER(company_name) LIKE ?
                OR LOWER(email) LIKE ?
                OR LOWER(phone) LIKE ?
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
        ])

    if status and status != "Wszystkie":
        sql += " AND status = ?"
        params.append(status)

    sql += " ORDER BY created_at DESC, id DESC"

    clients = connection.execute(sql, params).fetchall()
    connection.close()

    return jsonify({
        "clients": rows_to_list(clients)
    }), 200


@clients_bp.get("/<int:client_id>")
def get_client(client_id):
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    client = get_client_by_id(client_id)

    if not client:
        return jsonify({
            "message": "Klient nie istnieje."
        }), 404

    return jsonify({
        "client": client
    }), 200


@clients_bp.post("")
def create_client():
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    data = request.get_json(silent=True) or {}

    full_name = (data.get("full_name") or "").strip()

    if not full_name:
        return jsonify({
            "message": "Podaj nazwę klienta."
        }), 400

    current_time = now_text()

    values = {
        "full_name": full_name,
        "company_name": (data.get("company_name") or "").strip(),
        "email": (data.get("email") or "").strip(),
        "phone": (data.get("phone") or "").strip(),
        "status": (data.get("status") or "Nowy lead").strip(),
        "source": (data.get("source") or "Ręcznie dodany").strip(),
        "contact_type": (data.get("contact_type") or "Email").strip(),
        "value": (data.get("value") or "").strip(),
        "website": (data.get("website") or "").strip(),
        "address": (data.get("address") or "").strip(),
        "tax_id": (data.get("tax_id") or "").strip(),
        "notes": (data.get("notes") or "").strip(),
    }

    connection = get_connection()

    cursor = connection.execute("""
        INSERT INTO clients (
            full_name,
            company_name,
            email,
            phone,
            status,
            source,
            contact_type,
            value,
            website,
            address,
            tax_id,
            notes,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        values["full_name"],
        values["company_name"],
        values["email"],
        values["phone"],
        values["status"],
        values["source"],
        values["contact_type"],
        values["value"],
        values["website"],
        values["address"],
        values["tax_id"],
        values["notes"],
        current_time,
        current_time,
    ))

    client_id = cursor.lastrowid

    connection.commit()

    client = connection.execute("""
        SELECT *
        FROM clients
        WHERE id = ?
        LIMIT 1
    """, (client_id,)).fetchone()

    connection.close()

    return jsonify({
        "message": "Klient został dodany.",
        "client": row_to_dict(client),
    }), 201


@clients_bp.put("/<int:client_id>")
def update_client(client_id):
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    data = request.get_json(silent=True) or {}

    full_name = (data.get("full_name") or "").strip()

    if not full_name:
        return jsonify({
            "message": "Podaj nazwę klienta."
        }), 400

    connection = get_connection()

    existing_client = connection.execute("""
        SELECT id
        FROM clients
        WHERE id = ?
        LIMIT 1
    """, (client_id,)).fetchone()

    if not existing_client:
        connection.close()

        return jsonify({
            "message": "Klient nie istnieje."
        }), 404

    current_time = now_text()

    connection.execute("""
        UPDATE clients
        SET full_name = ?,
            company_name = ?,
            email = ?,
            phone = ?,
            status = ?,
            source = ?,
            contact_type = ?,
            value = ?,
            website = ?,
            address = ?,
            tax_id = ?,
            notes = ?,
            updated_at = ?
        WHERE id = ?
    """, (
        full_name,
        (data.get("company_name") or "").strip(),
        (data.get("email") or "").strip(),
        (data.get("phone") or "").strip(),
        (data.get("status") or "Nowy lead").strip(),
        (data.get("source") or "Ręcznie dodany").strip(),
        (data.get("contact_type") or "Email").strip(),
        (data.get("value") or "").strip(),
        (data.get("website") or "").strip(),
        (data.get("address") or "").strip(),
        (data.get("tax_id") or "").strip(),
        (data.get("notes") or "").strip(),
        current_time,
        client_id,
    ))

    connection.commit()

    updated_client = connection.execute("""
        SELECT *
        FROM clients
        WHERE id = ?
        LIMIT 1
    """, (client_id,)).fetchone()

    connection.close()

    return jsonify({
        "message": "Klient został zapisany.",
        "client": row_to_dict(updated_client),
    }), 200


@clients_bp.delete("/<int:client_id>")
def delete_client(client_id):
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    connection = get_connection()

    existing_client = connection.execute("""
        SELECT id
        FROM clients
        WHERE id = ?
        LIMIT 1
    """, (client_id,)).fetchone()

    if not existing_client:
        connection.close()

        return jsonify({
            "message": "Klient nie istnieje."
        }), 404

    connection.execute("""
        DELETE FROM clients
        WHERE id = ?
    """, (client_id,))

    connection.commit()
    connection.close()

    return jsonify({
        "message": "Klient został usunięty."
    }), 200