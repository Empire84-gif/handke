from collections import Counter

from flask import Blueprint, jsonify, session

from utils.db import get_connection, rows_to_list

stats_bp = Blueprint("stats", __name__, url_prefix="/api/stats")


def require_auth():
    return session.get("user_id") is not None


def count_rows(connection, table_name):
    row = connection.execute(f"""
        SELECT COUNT(*) AS total
        FROM {table_name}
    """).fetchone()

    return row["total"] if row else 0


def count_grouped(connection, table_name, column_name):
    rows = connection.execute(f"""
        SELECT {column_name} AS label, COUNT(*) AS total
        FROM {table_name}
        GROUP BY {column_name}
        ORDER BY total DESC
    """).fetchall()

    return rows_to_list(rows)


def sum_payment_amounts(rows):
    total = 0

    for row in rows:
        raw_amount = row["amount"] or ""
        digits = "".join(character for character in raw_amount if character.isdigit())

        if digits:
            total += int(digits)

    return total


def month_label(date_value):
    if not date_value:
        return "Brak daty"

    clean_value = str(date_value)[:7]

    if len(clean_value) != 7 or "-" not in clean_value:
        return "Brak daty"

    year, month = clean_value.split("-")

    return f"{month}.{year}"


@stats_bp.get("")
def get_stats():
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    connection = get_connection()

    clients_total = count_rows(connection, "clients")
    tasks_total = count_rows(connection, "tasks")
    projects_total = count_rows(connection, "projects")
    payments_total = count_rows(connection, "payments")

    clients_by_status = count_grouped(connection, "clients", "status")
    tasks_by_status = count_grouped(connection, "tasks", "status")
    projects_by_status = count_grouped(connection, "projects", "status")
    payments_by_status = count_grouped(connection, "payments", "status")
    payments_by_type = count_grouped(connection, "payments", "type")

    payment_rows = connection.execute("""
        SELECT amount, status, created_at, due_date
        FROM payments
    """).fetchall()

    paid_rows = [row for row in payment_rows if row["status"] == "Opłacone"]
    waiting_rows = [row for row in payment_rows if row["status"] == "Oczekuje"]
    overdue_rows = [row for row in payment_rows if row["status"] == "Po terminie"]

    paid_value = sum_payment_amounts(paid_rows)
    waiting_value = sum_payment_amounts(waiting_rows)
    overdue_value = sum_payment_amounts(overdue_rows)
    total_payment_value = sum_payment_amounts(payment_rows)

    project_rows = connection.execute("""
        SELECT status, stage, type, progress, value, created_at
        FROM projects
    """).fetchall()

    average_progress = 0

    if project_rows:
        total_progress = sum(int(row["progress"] or 0) for row in project_rows)
        average_progress = round(total_progress / len(project_rows))

    clients_rows = connection.execute("""
        SELECT created_at
        FROM clients
    """).fetchall()

    tasks_rows = connection.execute("""
        SELECT created_at
        FROM tasks
    """).fetchall()

    projects_rows = connection.execute("""
        SELECT created_at
        FROM projects
    """).fetchall()

    client_month_counter = Counter(month_label(row["created_at"]) for row in clients_rows)
    task_month_counter = Counter(month_label(row["created_at"]) for row in tasks_rows)
    project_month_counter = Counter(month_label(row["created_at"]) for row in projects_rows)
    payment_month_counter = Counter(month_label(row["created_at"]) for row in payment_rows)

    monthly_activity_labels = sorted(
        set(client_month_counter.keys())
        | set(task_month_counter.keys())
        | set(project_month_counter.keys())
        | set(payment_month_counter.keys())
    )

    monthly_activity = []

    for label in monthly_activity_labels:
        monthly_activity.append({
            "label": label,
            "clients": client_month_counter.get(label, 0),
            "tasks": task_month_counter.get(label, 0),
            "projects": project_month_counter.get(label, 0),
            "payments": payment_month_counter.get(label, 0),
        })

    recent_projects = connection.execute("""
        SELECT id, name, client_name, status, stage, progress, value, deadline
        FROM projects
        ORDER BY created_at DESC, id DESC
        LIMIT 6
    """).fetchall()

    recent_payments = connection.execute("""
        SELECT id, title, client_name, project_name, amount, currency, status, due_date
        FROM payments
        ORDER BY created_at DESC, id DESC
        LIMIT 6
    """).fetchall()

    connection.close()

    return jsonify({
        "summary": {
            "clients_total": clients_total,
            "tasks_total": tasks_total,
            "projects_total": projects_total,
            "payments_total": payments_total,
            "paid_value": paid_value,
            "waiting_value": waiting_value,
            "overdue_value": overdue_value,
            "total_payment_value": total_payment_value,
            "average_project_progress": average_progress,
        },
        "groups": {
            "clients_by_status": clients_by_status,
            "tasks_by_status": tasks_by_status,
            "projects_by_status": projects_by_status,
            "payments_by_status": payments_by_status,
            "payments_by_type": payments_by_type,
        },
        "monthly_activity": monthly_activity,
        "recent": {
            "projects": rows_to_list(recent_projects),
            "payments": rows_to_list(recent_payments),
        }
    }), 200