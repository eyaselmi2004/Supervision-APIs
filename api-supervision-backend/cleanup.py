import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def cleanup():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    
    # Supprimer les anciennes invitations acceptées
    await conn.execute("""
        DELETE FROM team_invitations 
        WHERE status = 'accepted'
    """)
    
    print("✅ Anciennes invitations supprimées")
    await conn.close()

asyncio.run(cleanup())