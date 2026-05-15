import os
import base64
import json
import time
import traceback
import io

from google import genai
from google.genai import types
from google.genai.errors import ServerError, ClientError
from PIL import Image, ImageDraw, ImageFont
from dotenv import load_dotenv
from json_repair import repair_json

load_dotenv()

# ──────────────────────────────────────────────
# CLIENT SETUP & STABLE MODELS
# ──────────────────────────────────────────────
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
client = genai.Client(api_key=GOOGLE_API_KEY)

# [OK] SwachX Production Model Fallbacks
MODEL_FALLBACKS = [
    "gemini-2.5-flash",       # Primary: Best for image + bounding boxes
    "gemini-2.0-flash",       # Fallback 1: Stable if 2.5 is on heavy load (503)
    "gemini-2.5-pro",         # Fallback 2: Heavy duty & highly accurate
]

# ──────────────────────────────────────────────
# PROMPT (Strict JSON & Hallucination Blocked)
# ──────────────────────────────────────────────
PROMPT = """
You are a highly accurate waste detection AI analyzing an image.
Detect up to a MAXIMUM of 40 distinct, prominent waste objects. 
CRITICAL RULES:
- DO NOT hallucinate. 
- DO NOT repeat the same object or coordinates in a loop.
- Bounding box coordinates normalized to [0, 1000] exactly as an array of 4 numbers [ymin, xmin, ymax, xmax].

Plastic labels: PET bottle, HDPE bottle, PVC container, LDPE bag, PP container, PS container
Other labels: metal can, glass bottle, paper/cardboard, organic waste, mixed waste

Return ONLY this exact JSON structure:
{
  "wasteType": "<dominant waste category string>",
  "environmentalImpact": "<2 sentence impact description>",
  "plastics": [
    {"type": "PET",  "count": 0, "totalWeightKg": 0.0},
    {"type": "HDPE", "count": 0, "totalWeightKg": 0.0},
    {"type": "PVC",  "count": 0, "totalWeightKg": 0.0},
    {"type": "LDPE", "count": 0, "totalWeightKg": 0.0},
    {"type": "PP",   "count": 0, "totalWeightKg": 0.0},
    {"type": "PS",   "count": 0, "totalWeightKg": 0.0}
  ],
  "others": [
    {"type": "metal",   "count": 0, "totalWeightKg": 0.0},
    {"type": "glass",   "count": 0, "totalWeightKg": 0.0},
    {"type": "paper",   "count": 0, "totalWeightKg": 0.0},
    {"type": "organic", "count": 0, "totalWeightKg": 0.0}
  ],
  "totalWeightKg": 0.0,
  "totalItems": 0,
  "detections": [
    {"label": "<specific waste label>", "box_2d": [ymin, xmin, ymax, xmax]}
  ]
}

Weights: PET/HDPE/PP=0.02, LDPE=0.005, PVC/PS=0.03, metal=0.015, glass=0.3, paper=0.005, organic=0.05
"""

# ──────────────────────────────────────────────
# JSON EXTRACTION
# ──────────────────────────────────────────────
def extract_and_fix_json(text: str) -> dict:
    cleaned = text.strip()
    for fence in ["```json", "```"]:
        if cleaned.startswith(fence):
            cleaned = cleaned[len(fence):]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        try:
            repaired = repair_json(cleaned)
            return json.loads(repaired)  
        except Exception as e:
            print(f"[JSON Repair] Failed: {e}\nRaw (first 400): {text[:400]}")
            raise

# ──────────────────────────────────────────────
# LOCAL BOUNDING BOX DRAWING
# ──────────────────────────────────────────────
LABEL_COLORS = {
    "PET": "#FF6B6B", "HDPE": "#FF9F43", "PVC": "#F368E0", "LDPE": "#FFC312",
    "PP": "#C4E538", "PS": "#12CBC4", "metal": "#A3CB38", "glass": "#1289A7",
    "paper": "#D980FA", "organic": "#B53471", "mixed": "#9980FA",
}

def get_color(label: str) -> str:
    for key, color in LABEL_COLORS.items():
        if key.lower() in label.lower(): return color
    return "#C8F135"

def draw_boxes(image: Image.Image, detections: list) -> Image.Image:
    draw = ImageDraw.Draw(image)
    width, height = image.size

    font_label = ImageFont.load_default()
    for font_path in ["arial.ttf", "Arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]:
        try:
            font_label = ImageFont.truetype(font_path, 14)
            break
        except Exception: continue

    for i, det in enumerate(detections):
        label = det.get("label", "waste")
        box   = det.get("box_2d")

        if not box or len(box) != 4: continue

        try:
            # [OK] FIX: Safe casting & sorting to prevent PIL crash
            ymin, xmin, ymax, xmax = float(box[0]), float(box[1]), float(box[2]), float(box[3])
            if not all(0 <= v <= 1000 for v in [ymin, xmin, ymax, xmax]): continue

            x1, x2 = sorted([int((xmin / 1000.0) * width), int((xmax / 1000.0) * width)])
            y1, y2 = sorted([int((ymin / 1000.0) * height), int((ymax / 1000.0) * height)])

            if x1 == x2: x2 += 2
            if y1 == y2: y2 += 2

        except (ValueError, TypeError): continue

        color = get_color(label)
        draw.rectangle([x1, y1, x2, y2], outline=color, width=3)
        text = f" {label} "
        bbox = draw.textbbox((x1, y1 - 18), text, font=font_label)
        ty = y1 - 18 if y1 > 18 else y2
        bbox = draw.textbbox((x1, ty), text, font=font_label)
        draw.rectangle([bbox[0]-1, bbox[1]-1, bbox[2]+1, bbox[3]+1], fill=color)
        draw.text((x1, ty), text, fill="#050D05", font=font_label)

    return image

# ──────────────────────────────────────────────
# GEMINI API CALLER
# ──────────────────────────────────────────────
def call_gemini(img_bytes: bytes, retries_per_model: int = 3) -> str:
    last_error = None
    for model_name in MODEL_FALLBACKS:
        print(f"[llm_detector] Trying model: {model_name}")
        for attempt in range(retries_per_model):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=[
                        types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg"),
                        types.Part.from_text(text=PROMPT),
                    ],
                    config=types.GenerateContentConfig(
                        temperature=0.0,
                        response_mime_type="application/json", # [OK] STRICT JSON 
                    ),
                )
                if not response.candidates:
                    raise ValueError(f"Empty response from {model_name}")
                print(f"[llm_detector] Success - model: {model_name}")
                return response.text
                
            except ServerError as e:
                last_error = e
                if "503" in str(e) or "UNAVAILABLE" in str(e):
                    wait = 4 * (2 ** attempt)
                    print(f"[llm_detector] 503 Overload. Waiting {wait}s...")
                    time.sleep(wait)
                else: break
            except ClientError as e:
                last_error = e
                print(f"[llm_detector] Skipped {model_name} (Not found/400).")
                break
            except Exception as e:
                last_error = e
                time.sleep(2)
                
    raise RuntimeError(f"All models failed. Last error: {last_error}")

# ──────────────────────────────────────────────
# MAIN PIPELINE
# ──────────────────────────────────────────────
def analyze_waste_image(image_bytes: bytes) -> dict:
    try:
        # [OK] STEP 1: Load and Auto-Resize to 1024px to save payload/tokens
        original_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        max_size = 1024
        if max(original_image.size) > max_size:
            original_image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        
        # Convert for API
        img_buffer = io.BytesIO()
        original_image.save(img_buffer, format="JPEG", quality=90)
        
        # [OK] STEP 2: Call Gemini API            
        raw_text = call_gemini(img_buffer.getvalue())
        result = extract_and_fix_json(raw_text)

        # [OK] STEP 3: Safe Defaults
        result.setdefault("wasteType", "Mixed Waste")
        result.setdefault("environmentalImpact", "Waste causes environmental damage.")
        result.setdefault("totalWeightKg", 0.0)
        
        # [OK] STEP 4: Force maximum 15 objects (Prevents UI Freeze)
        detections = result.get("detections", [])
        detections = detections[:40] 
        result["detections"] = detections          
        result["totalItems"] = len(detections)
        print(f"[llm_detector] Safely rendering {len(detections)} objects.")   
  
        # [OK] STEP 5: Draw boxes locally (Zero API tokens)
        annotated = draw_boxes(original_image.copy(), detections)

        # [OK] STEP 6: Save as lightweight JPEG base64 (Fixes 5MB String bloat)
        out_buf = io.BytesIO()
        annotated.save(out_buf, format="JPEG", quality=85) 
        result["annotated_image_base64"] = base64.b64encode(out_buf.getvalue()).decode("utf-8")

        return result

    except Exception as e:
        print(f"[llm_detector] Fatal error:")
        traceback.print_exc()
        return {    
            "error": str(e),                                
            "wasteType": "Unknown",
            "environmentalImpact": "Analysis failed.",
            "totalItems": 0,
            "totalWeightKg": 0.0,
            "detections": [],
            "annotated_image_base64": ""
        }    