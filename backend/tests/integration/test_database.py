from sqlalchemy import text

from app.db.database import AsyncSessionLocal


async def test_conecta_con_la_base_de_datos() -> None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(text("SELECT 1"))

    assert result.scalar_one() == 1
