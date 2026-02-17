from flask_mysqldb import MySQL

mysql = MySQL()

def get_db():
    return mysql.connection
    
def close_db(e=None):
    pass  # handled by flask-mysqldb automatically

def query_one(cursor, sql, args=None):
    cursor.execute(sql, args or ())
    return cursor.fetchone()

def query_all(cursor, sql, args=None):
    cursor.execute(sql, args or ())
    return cursor.fetchall()

def find_in_set(value, column_expr):
    """Use for FIND_IN_SET(?, REPLACE(column, ' ', '')) in raw SQL; pass value and column name."""
    return f"FIND_IN_SET(%s, REPLACE({column_expr}, ' ', ''))"
