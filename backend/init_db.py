import os

from utils.db import get_connection
from utils.security import hash_password, now_text, normalize_email


def ensure_column(connection, table_name, column_name, column_definition):
    columns = connection.execute(f"PRAGMA table_info({table_name})").fetchall()
    existing_columns = [column["name"] for column in columns]

    if column_name not in existing_columns:
        connection.execute(
            f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}"
        )


def create_users_table(connection):
    connection.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'admin',
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)


def create_password_resets_table(connection):
    connection.execute("""
        CREATE TABLE IF NOT EXISTS password_resets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT NOT NULL UNIQUE,
            expires_at TEXT NOT NULL,
            used_at TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)


def create_settings_table(connection):
    connection.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            app_name TEXT DEFAULT 'SDE CRM',
            company_name TEXT,
            brand_name TEXT,
            email TEXT,
            phone TEXT,
            website TEXT,
            address_line_1 TEXT,
            address_line_2 TEXT,
            address_line_3 TEXT,
            registry_code TEXT,
            vat_eu TEXT,
            logo_path TEXT,
            default_currency TEXT DEFAULT 'PLN',
            theme_mode TEXT DEFAULT 'Jasny',
            interface_density TEXT DEFAULT 'Kompaktowa',
            primary_color TEXT DEFAULT '#111111',
            button_style TEXT DEFAULT 'Outline',
            default_client_status TEXT DEFAULT 'Nowy lead',
            default_client_source TEXT DEFAULT 'Ręcznie dodany',
            default_contact_type TEXT DEFAULT 'Email',
            no_contact_after_days TEXT DEFAULT '7 dni',
            log_client_created INTEGER DEFAULT 1,
            log_status_changes INTEGER DEFAULT 1,
            log_data_edits INTEGER DEFAULT 1,
            combine_notes_and_logs INTEGER DEFAULT 1,
            default_history_view TEXT DEFAULT 'Wszystko',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    settings_columns = [
        ("app_name", "TEXT DEFAULT 'SDE CRM'"),
        ("default_currency", "TEXT DEFAULT 'PLN'"),
        ("theme_mode", "TEXT DEFAULT 'Jasny'"),
        ("interface_density", "TEXT DEFAULT 'Kompaktowa'"),
        ("primary_color", "TEXT DEFAULT '#111111'"),
        ("button_style", "TEXT DEFAULT 'Outline'"),
        ("default_client_status", "TEXT DEFAULT 'Nowy lead'"),
        ("default_client_source", "TEXT DEFAULT 'Ręcznie dodany'"),
        ("default_contact_type", "TEXT DEFAULT 'Email'"),
        ("no_contact_after_days", "TEXT DEFAULT '7 dni'"),
        ("log_client_created", "INTEGER DEFAULT 1"),
        ("log_status_changes", "INTEGER DEFAULT 1"),
        ("log_data_edits", "INTEGER DEFAULT 1"),
        ("combine_notes_and_logs", "INTEGER DEFAULT 1"),
        ("default_history_view", "TEXT DEFAULT 'Wszystko'"),
    ]

    for column_name, column_definition in settings_columns:
        ensure_column(connection, "settings", column_name, column_definition)


def create_clients_table(connection):
    connection.execute("""
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            company_name TEXT,
            email TEXT,
            phone TEXT,
            status TEXT NOT NULL DEFAULT 'Nowy lead',
            source TEXT NOT NULL DEFAULT 'Ręcznie dodany',
            contact_type TEXT DEFAULT 'Email',
            value TEXT,
            website TEXT,
            address TEXT,
            tax_id TEXT,
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)


def create_tasks_table(connection):
    connection.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            client_name TEXT,
            status TEXT NOT NULL DEFAULT 'Do zrobienia',
            priority TEXT DEFAULT 'Normalny',
            due_date TEXT,
            note TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)


def create_projects_table(connection):
    connection.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            client_name TEXT,
            client_person TEXT,
            type TEXT DEFAULT 'CRM',
            status TEXT DEFAULT 'Brief',
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


def create_payments_table(connection):
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
            status TEXT DEFAULT 'Planowane',
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


def create_documents_table(connection):
    connection.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_type TEXT DEFAULT 'Oferta',
            document_number TEXT,
            title TEXT NOT NULL,
            client_name TEXT,
            contact_person TEXT,
            project_name TEXT,
            status TEXT DEFAULT 'Roboczy',
            amount TEXT,
            currency TEXT DEFAULT 'PLN',
            issue_date TEXT,
            due_date TEXT,
            valid_until TEXT,
            content TEXT,
            notes TEXT,
            payload_json TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    ensure_column(connection, "documents", "payload_json", "TEXT")


def create_mails_table(connection):
    connection.execute("""
        CREATE TABLE IF NOT EXISTS mails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            direction TEXT DEFAULT 'inbox',
            from_name TEXT,
            from_email TEXT,
            to_email TEXT,
            subject TEXT NOT NULL,
            client_name TEXT,
            project_name TEXT,
            client_status TEXT DEFAULT 'Nieprzypisany',
            status TEXT DEFAULT 'Do odpowiedzi',
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


def create_tables():
    connection = get_connection()

    create_users_table(connection)
    create_password_resets_table(connection)
    create_settings_table(connection)
    create_clients_table(connection)
    create_tasks_table(connection)
    create_projects_table(connection)
    create_payments_table(connection)
    create_documents_table(connection)
    create_mails_table(connection)
    create_mail_attachments_table(connection)

    connection.commit()
    connection.close()

    print("Tabele zostały utworzone lub sprawdzone.")


def create_default_admin():
    connection = get_connection()

    admin_email = normalize_email(
        os.getenv("ADMIN_EMAIL", "office@handkeholding.com")
    )
    admin_password = os.getenv("ADMIN_PASSWORD")
    admin_name = os.getenv("ADMIN_NAME", "Karl Handke")

    existing_user = connection.execute("""
        SELECT id
        FROM users
        WHERE email = ?
        LIMIT 1
    """, (admin_email,)).fetchone()

    if existing_user:
        connection.close()
        print("Admin już istnieje. Hasło nie zostało nadpisane.")
        return

    if not admin_password:
        connection.close()
        print("Nie utworzono admina: brakuje ADMIN_PASSWORD w zmiennych środowiskowych.")
        return

    if len(admin_password) < 8:
        connection.close()
        print("Nie utworzono admina: ADMIN_PASSWORD musi mieć minimum 8 znaków.")
        return

    current_time = now_text()

    connection.execute("""
        INSERT INTO users (
            full_name,
            email,
            password_hash,
            role,
            is_active,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        admin_name,
        admin_email,
        hash_password(admin_password),
        "admin",
        1,
        current_time,
        current_time,
    ))

    connection.commit()
    connection.close()

    print("Utworzono admina z danych ENV.")
    print(f"Email: {admin_email}")
    print("Hasło: ustawione z ADMIN_PASSWORD.")
    print("Po pierwszym logowaniu zmień hasło.")


def create_default_settings():
    connection = get_connection()

    existing_settings = connection.execute("""
        SELECT id
        FROM settings
        WHERE id = 1
        LIMIT 1
    """).fetchone()

    if existing_settings:
        connection.close()
        print("Ustawienia firmy już istnieją.")
        return

    current_time = now_text()

    connection.execute("""
        INSERT INTO settings (
            id,
            app_name,
            company_name,
            brand_name,
            email,
            phone,
            website,
            address_line_1,
            address_line_2,
            address_line_3,
            registry_code,
            vat_eu,
            logo_path,
            default_currency,
            theme_mode,
            interface_density,
            primary_color,
            button_style,
            default_client_status,
            default_client_source,
            default_contact_type,
            no_contact_after_days,
            log_client_created,
            log_status_changes,
            log_data_edits,
            combine_notes_and_logs,
            default_history_view,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        1,
        "SDE CRM",
        "Handke Holding OÜ",
        "SDE",
        "office@handkeholding.com",
        "+372 5617 1770",
        "https://www.hansacareers.ee",
        "Harju maakond, Kesklinna linnaosa",
        "Sakala tn 7-2, 10141 Tallinn",
        "Republic of Estonia",
        "17387477",
        "EE102932869",
        "",
        "PLN",
        "Jasny",
        "Kompaktowa",
        "#111111",
        "Outline",
        "Nowy lead",
        "Ręcznie dodany",
        "Email",
        "7 dni",
        1,
        1,
        1,
        1,
        "Wszystko",
        current_time,
        current_time,
    ))

    connection.commit()
    connection.close()

    print("Utworzono domyślne ustawienia firmy.")


def run_init():
    create_tables()
    create_default_admin()
    create_default_settings()
    print("Baza danych gotowa.")



def create_mail_attachments_table(connection):
    connection.execute("""
        CREATE TABLE IF NOT EXISTS mail_attachments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mail_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            file_path TEXT NOT NULL,
            mime_type TEXT,
            size_bytes INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (mail_id) REFERENCES mails(id) ON DELETE CASCADE
        )
    """)




if __name__ == "__main__":
    run_init()