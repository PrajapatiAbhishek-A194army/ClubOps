import logging
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config.settings import settings

logger = logging.getLogger(__name__)

db_url = settings.DATABASE_URL
connect_args = {}

if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine = create_engine(db_url, echo=False, connect_args=connect_args)
else:
    try:
        test_engine = create_engine(
            db_url,
            echo=False,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 2},
        )
        with test_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        engine = test_engine
        logger.info("Connected to PostgreSQL database successfully.")
    except Exception as e:
        from pathlib import Path
        backend_dir = Path(__file__).resolve().parent.parent.parent
        db_path = (backend_dir / "clubops_v2.db").as_posix()
        db_url = f"sqlite:///{db_path}"
        logger.warning(
            f"PostgreSQL connection failed ({e}). Falling back to local SQLite: {db_url}"
        )
        connect_args = {"check_same_thread": False}
        engine = create_engine(db_url, echo=False, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency for providing a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
