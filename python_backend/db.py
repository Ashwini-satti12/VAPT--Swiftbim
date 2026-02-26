import mysql.connector as mysql_connector
from flask import g, current_app


class DictConnectionWrapper:
    """Wraps a mysql-connector connection so cursor() always returns dict rows."""
    def __init__(self, conn):
        self._conn = conn

    def cursor(self, *args, **kwargs):
        kwargs.setdefault('dictionary', True)
        return self._conn.cursor(*args, **kwargs)

    def commit(self):
        return self._conn.commit()

    def rollback(self):
        return self._conn.rollback()

    def close(self):
        return self._conn.close()

    def __getattr__(self, name):
        return getattr(self._conn, name)


class MySQL:
    def init_app(self, app):
        """Initialize the app for use with this MySQL instance."""
        app.teardown_appcontext(self.teardown)

    def connect(self):
        conn = mysql_connector.connect(
            host=current_app.config['MYSQL_HOST'],
            user=current_app.config['MYSQL_USER'],
            password=current_app.config['MYSQL_PASSWORD'],
            database=current_app.config['MYSQL_DB'],
            port=current_app.config.get('MYSQL_PORT', 3306),
            autocommit=current_app.config.get('MYSQL_AUTOCOMMIT', False),
        )
        use_dict = current_app.config.get('MYSQL_CURSORCLASS') == 'DictCursor'
        return DictConnectionWrapper(conn) if use_dict else conn

    @property
    def connection(self):
        if 'db' not in g:
            g.db = self.connect()
        return g.db

    def teardown(self, exception):
        db = g.pop('db', None)
        if db is not None:
            db.close()


mysql = MySQL()


def get_db():
    return mysql.connection

def close_db(e=None):
    pass  # handled by teardown automatically

def query_one(cursor, sql, args=None):
    cursor.execute(sql, args or ())
    return cursor.fetchone()

def query_all(cursor, sql, args=None):
    cursor.execute(sql, args or ())
    return cursor.fetchall()

def find_in_set(value, column_expr):
    """Use for FIND_IN_SET(?, REPLACE(column, ' ', '')) in raw SQL; pass value and column name."""
    return f"FIND_IN_SET(%s, REPLACE({column_expr}, ' ', ''))"
