"""
run_migrations.py
Exécute les fichiers SQL dans l'ordre et garde un historique
dans la table schema_migrations.
Usage : python migrations/run_migrations.py
"""
import asyncio
import os
import sys
from pathlib import Path

import asyncpg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://supervision_user:supervision_pass@localhost:5432/supervision_db",
)

MIGRATIONS_DIR = Path(__file__).parent

SQL_FILES = [
    "001_extensions.sql",
    "002_enums.sql",
    "003_tables.sql",
    "004_hypertable.sql",
    "005_compression.sql",
    "006_continuous_agg.sql",
]


async def run():
    print(f"Connexion à : {DATABASE_URL}")
    conn = await asyncpg.connect(DATABASE_URL)

    # Créer la table de suivi si elle n'existe pas
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS schema_migrations (
            filename   VARCHAR(255) PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)

    for filename in SQL_FILES:
        # Vérifier si déjà appliquée
        applied = await conn.fetchval(
            "SELECT 1 FROM schema_migrations WHERE filename = $1", filename
        )
        if applied:
            print(f"  ⏭  {filename} — déjà appliquée")
            continue

        filepath = MIGRATIONS_DIR / filename
        if not filepath.exists():
            print(f"  ⚠  {filename} — fichier introuvable, ignoré")
            continue

        sql = filepath.read_text(encoding="utf-8")
        try:
            await conn.execute(sql)
            await conn.execute(
                "INSERT INTO schema_migrations (filename) VALUES ($1)", filename
            )
            print(f"  ✓  {filename} — appliquée")
        except Exception as e:
            print(f"  ✗  {filename} — ERREUR : {e}")
            await conn.close()
            sys.exit(1)

    await conn.close()
    print("\nMigrations terminées ✓")


if __name__ == "__main__":
    asyncio.run(run())
