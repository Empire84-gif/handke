from flask import Blueprint, jsonify, request, session

from utils.db import get_connection, row_to_dict, rows_to_list
from utils.security import now_text

tasks_bp = Blueprint("tasks", __name__, url_prefix="/api/tasks")


def require_auth():
    return session.get("user_id") is not None


def get_task_by_id(task_id):
    connection = get_connection()

    task = connection.execute("""
        SELECT *
        FROM tasks
        WHERE id = ?
        LIMIT 1
    """, (task_id,)).fetchone()

    connection.close()

    return row_to_dict(task)


@tasks_bp.get("")
def get_tasks():
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    query = (request.args.get("query") or "").strip().lower()
    status = (request.args.get("status") or "").strip()

    connection = get_connection()

    sql = """
        SELECT *
        FROM tasks
        WHERE 1 = 1
    """

    params = []

    if query:
        sql += """
            AND (
                LOWER(title) LIKE ?
                OR LOWER(client_name) LIKE ?
                OR LOWER(note) LIKE ?
            )
        """

        search_value = f"%{query}%"
        params.extend([
            search_value,
            search_value,
            search_value,
        ])

    if status and status != "Wszystkie":
        sql += " AND status = ?"
        params.append(status)

    sql += " ORDER BY created_at DESC, id DESC"

    tasks = connection.execute(sql, params).fetchall()
    connection.close()

    return jsonify({
        "tasks": rows_to_list(tasks)
    }), 200


@tasks_bp.get("/<int:task_id>")
def get_task(task_id):
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    task = get_task_by_id(task_id)

    if not task:
        return jsonify({
            "message": "Zadanie nie istnieje."
        }), 404

    return jsonify({
        "task": task
    }), 200


@tasks_bp.post("")
def create_task():
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    data = request.get_json(silent=True) or {}

    title = (data.get("title") or "").strip()

    if not title:
        return jsonify({
            "message": "Podaj nazwę zadania."
        }), 400

    current_time = now_text()

    values = {
        "title": title,
        "client_name": (data.get("client_name") or "").strip(),
        "status": (data.get("status") or "Do zrobienia").strip(),
        "priority": (data.get("priority") or "Normalny").strip(),
        "due_date": (data.get("due_date") or "").strip(),
        "note": (data.get("note") or "").strip(),
    }

    connection = get_connection()

    cursor = connection.execute("""
        INSERT INTO tasks (
            title,
            client_name,
            status,
            priority,
            due_date,
            note,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        values["title"],
        values["client_name"],
        values["status"],
        values["priority"],
        values["due_date"],
        values["note"],
        current_time,
        current_time,
    ))

    task_id = cursor.lastrowid

    connection.commit()

    task = connection.execute("""
        SELECT *
        FROM tasks
        WHERE id = ?
        LIMIT 1
    """, (task_id,)).fetchone()

    connection.close()

    return jsonify({
        "message": "Zadanie zostało dodane.",
        "task": row_to_dict(task),
    }), 201


@tasks_bp.put("/<int:task_id>")
def update_task(task_id):
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    data = request.get_json(silent=True) or {}

    title = (data.get("title") or "").strip()

    if not title:
        return jsonify({
            "message": "Podaj nazwę zadania."
        }), 400

    connection = get_connection()

    existing_task = connection.execute("""
        SELECT id
        FROM tasks
        WHERE id = ?
        LIMIT 1
    """, (task_id,)).fetchone()

    if not existing_task:
        connection.close()

        return jsonify({
            "message": "Zadanie nie istnieje."
        }), 404

    current_time = now_text()

    connection.execute("""
        UPDATE tasks
        SET title = ?,
            client_name = ?,
            status = ?,
            priority = ?,
            due_date = ?,
            note = ?,
            updated_at = ?
        WHERE id = ?
    """, (
        title,
        (data.get("client_name") or "").strip(),
        (data.get("status") or "Do zrobienia").strip(),
        (data.get("priority") or "Normalny").strip(),
        (data.get("due_date") or "").strip(),
        (data.get("note") or "").strip(),
        current_time,
        task_id,
    ))

    connection.commit()

    updated_task = connection.execute("""
        SELECT *
        FROM tasks
        WHERE id = ?
        LIMIT 1
    """, (task_id,)).fetchone()

    connection.close()

    return jsonify({
        "message": "Zadanie zostało zapisane.",
        "task": row_to_dict(updated_task),
    }), 200


@tasks_bp.delete("/<int:task_id>")
def delete_task(task_id):
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    connection = get_connection()

    existing_task = connection.execute("""
        SELECT id
        FROM tasks
        WHERE id = ?
        LIMIT 1
    """, (task_id,)).fetchone()

    if not existing_task:
        connection.close()

        return jsonify({
            "message": "Zadanie nie istnieje."
        }), 404

    connection.execute("""
        DELETE FROM tasks
        WHERE id = ?
    """, (task_id,))

    connection.commit()
    connection.close()

    return jsonify({
        "message": "Zadanie zostało usunięte."
    }), 200