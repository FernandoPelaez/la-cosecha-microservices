import os
from contextlib import contextmanager
import mysql.connector

@contextmanager
def database():
    conn = mysql.connector.connect(host=os.getenv("DB_HOST", "127.0.0.1"), port=int(os.getenv("DB_PORT", "3306")),
        database=os.getenv("DB_NAME", "la_cosecha"), user=os.getenv("DB_USER"), password=os.getenv("DB_PASSWORD"), time_zone="+00:00")
    cur = conn.cursor(dictionary=True)
    try:
        yield conn, cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()
