"""Database Session and Connection Management with Graceful Fallback."""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

db_url = settings.DATABASE_URL

# Fallback to local SQLite if postgresql is requested but no driver is installed
if db_url.startswith("postgresql"):
    try:
        import psycopg2  # type: ignore
    except ImportError:
        try:
            import psycopg  # type: ignore
        except ImportError:
            print("[MediShield DB] PostgreSQL driver (psycopg/psycopg2) not detected. Falling back to local SQLite database.")
            db_url = "sqlite:///./medishield.db"

connect_args = {}
if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

try:
    engine = create_engine(
        db_url,
        connect_args=connect_args,
        echo=False,
        future=True
    )
except Exception as e:
    print(f"[MediShield DB] Error connecting to {db_url}: {e}. Falling back to SQLite.")
    db_url = "sqlite:///./medishield.db"
    engine = create_engine("sqlite:///./medishield.db", connect_args={"check_same_thread": False}, future=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency for yielding database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
