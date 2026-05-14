from utils.db import get_connection


def create_mails_table():
    connection = get_connection()

    connection.execute("""
        CREATE TABLE IF NOT EXISTS mails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            direction TEXT NOT NULL DEFAULT 'inbox',
            from_name TEXT,
            from_email TEXT,
            to_email TEXT,
            subject TEXT NOT NULL,
            client_name TEXT,
            project_name TEXT,
            client_status TEXT DEFAULT 'Nieprzypisany',
            status TEXT NOT NULL DEFAULT 'Do odpowiedzi',
            priority TEXT DEFAULT 'Normalny',
            folder TEXT DEFAULT 'Odebrane',
            preview TEXT,
            body TEXT,
            notes TEXT,
            tags TEXT,
            has_attachment INTEGER DEFAULT 0,
            attachment_name TEXT,
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

    print("Tabela mails została utworzona lub już istniała.")
    print("Aktualne tabele w bazie:")

    for table in tables:
        print("-", table["name"])


if __name__ == "__main__":
    create_mails_table()