from utils.db import get_connection


def create_projects_table():
    connection = get_connection()

    connection.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            client_name TEXT,
            client_person TEXT,
            type TEXT DEFAULT 'CRM',
            status TEXT NOT NULL DEFAULT 'Brief',
            stage TEXT DEFAULT 'Analiza',
            priority TEXT DEFAULT 'Normalny',
            progress INTEGER DEFAULT 0,
            value TEXT,
            start_date TEXT,
            deadline TEXT,
            owner TEXT,
            offer_number TEXT,
            description TEXT,
            goal TEXT,
            scope TEXT,
            technologies TEXT,
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

    print("Tabela projects została utworzona lub już istniała.")
    print("Aktualne tabele w bazie:")

    for table in tables:
        print("-", table["name"])


if __name__ == "__main__":
    create_projects_table()