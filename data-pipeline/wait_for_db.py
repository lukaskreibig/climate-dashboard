import os, sys, time
from urllib.parse import urlparse
from sqlalchemy import create_engine, text

def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return float(raw)
    except ValueError:
        print(f"[pipeline] WARNING: invalid {name}={raw!r}; using {default}", file=sys.stderr)
        return default


def _database_url() -> str | None:
    return os.getenv("DATABASE_URL") or os.getenv("DATABASE_PUBLIC_URL")


def wait_for_db(url: str, timeout=300.0, interval=2.0):
    start = time.time()
    host = urlparse(url).hostname or "unknown"
    attempt = 0
    connect_timeout = max(3, min(15, int(interval * 2)))
    print(
        f"[pipeline] waiting for database host={host} timeout={timeout:.0f}s interval={interval:.1f}s connect_timeout={connect_timeout}s"
    )
    while True:
        attempt += 1
        try:
            eng = create_engine(
                url,
                pool_pre_ping=True,
                connect_args={"connect_timeout": connect_timeout},
            )
            with eng.connect() as c:
                c.execute(text("SELECT 1"))
            elapsed = time.time() - start
            print(f"[pipeline] database is ready after {elapsed:.1f}s (attempt {attempt}).")
            return
        except Exception as ex:
            elapsed = time.time() - start
            if elapsed > timeout:
                print(
                    f"[pipeline] DB not ready after {elapsed:.1f}s (timeout={timeout:.0f}s, attempts={attempt}, host={host}): {ex}",
                    file=sys.stderr,
                )
                raise
            print(f"[pipeline] waiting for database... attempt={attempt} elapsed={elapsed:.1f}s host={host}")
            time.sleep(interval)

if __name__ == "__main__":
    url = _database_url()
    if not url:
        print("[pipeline] ERROR: DATABASE_URL or DATABASE_PUBLIC_URL not set", file=sys.stderr)
        sys.exit(1)
    wait_for_db(
        url,
        timeout=_env_float("DB_WAIT_TIMEOUT_SECONDS", 300.0),
        interval=_env_float("DB_WAIT_INTERVAL_SECONDS", 2.0),
    )
