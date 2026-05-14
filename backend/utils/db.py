import sqlite3
from config import DATABASE_PATH


def get_connection():
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")

    return connection


def row_to_dict(row):
    if row is None:
        return None

    return dict(row)


def rows_to_list(rows):
    return [dict(row) for row in rows]