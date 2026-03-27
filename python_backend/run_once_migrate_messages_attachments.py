"""
One-time migration script: add `attachments` JSON column to the `messages` table.

Run once:
    cd python_backend
    python3 run_once_migrate_messages_attachments.py
"""

import os
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

host = os.getenv("MYSQL_HOST", "localhost")
user = os.getenv("MYSQL_USER", "root")
password = os.getenv("MYSQL_PASSWORD", "root@123")
database = os.getenv("MYSQL_DB", "snh6_swiftproject")
port = int(os.getenv("MYSQL_PORT", "3306"))

conn = mysql.connector.connect(
    host=host,
    user=user,
    password=password,
    database=database,
    port=port,
    autocommit=True,
)
cur = conn.cursor()

# Check if column already exists
cur.execute(
    """
    SELECT COUNT(*) AS cnt
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = %s
      AND TABLE_NAME   = 'messages'
      AND COLUMN_NAME  = 'attachments'
    """,
    (database,),
)
row = cur.fetchone()
count = row[0] if row else 0

if count:
    print("✓ Column 'attachments' already exists in messages table — nothing to do.")
else:
    cur.execute(
        """
        ALTER TABLE messages
          ADD COLUMN attachments JSON DEFAULT NULL
          COMMENT 'JSON array of {url, name, type} objects for chat file attachments'
        """
    )
    print("✓ Successfully added 'attachments' column to messages table.")

cur.close()
conn.close()
