import httpx

from app.core.config import settings


class LLMService:
    async def explain_issue(self, payload: dict) -> str:
        prompt = f"""
You are an API reliability assistant.

Analyze this endpoint and return:
1. Short summary
2. Likely causes
3. Next checks

Service: {payload["service_name"]}
Endpoint: {payload["method"]} {payload["path"]}
Average latency: {payload["avg_latency_ms"]} ms
P95 latency: {payload["p95_latency_ms"]} ms
Error rate: {payload["error_rate_percent"]} %
Total requests: {payload["total_requests"]}
Recent response preview: {payload.get("response_preview", "")}
"""

        async with httpx.AsyncClient(timeout=settings.OLLAMA_TIMEOUT_SECONDS) as client:
            response = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a concise API reliability assistant. Be structured and practical.",
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