"""Scratch: verify VAPT security headers on the running Flask server."""
import urllib.request

HEADERS_TO_CHECK = [
    "X-Content-Type-Options",
    "X-Frame-Options",
    "X-XSS-Protection",
    "Referrer-Policy",
    "Permissions-Policy",
    "Content-Security-Policy",
    "Cache-Control",
    "Strict-Transport-Security",
]

for path in ["/api/health", "/uploads/test.jpg"]:
    url = f"http://127.0.0.1:5000{path}"
    req = urllib.request.Request(url)
    print(f"\n=== GET {path} ===")
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            print(f"  Status: {r.status}")
            for h in HEADERS_TO_CHECK:
                val = r.headers.get(h, "** MISSING **")
                status = "OK" if "MISSING" not in val else "FAIL"
                print(f"  [{status}] {h}: {val[:80]}")
    except urllib.error.HTTPError as e:
        print(f"  Status: {e.code}")
        for h in HEADERS_TO_CHECK:
            val = e.headers.get(h, "** MISSING **")
            status = "OK" if "MISSING" not in val else "FAIL"
            print(f"  [{status}] {h}: {val[:80]}")
    except Exception as e:
        print(f"  Error: {e}")
