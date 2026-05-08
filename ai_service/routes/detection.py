from fastapi import APIRouter, UploadFile, File, HTTPException
from yolo_service import run_detection

router = APIRouter()

@router.post("/detect")
async def detect(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    img_bytes = await file.read()
    result    = run_detection(img_bytes)
    if "error" in result and result.get("totalItems", 0) == 0:
        raise HTTPException(status_code=503, detail=result["error"])
    return result        
                 