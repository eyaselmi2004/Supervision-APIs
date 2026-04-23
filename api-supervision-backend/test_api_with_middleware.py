"""
test_api_with_middleware.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Simple Test API with SupervisionMiddleware installed
Simulates errors to test alerts
"""

from fastapi import FastAPI
from fastapi.responses import JSONResponse
import random
import time
from datetime import datetime

app = FastAPI(title="Test API with Monitoring")

# ── Copy your SupervisionMiddleware here ──
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from datetime import datetime, timezone
import httpx
from loguru import logger

class SupervisionMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        agent_url: str,
        api_service_id: str,
        access_token: str = "",
    ):
        super().__init__(app)
        self.agent_url = agent_url.rstrip("/")
        self.api_service_id = api_service_id
        self.access_token = access_token

    async def dispatch(self, request, call_next) -> Response:
        import time
        start = time.monotonic()
        
        response = await call_next(request)
        
        response_time_ms = (time.monotonic() - start) * 1000
        
        await self._send_metric(
            path=request.url.path,
            method=request.method,
            status_code=response.status_code,
            response_time_ms=response_time_ms,
        )
        
        return response

    async def _send_metric(
        self,
        path: str,
        method: str,
        status_code: int,
        response_time_ms: float,
    ) -> None:
        payload = {
            "api_service_id": self.api_service_id,
            "endpoint_path": path,
            "method": method,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "response_time_ms": round(response_time_ms, 2),
            "status_code": status_code,
        }

        headers = {
            "Authorization": f"Bearer {self.access_token}"
        } if self.access_token else {}

        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                await client.post(
                    f"{self.agent_url}/api/v1/metrics/agent",
                    json=payload,
                    headers=headers,
                )
                print(f"✅ Metric sent : {path} {method} {status_code}")

        except Exception as e:
            logger.debug(f"SupervisionMiddleware: erreur envoi metrique — {e}")


# ── Install Middleware ──
app.add_middleware(
    SupervisionMiddleware,
    agent_url="http://localhost:8000",  # Your monitoring platform
    api_service_id="2ef3bea9-b7bd-4b0e-b542-4f232295d18f",  # Supabase API ID
    access_token=""
)

# ── Routes that generate different responses ──

@app.get("/health")
async def health():
    """Always healthy"""
    return {"status": "ok", "timestamp": datetime.now()}

@app.get("/api/users")
async def get_users():
    """
    Simulates:
    - 70% : Fast & successful (200)
    - 20% : Slow response (> 5000ms) → triggers WARNING alert
    - 10% : Server error (500) → triggers CRITICAL alert
    """
    
    rand = random.random()
    
    if rand < 0.1:
        # ❌ Server error (10% chance)
        print("🔴 Returning 500 error")
        return JSONResponse(
            status_code=500,
            content={"error": "Database connection failed"}
        )
    
    elif rand < 0.3:
        # ⚠️ Slow response (20% chance)
        print("⚠️ Slow response (5+ seconds)")
        time.sleep(random.uniform(5, 7))
        return {
            "users": [
                {"id": 1, "name": "John"},
                {"id": 2, "name": "Jane"},
            ]
        }
    
    else:
        # ✅ Fast & successful (70% chance)
        print("✅ Normal response")
        return {
            "users": [
                {"id": 1, "name": "John", "email": "john@test.com"},
                {"id": 2, "name": "Jane", "email": "jane@test.com"},
            ]
        }

@app.get("/api/products")
async def get_products():
    """Simulates product API"""
    
    if random.random() < 0.15:
        return JSONResponse(
            status_code=503,
            content={"error": "Service unavailable"}
        )
    
    time.sleep(random.uniform(0.1, 0.5))
    return {
        "products": [
            {"id": 1, "name": "Product A", "price": 99.99},
            {"id": 2, "name": "Product B", "price": 49.99},
        ]
    }

@app.post("/api/orders")
async def create_order(order: dict):
    """Simulates order creation"""
    
    if random.random() < 0.2:
        return JSONResponse(
            status_code=402,
            content={"error": "Payment failed"}
        )
    
    return {
        "order_id": random.randint(1000, 9999),
        "status": "created"
    }

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("🚀 Test API with Supervision Middleware")
    print("="*60)
    print("📍 Running on http://localhost:8001")
    print("📊 Metrics sent to http://localhost:8000/api/v1/metrics/agent")
    print("="*60 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8001)