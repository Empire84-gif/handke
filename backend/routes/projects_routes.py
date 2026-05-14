from flask import Blueprint, jsonify, request, session

from utils.db import get_connection, row_to_dict, rows_to_list
from utils.security import now_text

projects_bp = Blueprint("projects", __name__, url_prefix="/api/projects")


def require_auth():
    return session.get("user_id") is not None


def get_project_by_id(project_id):
    connection = get_connection()

    project = connection.execute("""
        SELECT *
        FROM projects
        WHERE id = ?
        LIMIT 1
    """, (project_id,)).fetchone()

    connection.close()

    return row_to_dict(project)


@projects_bp.get("")
def get_projects():
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    query = (request.args.get("query") or "").strip().lower()
    status = (request.args.get("status") or "").strip()

    connection = get_connection()

    sql = """
        SELECT *
        FROM projects
        WHERE 1 = 1
    """

    params = []

    if query:
        sql += """
            AND (
                LOWER(name) LIKE ?
                OR LOWER(client_name) LIKE ?
                OR LOWER(client_person) LIKE ?
                OR LOWER(type) LIKE ?
                OR LOWER(stage) LIKE ?
                OR LOWER(description) LIKE ?
                OR LOWER(goal) LIKE ?
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

    sql += " ORDER BY created_at DESC, id DESC"

    projects = connection.execute(sql, params).fetchall()
    connection.close()

    return jsonify({
        "projects": rows_to_list(projects)
    }), 200


@projects_bp.get("/<int:project_id>")
def get_project(project_id):
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    project = get_project_by_id(project_id)

    if not project:
        return jsonify({
            "message": "Projekt nie istnieje."
        }), 404

    return jsonify({
        "project": project
    }), 200


@projects_bp.post("")
def create_project():
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    data = request.get_json(silent=True) or {}

    name = (data.get("name") or "").strip()

    if not name:
        return jsonify({
            "message": "Podaj nazwę projektu."
        }), 400

    current_time = now_text()

    values = {
        "name": name,
        "client_name": (data.get("client_name") or "").strip(),
        "client_person": (data.get("client_person") or "").strip(),
        "type": (data.get("type") or "CRM").strip(),
        "status": (data.get("status") or "Brief").strip(),
        "stage": (data.get("stage") or "Analiza").strip(),
        "priority": (data.get("priority") or "Normalny").strip(),
        "progress": int(data.get("progress") or 0),
        "value": (data.get("value") or "").strip(),
        "start_date": (data.get("start_date") or "").strip(),
        "deadline": (data.get("deadline") or "").strip(),
        "owner": (data.get("owner") or "").strip(),
        "offer_number": (data.get("offer_number") or "").strip(),
        "description": (data.get("description") or "").strip(),
        "goal": (data.get("goal") or "").strip(),
        "scope": (data.get("scope") or "").strip(),
        "technologies": (data.get("technologies") or "").strip(),
        "notes": (data.get("notes") or "").strip(),
    }

    connection = get_connection()

    cursor = connection.execute("""
        INSERT INTO projects (
            name,
            client_name,
            client_person,
            type,
            status,
            stage,
            priority,
            progress,
            value,
            start_date,
            deadline,
            owner,
            offer_number,
            description,
            goal,
            scope,
            technologies,
            notes,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        values["name"],
        values["client_name"],
        values["client_person"],
        values["type"],
        values["status"],
        values["stage"],
        values["priority"],
        values["progress"],
        values["value"],
        values["start_date"],
        values["deadline"],
        values["owner"],
        values["offer_number"],
        values["description"],
        values["goal"],
        values["scope"],
        values["technologies"],
        values["notes"],
        current_time,
        current_time,
    ))

    project_id = cursor.lastrowid

    connection.commit()

    project = connection.execute("""
        SELECT *
        FROM projects
        WHERE id = ?
        LIMIT 1
    """, (project_id,)).fetchone()

    connection.close()

    return jsonify({
        "message": "Projekt został dodany.",
        "project": row_to_dict(project),
    }), 201


@projects_bp.put("/<int:project_id>")
def update_project(project_id):
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    data = request.get_json(silent=True) or {}

    name = (data.get("name") or "").strip()

    if not name:
        return jsonify({
            "message": "Podaj nazwę projektu."
        }), 400

    connection = get_connection()

    existing_project = connection.execute("""
        SELECT id
        FROM projects
        WHERE id = ?
        LIMIT 1
    """, (project_id,)).fetchone()

    if not existing_project:
        connection.close()

        return jsonify({
            "message": "Projekt nie istnieje."
        }), 404

    current_time = now_text()

    connection.execute("""
        UPDATE projects
        SET name = ?,
            client_name = ?,
            client_person = ?,
            type = ?,
            status = ?,
            stage = ?,
            priority = ?,
            progress = ?,
            value = ?,
            start_date = ?,
            deadline = ?,
            owner = ?,
            offer_number = ?,
            description = ?,
            goal = ?,
            scope = ?,
            technologies = ?,
            notes = ?,
            updated_at = ?
        WHERE id = ?
    """, (
        name,
        (data.get("client_name") or "").strip(),
        (data.get("client_person") or "").strip(),
        (data.get("type") or "CRM").strip(),
        (data.get("status") or "Brief").strip(),
        (data.get("stage") or "Analiza").strip(),
        (data.get("priority") or "Normalny").strip(),
        int(data.get("progress") or 0),
        (data.get("value") or "").strip(),
        (data.get("start_date") or "").strip(),
        (data.get("deadline") or "").strip(),
        (data.get("owner") or "").strip(),
        (data.get("offer_number") or "").strip(),
        (data.get("description") or "").strip(),
        (data.get("goal") or "").strip(),
        (data.get("scope") or "").strip(),
        (data.get("technologies") or "").strip(),
        (data.get("notes") or "").strip(),
        current_time,
        project_id,
    ))

    connection.commit()

    updated_project = connection.execute("""
        SELECT *
        FROM projects
        WHERE id = ?
        LIMIT 1
    """, (project_id,)).fetchone()

    connection.close()

    return jsonify({
        "message": "Projekt został zapisany.",
        "project": row_to_dict(updated_project),
    }), 200


@projects_bp.delete("/<int:project_id>")
def delete_project(project_id):
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    connection = get_connection()

    existing_project = connection.execute("""
        SELECT id
        FROM projects
        WHERE id = ?
        LIMIT 1
    """, (project_id,)).fetchone()

    if not existing_project:
        connection.close()

        return jsonify({
            "message": "Projekt nie istnieje."
        }), 404

    connection.execute("""
        DELETE FROM projects
        WHERE id = ?
    """, (project_id,))

    connection.commit()
    connection.close()

    return jsonify({
        "message": "Projekt został usunięty."
    }), 200