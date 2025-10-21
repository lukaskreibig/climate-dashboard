import os, sys, time
from sqlalchemy import create_engine, text

def wait_for_db(url: str, timeout=60, interval=2.0):
    start = time.time()
    while True:
        try:
            eng = create_engine(url, pool_pre_ping=True)
            with eng.connect() as c:
                c.execute(text("SELECT 1"))
            print("[pipeline] database is ready.")
            return
        except Exception as ex:
            if time.time() - start > timeout:
                print(f"[pipeline] DB not ready after {timeout}s: {ex}", file=sys.stderr)
                raise
            print("[pipeline] waiting for database...")
            time.sleep(interval)

if __name__ == "__main__":
    url = os.getenv("DATABASE_URL")
    if not url:
        print("[pipeline] ERROR: DATABASE_URL not set", file=sys.stderr)
        sys.exit(1)
    wait_for_db(url)
