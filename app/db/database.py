from sqlmodel import SQLModel, Session, create_engine

from app.core.config import get_settings


settings = get_settings()

# SQLite needs check_same_thread=False; Postgres does not
connect_args = {}
if settings.database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(settings.database_url, connect_args=connect_args)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
