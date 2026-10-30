from httpx import ASGITransport, AsyncClient

from app.main import app


async def test_expone_el_esquema_openapi() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/openapi.json")

    assert response.status_code == 200
    assert response.json()["info"]["title"] == "Juez virtual"
