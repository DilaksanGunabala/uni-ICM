from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings


def _get_async_url(url: str) -> str:
    """Convert pymysql:// URL to asyncmy:// URL for async driver."""
    return url.replace("mysql+pymysql://", "mysql+asyncmy://")


# ---- ASYNC engine for application use ----
async_engine = create_async_engine(
    _get_async_url(settings.DATABASE_URL),
    echo=settings.DB_ECHO,
    pool_pre_ping=True,
    pool_size=50,
    max_overflow=50,
    pool_recycle=3600,
    pool_timeout=30,
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

# ---- SYNC engine for Alembic migrations and utility scripts ----
sync_engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DB_ECHO,
    pool_pre_ping=True,
)
SyncSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=sync_engine
)

# Base class for all models (shared between sync and async)
Base = declarative_base()

# Backward-compatible alias so run_migration.py and check_users.py still work
engine = sync_engine


async def get_db():
    """
    Async dependency to get database session for route handlers.
    Use with FastAPI Depends() to inject async DB session.

    Example:
        @app.get("/users")
        async def get_users(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(User))
            return result.scalars().all()
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
