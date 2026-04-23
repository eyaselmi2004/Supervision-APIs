import asyncio
import asyncpg

async def test():
    conn = await asyncpg.connect(
        'postgresql://supervision_user:supervision_pass@localhost:5432/supervision_db'
    )
    result = await conn.fetchval('SELECT version()')
    print(result)
    await conn.close()

asyncio.run(test())