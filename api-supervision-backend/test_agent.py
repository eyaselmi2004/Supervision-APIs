"""
Mini API FastAPI pour tester le SupervisionMiddleware.
Lance sur port 9000 — le middleware envoie les métriques
au serveur central sur port 8000.

Usage:
    uvicorn test_agent:app --port 9000
"""
import os
from fastapi import FastAPI
from app.middleware.agent_middleware import SupervisionMiddleware

app = FastAPI(title="API Test Supervisée")

# Remplace par ton token JWT et l'ID de ton API enregistrée
ACCESS_TOKEN = os.getenv("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlZjI1NjkzOC1lZWIzLTRhYTgtYTM3NC05NmZlMGY4NWMzMWUiLCJyb2xlIjoiQURNSU4iLCJleHAiOjE3NzQ0NTM1MTMsInR5cGUiOiJhY2Nlc3MifQ.4CoZonLTKjzrlVNFk0Of9bCBJM03kHHrIK9ppBr9F90", "ton-token-jwt")
API_SERVICE_ID = os.getenv("3eb722a2-9c41-424a-8121-be805bfc7245", "uuid-de-ton-api")

app.add_middleware(
    SupervisionMiddleware,
    agent_url="http://localhost:8000",
    api_service_id="a0a93a70-9829-4ee5-9149-9a3bb07021f3",
    access_token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlZjI1NjkzOC1lZWIzLTRhYTgtYTM3NC05NmZlMGY4NWMzMWUiLCJyb2xlIjoiQURNSU4iLCJleHAiOjE3NzQ0NTM1MTMsInR5cGUiOiJhY2Nlc3MifQ.4CoZonLTKjzrlVNFk0Of9bCBJM03kHHrIK9ppBr9F90",
)


@app.get("/commandes")
async def get_commandes():
    return {"commandes": [{"id": 1, "produit": "Laptop"}, {"id": 2, "produit": "Phone"}]}


@app.get("/commandes/{commande_id}")
async def get_commande(commande_id: int):
    return {"id": commande_id, "produit": "Laptop", "statut": "livré"}


@app.post("/commandes")
async def create_commande():
    return {"id": 3, "message": "Commande créée"}