import os

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY") or os.getenv("SECRET_KEY", "change-me-in-production")
    # Login session length in seconds (default 15 minutes)
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", "900"))
    # Refresh token lifetime in seconds (default 7 days)
    JWT_REFRESH_TOKEN_EXPIRES = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES", str(7 * 24 * 60 * 60)))

    # Auth cookies (to show tokens under DevTools → Application → Cookies)
    # NOTE: SameSite=None requires Secure=true (HTTPS). For local HTTP dev, use Lax + Secure=false.
    AUTH_COOKIE_SECURE = os.getenv("AUTH_COOKIE_SECURE", "false").lower() in ("1", "true", "yes")
    AUTH_COOKIE_SAMESITE = os.getenv("AUTH_COOKIE_SAMESITE", "Lax")

    MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_DB = os.getenv("MYSQL_DB", "snh6_swiftproject")
    MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
    MYSQL_CURSORCLASS = "DictCursor"
    MYSQL_AUTOCOMMIT = True

    UPLOAD_FOLDER = os.getenv(
        "UPLOAD_FOLDER",
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads"),
    )
    from upload_resolver import phase1_upload_folder_default

    PHASE1_UPLOAD_FOLDER = (
        os.getenv("PHASE1_UPLOAD_FOLDER")
        or os.getenv("SWIFTBIM_PHASE1_UPLOAD_FOLDER")
        or phase1_upload_folder_default()
    )

    # Secure upload (VAPT): file type validation + malware scanning
    UPLOAD_MAX_BYTES = int(os.getenv("UPLOAD_MAX_BYTES", str(25 * 1024 * 1024)))
    UPLOAD_MALWARE_SCAN = os.getenv("UPLOAD_MALWARE_SCAN", "true").lower() in ("1", "true", "yes")
    CLAMSCAN_PATH = (os.getenv("CLAMSCAN_PATH") or "").strip()
