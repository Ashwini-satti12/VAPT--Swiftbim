import pymysql
import pymysql.cursors
from flask import g, current_app

class MySQL:
    def init_app(self, app):
        """Initialize the app for use with this MySQL instance."""
        app.teardown_appcontext(self.teardown)

    def connect(self):
        return pymysql.connect(
            host=current_app.config['MYSQL_HOST'],
            user=current_app.config['MYSQL_USER'],
            password=current_app.config['MYSQL_PASSWORD'],
            database=current_app.config['MYSQL_DB'],
            port=current_app.config.get('MYSQL_PORT', 3306),
            cursorclass=pymysql.cursors.DictCursor if current_app.config.get('MYSQL_CURSORCLASS') == 'DictCursor' else pymysql.cursors.Cursor,
            autocommit=current_app.config.get('MYSQL_AUTOCOMMIT', False)
        )

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
