from utils.db import get_connection


def create_documents_table():
    connection = get_connection()

    connection.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_type TEXT NOT NULL DEFAULT 'Oferta',
            document_number TEXT,
            title TEXT NOT NULL,
            client_name TEXT,
            contact_person TEXT,
            project_name TEXT,
            status TEXT NOT NULL DEFAULT 'Roboczy',
            amount TEXT,
            currency TEXT DEFAULT 'PLN',
            issue_date TEXT,
            due_date TEXT,
            valid_until TEXT,
            content TEXT,
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

    print("Tabela documents została utworzona lub już istniała.")
    print("Aktualne tabele w bazie:")

    for table in tables:
        print("-", table["name"])


if __name__ == "__main__":
    create_documents_table()