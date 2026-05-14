from pathlib import Path
from uuid import uuid4

from flask import Blueprint, jsonify, request, send_from_directory, session
from werkzeug.utils import secure_filename

from utils.db import get_connection, row_to_dict
from utils.security import now_text

settings_bp = Blueprint("settings", __name__, url_prefix="/api/settings")

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
LOGO_DIR = UPLOADS_DIR / "logo"

ALLOWED_LOGO_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "svg"}


def require_auth():
    return session.get("user_id") is not None


def allowed_logo_file(filename):
    if "." not in filename:
        return False

    extension = filename.rsplit(".", 1)[1].lower()
    return extension in ALLOWED_LOGO_EXTENSIONS


def ensure_settings_exists(connection):
    existing_settings = connection.execute("""
        SELECT id
        FROM settings
        WHERE id = 1
        LIMIT 1
    """).fetchone()

    if existing_settings:
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


@settings_bp.get("")
def get_settings():
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    connection = get_connection()
    ensure_settings_exists(connection)
    connection.commit()

    settings = connection.execute("""
        SELECT *
        FROM settings
        WHERE id = 1
        LIMIT 1
    """).fetchone()

    connection.close()

    return jsonify({
        "settings": row_to_dict(settings)
    }), 200


@settings_bp.put("")
def update_settings():
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    data = request.get_json(silent=True) or {}

    allowed_fields = [
        "app_name",
        "company_name",
        "brand_name",
        "email",
        "phone",
        "website",
        "address_line_1",
        "address_line_2",
        "address_line_3",
        "registry_code",
        "vat_eu",
        "logo_path",
        "default_currency",
        "theme_mode",
        "interface_density",
        "primary_color",
        "button_style",
        "default_client_status",
        "default_client_source",
        "default_contact_type",
        "no_contact_after_days",
        "log_client_created",
        "log_status_changes",
        "log_data_edits",
        "combine_notes_and_logs",
        "default_history_view",
    ]

    values = {}

    for field in allowed_fields:
        value = data.get(field)

        if field in [
            "log_client_created",
            "log_status_changes",
            "log_data_edits",
            "combine_notes_and_logs",
        ]:
            values[field] = 1 if value else 0
        else:
            values[field] = (value or "").strip()

    current_time = now_text()

    connection = get_connection()
    ensure_settings_exists(connection)

    connection.execute("""
        UPDATE settings
        SET app_name = ?,
            company_name = ?,
            brand_name = ?,
            email = ?,
            phone = ?,
            website = ?,
            address_line_1 = ?,
            address_line_2 = ?,
            address_line_3 = ?,
            registry_code = ?,
            vat_eu = ?,
            logo_path = ?,
            default_currency = ?,
            theme_mode = ?,
            interface_density = ?,
            primary_color = ?,
            button_style = ?,
            default_client_status = ?,
            default_client_source = ?,
            default_contact_type = ?,
            no_contact_after_days = ?,
            log_client_created = ?,
            log_status_changes = ?,
            log_data_edits = ?,
            combine_notes_and_logs = ?,
            default_history_view = ?,
            updated_at = ?
        WHERE id = 1
    """, (
        values["app_name"],
        values["company_name"],
        values["brand_name"],
        values["email"],
        values["phone"],
        values["website"],
        values["address_line_1"],
        values["address_line_2"],
        values["address_line_3"],
        values["registry_code"],
        values["vat_eu"],
        values["logo_path"],
        values["default_currency"],
        values["theme_mode"],
        values["interface_density"],
        values["primary_color"],
        values["button_style"],
        values["default_client_status"],
        values["default_client_source"],
        values["default_contact_type"],
        values["no_contact_after_days"],
        values["log_client_created"],
        values["log_status_changes"],
        values["log_data_edits"],
        values["combine_notes_and_logs"],
        values["default_history_view"],
        current_time,
    ))

    connection.commit()

    updated_settings = connection.execute("""
        SELECT *
        FROM settings
        WHERE id = 1
        LIMIT 1
    """).fetchone()

    connection.close()

    return jsonify({
        "message": "Ustawienia zostały zapisane.",
        "settings": row_to_dict(updated_settings),
    }), 200


@settings_bp.post("/logo")
def upload_logo():
    if not require_auth():
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    if "logo" not in request.files:
        return jsonify({
            "message": "Nie przesłano pliku logo."
        }), 400

    file = request.files["logo"]

    if not file or file.filename == "":
        return jsonify({
            "message": "Nie wybrano pliku."
        }), 400

    if not allowed_logo_file(file.filename):
        return jsonify({
            "message": "Dozwolone formaty logo: png, jpg, jpeg, webp, svg."
        }), 400

    LOGO_DIR.mkdir(parents=True, exist_ok=True)

    original_filename = secure_filename(file.filename)
    extension = original_filename.rsplit(".", 1)[1].lower()
    filename = f"logo-{uuid4().hex}.{extension}"
    file_path = LOGO_DIR / filename

    file.save(file_path)

    logo_path = f"/api/settings/logo/{filename}"
    current_time = now_text()

    connection = get_connection()
    ensure_settings_exists(connection)

    connection.execute("""
        UPDATE settings
        SET logo_path = ?,
            updated_at = ?
        WHERE id = 1
    """, (
        logo_path,
        current_time,
    ))

    connection.commit()

    updated_settings = connection.execute("""
        SELECT *
        FROM settings
        WHERE id = 1
        LIMIT 1
    """).fetchone()

    connection.close()

    return jsonify({
        "message": "Logo zostało zapisane.",
        "logo_path": logo_path,
        "settings": row_to_dict(updated_settings),
    }), 200


@settings_bp.get("/logo/<path:filename>")
def serve_logo(filename):
    return send_from_directory(LOGO_DIR, filename)