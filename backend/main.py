from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import dashboard, traffic, vacations, documents, payroll, orders, profile, settings

app = FastAPI(title="Portal API", version="1.0.0")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],  # Puerto de Vite
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir rutas
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(traffic.router, prefix="/api/traffic", tags=["traffic"])
app.include_router(vacations.router, prefix="/api/vacations", tags=["vacations"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(payroll.router, prefix="/api/payroll", tags=["payroll"])
app.include_router(orders.router, tags=["orders"])
app.include_router(profile.router, prefix="/api", tags=["profile"])
app.include_router(settings.router, prefix="/api", tags=["settings"])

@app.get("/")
async def root():
    return {"message": "Portal API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
