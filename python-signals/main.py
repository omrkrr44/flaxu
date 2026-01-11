from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
from strategies.ict import ICTStrategy
from strategies.scalper import ScalpStrategy

app = FastAPI(
    title="FLAXU Trading Signals Service",
    description="ICT & PA signal processing microservice",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Strategies
ict_strategy = ICTStrategy()
scalp_strategy = ScalpStrategy()

# Data Models
class Candle(BaseModel):
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: float

class ICTRequest(BaseModel):
    symbol: str
    timeframe: str
    candles: List[Candle]

class ScalpRequest(BaseModel):
    symbol: str
    current_price: float
    price_5m_ago: float

# Routes
@app.get("/")
async def root():
    return {"status": "operational", "service": "FLAXU Signals"}

@app.post("/signals/ict")
async def generate_ict_signal(data: ICTRequest):
    try:
        # Convert list of candles to DataFrame
        df = pd.DataFrame([c.model_dump() for c in data.candles])
        
        # Analyze
        result = ict_strategy.analyze(df)
        
        return {
            "symbol": data.symbol,
            "timeframe": data.timeframe,
            "analysis": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/signals/scalp")
async def generate_scalp_signal(data: ScalpRequest):
    try:
        result = scalp_strategy.analyze(
            symbol=data.symbol, 
            current_price=data.current_price, 
            price_5m_ago=data.price_5m_ago
        )
        
        if not result:
            return {"status": "NO_SIGNAL"}
            
        return {"status": "SIGNAL_FOUND", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
