from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://trading-pulse-ai-app.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

client = TestClient(app)
response = client.options("/health", headers={
    "Origin": "https://trading-pulse-ai-app.vercel.app",
    "Access-Control-Request-Method": "GET"
})
print("STATUS:", response.status_code)
print("BODY:", response.text)
