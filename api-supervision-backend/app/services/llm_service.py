import json

import httpx

from app.core.config import settings


class LLMService:
    def _system_prompt(self) -> str:
        return (
            "Tu es un assistant expert en supervision, fiabilité et diagnostic d'APIs. "
            "Tu réponds toujours en français. "
            "Ton style doit être clair, professionnel, structuré et directement exploitable "
            "par un ingénieur DevOps ou backend. "
            "Tu ne dois jamais inventer de logs, de déploiements, de bases de données, "
            "de services cloud ou d'éléments techniques absents du contexte fourni."
        )

    async def _ask_llm(self, prompt: str) -> str:
        async with httpx.AsyncClient(timeout=settings.OLLAMA_TIMEOUT_SECONDS) as client:
            response = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": self._system_prompt(),
                        },
                        {
                            "role": "user",
                            "content": prompt,
                        },
                    ],
                    "stream": False,
                },
            )

            response.raise_for_status()
            data = response.json()
            return data["message"]["content"]

    async def explain_issue(self, payload: dict) -> str:
        prompt = f"""
Analyse cet endpoint et réponds uniquement en français.

Utilise exactement cette structure :

1. Résumé court
2. Éléments observés
3. Causes probables
4. Vérifications recommandées
5. Niveau de sévérité

Règles :
- N'invente aucune information absente des données fournies.
- Sépare les faits confirmés des hypothèses.
- Sois concis, pratique et orienté diagnostic.
- Si les données sont insuffisantes, précise ce qui manque.

Données de supervision :
- Service : {payload["service_name"]}
- Endpoint : {payload["method"]} {payload["path"]}
- Latence moyenne : {payload["avg_latency_ms"]} ms
- Latence P95 : {payload["p95_latency_ms"]} ms
- Taux d'erreur : {payload["error_rate_percent"]} %
- Total des requêtes : {payload["total_requests"]}
- Aperçu de réponse récente : {payload.get("response_preview", "")}
"""

        try:
            return await self._ask_llm(prompt)
        except Exception as exc:
            raise RuntimeError(
                f"Echec de l'analyse LLM de l'endpoint: {type(exc).__name__}: {exc}"
            ) from exc

    async def explain_endpoint_issue(self, context: dict) -> str:
        context_json = json.dumps(context, indent=2, default=str)

        prompt = f"""
Analyse le contexte de supervision de cet endpoint et réponds uniquement en français.

Utilise exactement cette structure :

1. Résumé
2. Ce qui semble anormal
3. Causes probables
4. Vérifications recommandées
5. Niveau de sévérité

Règles :
- N'invente pas de logs, traces, déploiements, bases de données, cloud ou infrastructure absents du contexte.
- Si les données sont insuffisantes, indique clairement ce qui manque.
- Sépare les éléments confirmés des hypothèses.
- Mentionne si le problème semble lié à la latence, aux erreurs, au trafic, à la disponibilité ou à un mélange de plusieurs facteurs.
- Sois concis, utile et directement exploitable par un ingénieur DevOps/backend.

Contexte de supervision :
{context_json}
"""

        try:
            return await self._ask_llm(prompt)
        except Exception as exc:
            raise RuntimeError(
                f"Echec de l'analyse LLM de l'endpoint: {type(exc).__name__}: {exc}"
            ) from exc

    async def explain_alert(self, context: dict) -> str:
        context_json = json.dumps(context, indent=2, default=str)

        prompt = f"""
Analyse cette alerte et réponds uniquement en français.

Utilise exactement cette structure :

1. Résumé de l'alerte
2. Éléments confirmés
3. Causes possibles
4. Vérifications recommandées
5. Interprétation de la sévérité

Règles :
- N'invente aucune information absente du contexte.
- Sépare les faits confirmés des hypothèses.
- Sois pratique, concis et orienté résolution.
- Si les données sont insuffisantes, précise ce qui manque.

Contexte de l'alerte :
{context_json}
"""

        try:
            return await self._ask_llm(prompt)
        except Exception as exc:
            raise RuntimeError(
                f"Echec de l'analyse LLM de l'alerte: {type(exc).__name__}: {exc}"
            ) from exc

    async def explain_incident_root_cause(self, context: dict) -> str:
        context_json = json.dumps(context, indent=2, default=str)

        prompt = f"""
Analyse le contexte de cet incident et réponds uniquement en français.

Utilise exactement cette structure :

1. Résumé de l'incident
2. Éléments confirmés
3. Cause racine probable
4. Analyse de l'impact
5. Étapes de résolution recommandées
6. Niveau de sévérité
7. Recommandations de prévention

Règles :
- N'invente pas de logs, déploiements, bases de données, services cloud ou détails d'infrastructure absents du contexte.
- Sépare clairement les faits confirmés des hypothèses.
- Si les données sont insuffisantes, indique précisément ce qui manque.
- Sois pratique pour un ingénieur DevOps/backend.
- Reste concis, professionnel et orienté action.
- Mentionne si l'incident semble lié à la latence, aux erreurs, à la disponibilité, au trafic ou à plusieurs facteurs.

Contexte de l'incident :
{context_json}
"""

        try:
            return await self._ask_llm(prompt)
        except Exception as exc:
            raise RuntimeError(
                f"Echec de l'analyse LLM de l'incident: {type(exc).__name__}: {exc}"
            ) from exc