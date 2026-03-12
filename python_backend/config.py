import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
<<<<<<< HEAD
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
=======
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "root")
>>>>>>> 0cb535cb679e18d4c937fefed6b4f5a4fca834a7
    MYSQL_DB = os.getenv("MYSQL_DB", "snh6_swiftproject")
    MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
    MYSQL_CURSORCLASS = "DictCursor"
    MYSQL_AUTOCOMMIT = True
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", os.getenv("SECRET_KEY", "your-secret-key-change-in-production"))
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 86400 * 30))  # 30 days
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads"))
    TIMEZONE = os.getenv("TIMEZONE", "Asia/Kolkata")

    # SMTP / email settings (used for invite emails)
    # For Gmail you can leave MAIL_SERVER empty in .env; default is smtp.gmail.com
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "true").lower() == "true"
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "rajubhaaik@gmail.com")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "wpyy hxlx asbf pyjw")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER", MAIL_USERNAME or "rajubhaaik@gmail.com")