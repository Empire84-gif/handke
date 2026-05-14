from utils.db import get_connection


def create_tasks_table():
    connection = get_connection()

    connection.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            client_name TEXT,
            status TEXT NOT NULL DEFAULT 'Do zrobienia',
            priority TEXT NOT NULL DEFAULT 'Normalny',
            due_date TEXT,
            note TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    connection.commit()

    tables = connection.execute("""
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
        ORDER BY name
    """).fetchall()

    connection.close()

    print("Tabela tasks została utworzona lub już istniała.")
    print("Aktualne tabele w bazie:")

    for table in tables:
        print("-", table["name"])


if __name__ == "__main__":
    create_tasks_table()