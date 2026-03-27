from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

engine = None
SessionLocal = None


class Base(DeclarativeBase):
    pass


def init_db(database_url: str):
    global engine, SessionLocal
    engine = create_engine(database_url, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(bind=engine)
    _add_missing_columns(engine)


def _add_missing_columns(eng):
    """Add columns that create_all won't add to existing tables."""
    migrations = [
        ("videos", "source_type", "TEXT DEFAULT 'upload' NOT NULL"),
        ("videos", "catalog_path", "TEXT"),
        ("videos", "catalog_dataset_id", "INTEGER"),
        ("projects", "catalog_dataset_id", "INTEGER"),
        ("projects", "catalog_dataset_name", "TEXT"),
    ]
    with eng.connect() as conn:
        for table, column, col_type in migrations:
            try:
                conn.execute(
                    __import__("sqlalchemy").text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
                )
                conn.commit()
            except Exception:
                pass  # Column already exists


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
