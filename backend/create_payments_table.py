from utils.db import get_connection


def create_payments_table():
    connection = get_connection()

    connection.execute("""
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_name TEXT,
            contact_person TEXT,
            project_name TEXT,
            title TEXT NOT NULL,
            description TEXT,
            amount TEXT,
            currency TEXT DEFAULT 'PLN',
            type TEXT DEFAULT 'Zaliczka',
            status TEXT NOT NULL DEFAULT 'Planowane',
            due_date TEXT,
            paid_date TEXT,
            method TEXT DEFAULT 'Przelew',
            document_number TEXT,
            related_document TEXT,
            notes TEXT,
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

    print("Tabela payments została utworzona lub już istniała.")
    print("Aktualne tabele w bazie:")

    for table in tables:
        print("-", table["name"])


if __name__ == "__main__":
    create_payments_table()