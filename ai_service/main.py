"""
WasteGuard AI Service — FastAPI on Port 8000
Handles: YOLOv11 inference, waste knowledge base
"""
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
from llm_detector import analyze_waste_image  # Our new LLM function



app = FastAPI(title="SwachX Service", version="2.0.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])



@app.post("/api/ai/detect")
async def detect_waste(file: UploadFile = File(...)):
    # Read the uploaded image file
    image_bytes = await file.read()
    # Call our Gemini-powered function
    result = analyze_waste_image(image_bytes)
    return JSONResponse(content=result)




from routes.detection import router
app.include_router(router, prefix="/api/ai")




@app.get("/api/ai/health")
async def health():
    return {"status": "ok", "service": "SwachX v2.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
