from flask import Blueprint, jsonify, session

from utils.db import get_connection, rows_to_list

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


def require_auth():
    return session.get("user_id") is not None


def count_rows(connection, table_name):
    row = connection.execute(f"""
        SELECT COUNT(*) AS total
        FROM {table_name}
    """).fetchone()

    return row["total"] if row else 0


def count_where(connection, table_name, where_sql, params=()):
    row = connection.execute(f"""
        SELECT COUNT(*) AS total
        FROM {table_name}
        WHERE {where_sql}
    """, params).fetchone()

    return row["total"] if row else 0


def sum_payments_by_status(connection, status):
    rows = connection.execute("""
        SELECT amount
        FROM payments
        WHERE status = ?
    """, (status,)).fetchall()

    total = 0

    for row in rows:
        raw_amount = row["amount"] or ""
        digits = "".join(character for character in raw_amount if character.isdigit())

        if digits:
            total += int(digits)

    return total


@dashboard_bp.get("")
def get_dashboard():
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    connection = get_connection()

    clients_total = count_rows(connection, "clients")
    tasks_total = count_rows(connection, "tasks")
    tasks_open = count_where(
        connection,
        "tasks",
        "status != ?",
        ("Zrobione",)
    )

    projects_total = count_rows(connection, "projects")
    projects_active = count_where(
        connection,
        "projects",
        "status = ?",
        ("W trakcie",)
    )

    payments_total = count_rows(connection, "payments")
    payments_waiting = count_where(
        connection,
        "payments",
        "status = ?",
        ("Oczekuje",)
    )
    payments_overdue = count_where(
        connection,
        "payments",
        "status = ?",
        ("Po terminie",)
    )

    paid_value = sum_payments_by_status(connection, "Opłacone")
    waiting_value = sum_payments_by_status(connection, "Oczekuje")

    latest_clients = connection.execute("""
        SELECT id, full_name, company_name, email, phone, status, created_at
        FROM clients
        ORDER BY created_at DESC, id DESC
        LIMIT 5
    """).fetchall()

    latest_tasks = connection.execute("""
        SELECT id, title, client_name, status, priority, due_date, created_at
        FROM tasks
        ORDER BY created_at DESC, id DESC
        LIMIT 5
    """).fetchall()

    latest_projects = connection.execute("""
        SELECT id, name, client_name, status, stage, progress, deadline, value, created_at
        FROM projects
        ORDER BY created_at DESC, id DESC
        LIMIT 5
    """).fetchall()

    latest_payments = connection.execute("""
        SELECT id, title, client_name, project_name, amount, currency, status, due_date, created_at
        FROM payments
        ORDER BY created_at DESC, id DESC
        LIMIT 5
    """).fetchall()

    connection.close()

    return jsonify({
        "stats": {
            "clients_total": clients_total,
            "tasks_total": tasks_total,
            "tasks_open": tasks_open,
            "projects_total": projects_total,
            "projects_active": projects_active,
            "payments_total": payments_total,
            "payments_waiting": payments_waiting,
            "payments_overdue": payments_overdue,
            "paid_value": paid_value,
            "waiting_value": waiting_value,
        },
        "latest": {
            "clients": rows_to_list(latest_clients),
            "tasks": rows_to_list(latest_tasks),
            "projects": rows_to_list(latest_projects),
            "payments": rows_to_list(latest_payments),
        }
    }), 200