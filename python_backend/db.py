import pymysql
from flask import g
from config import Config


def get_db():
    if "db" not in g:
        g.db = pymysql.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DB,
            port=Config.MYSQL_PORT,
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=True,
        )
    return g.db


def close_db(e=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def query_one(cursor, sql, args=None):
    cursor.execute(sql, args or ())
    return cursor.fetchone()


def query_all(cursor, sql, args=None):
    cursor.execute(sql, args or ())
    return cursor.fetchall()


def find_in_set(value, column_expr):
    """Use for FIND_IN_SET(?, REPLACE(column, ' ', '')) in raw SQL; pass value and column name."""
    return f"FIND_IN_SET(%s, REPLACE({column_expr}, ' ', ''))"
