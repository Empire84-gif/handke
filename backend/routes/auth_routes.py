from flask import Blueprint, jsonify, request, session
from utils.email_sender import send_email, smtp_is_configured

from config import FRONTEND_URL
from utils.db import get_connection, row_to_dict
from utils.security import (
    check_password,
    generate_reset_token,
    hash_password,
    is_expired,
    normalize_email,
    now_text,
    reset_token_expiry,
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def get_current_user():
    user_id = session.get("user_id")

    if not user_id:
        return None

    connection = get_connection()

    user = connection.execute("""
        SELECT id, full_name, email, role, is_active, created_at, updated_at
        FROM users
        WHERE id = ?
        LIMIT 1
    """, (user_id,)).fetchone()

    connection.close()

    if not user:
        return None

    return row_to_dict(user)


@auth_bp.get("/me")
def me():
    user = get_current_user()

    if not user:
        return jsonify({
            "authenticated": False,
            "user": None,
        }), 200

    return jsonify({
        "authenticated": True,
        "user": user,
    }), 200


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}

    email = normalize_email(data.get("email"))
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({
            "message": "Podaj email i hasło."
        }), 400

    connection = get_connection()

    user = connection.execute("""
        SELECT *
        FROM users
        WHERE email = ?
        LIMIT 1
    """, (email,)).fetchone()

    connection.close()

    if not user:
        return jsonify({
            "message": "Nieprawidłowy email lub hasło."
        }), 401

    user = row_to_dict(user)

    if not user["is_active"]:
        return jsonify({
            "message": "Konto jest nieaktywne."
        }), 403

    if not check_password(user["password_hash"], password):
        return jsonify({
            "message": "Nieprawidłowy email lub hasło."
        }), 401

    session.clear()
    session["user_id"] = user["id"]

    return jsonify({
        "message": "Zalogowano.",
        "user": {
            "id": user["id"],
            "full_name": user["full_name"],
            "email": user["email"],
            "role": user["role"],
        }
    }), 200


@auth_bp.post("/logout")
def logout():
    session.clear()

    return jsonify({
        "message": "Wylogowano."
    }), 200


@auth_bp.post("/change-password")
def change_password():
    user = get_current_user()

    if not user:
        return jsonify({
            "message": "Musisz być zalogowany."
        }), 401

    data = request.get_json(silent=True) or {}

    current_password = data.get("current_password") or ""
    new_password = data.get("new_password") or ""

    if len(new_password) < 8:
        return jsonify({
            "message": "Nowe hasło musi mieć minimum 8 znaków."
        }), 400

    connection = get_connection()

    db_user = connection.execute("""
        SELECT *
        FROM users
        WHERE id = ?
        LIMIT 1
    """, (user["id"],)).fetchone()

    if not db_user:
        connection.close()
        return jsonify({
            "message": "Użytkownik nie istnieje."
        }), 404

    db_user = row_to_dict(db_user)

    if not check_password(db_user["password_hash"], current_password):
        connection.close()
        return jsonify({
            "message": "Obecne hasło jest nieprawidłowe."
        }), 400

    connection.execute("""
        UPDATE users
        SET password_hash = ?,
            updated_at = ?
        WHERE id = ?
    """, (
        hash_password(new_password),
        now_text(),
        user["id"],
    ))

    connection.commit()
    connection.close()

    return jsonify({
        "message": "Hasło zostało zmienione."
    }), 200


@auth_bp.post("/forgot-password")
def forgot_password():
    data = request.get_json(silent=True) or {}

    email = normalize_email(data.get("email"))

    if not email:
        return jsonify({
            "message": "Podaj adres email."
        }), 400

    connection = get_connection()

    user = connection.execute("""
        SELECT id, email, full_name
        FROM users
        WHERE email = ?
        LIMIT 1
    """, (email,)).fetchone()

    if not user:
        connection.close()

        return jsonify({
            "message": "Jeżeli konto istnieje, link resetujący został przygotowany."
        }), 200

    user = row_to_dict(user)

    token = generate_reset_token()
    current_time = now_text()
    expires_at = reset_token_expiry(hours=1)

    connection.execute("""
        INSERT INTO password_resets (
            user_id,
            token,
            expires_at,
            used_at,
            created_at
        )
        VALUES (?, ?, ?, NULL, ?)
    """, (
        user["id"],
        token,
        expires_at,
        current_time,
    ))

    connection.commit()
    connection.close()

    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"

    if smtp_is_configured():
        subject = "Reset hasła — SDE CRM"

        text_body = f"""Cześć,

otrzymaliśmy prośbę o reset hasła do SDE CRM.

Kliknij link, aby ustawić nowe hasło:
{reset_link}

Link jest ważny przez 1 godzinę.

Jeżeli to nie Ty wysłałeś tę prośbę, zignoruj tę wiadomość.
"""

        html_body = f"""
        <div style="font-family: Arial, sans-serif; color: #111111; line-height: 1.5;">
          <h2 style="margin: 0 0 12px; font-size: 22px;">
            Reset hasła — SDE CRM
          </h2>

          <p>
            Otrzymaliśmy prośbę o reset hasła do SDE CRM.
          </p>

          <p>
            Kliknij poniższy przycisk, aby ustawić nowe hasło.
          </p>

          <p style="margin: 22px 0;">
            <a
              href="{reset_link}"
              style="
                display: inline-block;
                padding: 11px 16px;
                background: #111111;
                color: #ffffff;
                text-decoration: none;
                border-radius: 10px;
                font-weight: 600;
              "
            >
              Ustaw nowe hasło
            </a>
          </p>

          <p>
            Link jest ważny przez 1 godzinę.
          </p>

          <p style="color: #666666; font-size: 13px;">
            Jeżeli to nie Ty wysłałeś tę prośbę, zignoruj tę wiadomość.
          </p>

          <p style="color: #999999; font-size: 12px; margin-top: 24px;">
            Jeżeli przycisk nie działa, skopiuj ten link do przeglądarki:<br>
            {reset_link}
          </p>
        </div>
        """

        try:
            send_email(
                to_email=user["email"],
                subject=subject,
                text_body=text_body,
                html_body=html_body,
            )
        except Exception as error:
            print("")
            print("========================================")
            print("BŁĄD WYSYŁKI MAILA RESETU HASŁA")
            print(str(error))
            print("LINK RESETU HASŁA — FALLBACK")
            print(reset_link)
            print("========================================")
            print("")
    else:
        print("")
        print("========================================")
        print("LINK RESETU HASŁA — DEV")
        print(reset_link)
        print("SMTP nie jest skonfigurowany.")
        print("========================================")
        print("")

    return jsonify({
        "message": "Jeżeli konto istnieje, link resetujący został przygotowany."
    }), 200


@auth_bp.post("/reset-password")
def reset_password():
    data = request.get_json(silent=True) or {}

    token = data.get("token") or ""
    new_password = data.get("new_password") or ""

    if not token:
        return jsonify({
            "message": "Brak tokenu resetu hasła."
        }), 400

    if len(new_password) < 8:
        return jsonify({
            "message": "Nowe hasło musi mieć minimum 8 znaków."
        }), 400

    connection = get_connection()

    reset_row = connection.execute("""
        SELECT *
        FROM password_resets
        WHERE token = ?
        LIMIT 1
    """, (token,)).fetchone()

    if not reset_row:
        connection.close()
        return jsonify({
            "message": "Link resetujący jest nieprawidłowy."
        }), 400

    reset_row = row_to_dict(reset_row)

    if reset_row["used_at"]:
        connection.close()
        return jsonify({
            "message": "Ten link został już użyty."
        }), 400

    if is_expired(reset_row["expires_at"]):
        connection.close()
        return jsonify({
            "message": "Link resetujący wygasł."
        }), 400

    current_time = now_text()

    connection.execute("""
        UPDATE users
        SET password_hash = ?,
            updated_at = ?
        WHERE id = ?
    """, (
        hash_password(new_password),
        current_time,
        reset_row["user_id"],
    ))

    connection.execute("""
        UPDATE password_resets
        SET used_at = ?
        WHERE id = ?
    """, (
        current_time,
        reset_row["id"],
    ))

    connection.commit()
    connection.close()

    return jsonify({
        "message": "Hasło zostało zresetowane. Możesz się zalogować."
    }), 200