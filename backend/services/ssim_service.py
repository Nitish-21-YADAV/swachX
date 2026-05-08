"""
SSIM and CLIP similarity services.
- SSIM: pixel‑based comparison (fallback)
- CLIP: zero‑shot semantic similarity, supports both URL and raw bytes
"""
import cv2
import numpy as np
import requests
from skimage.metrics import structural_similarity as ssim
import torch
import clip
from PIL import Image
import io

# ----------------------------------------------------------------------
# CLIP model (lazy loading)
# ----------------------------------------------------------------------
_CLIP_MODEL = None
_CLIP_PREPROCESS = None

def _get_clip_model():
    global _CLIP_MODEL, _CLIP_PREPROCESS
    if _CLIP_MODEL is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        _CLIP_MODEL, _CLIP_PREPROCESS = clip.load("ViT-B/32", device=device)
        print(f"[CLIP] Model loaded on {device}")
    return _CLIP_MODEL, _CLIP_PREPROCESS

def run_clip_similarity(before_url: str, after_bytes: bytes) -> dict:
    """
    Compare images by URL (before) and raw bytes (after).
    Returns: {"similarity": float, "status": str, ...}
    """
    try:
        model, preprocess = _get_clip_model()
        device = next(model.parameters()).device

        resp = requests.get(before_url, timeout=10)
        before_img = Image.open(io.BytesIO(resp.content)).convert("RGB")
        after_img = Image.open(io.BytesIO(after_bytes)).convert("RGB")

        before_tensor = preprocess(before_img).unsqueeze(0).to(device)
        after_tensor = preprocess(after_img).unsqueeze(0).to(device)

        with torch.no_grad():
            before_feat = model.encode_image(before_tensor)
            after_feat = model.encode_image(after_tensor)
            before_feat = before_feat / before_feat.norm(dim=-1, keepdim=True)
            after_feat = after_feat / after_feat.norm(dim=-1, keepdim=True)
            similarity = (before_feat @ after_feat.T).item()
            similarity = (similarity + 1) / 2

        if similarity < 0.55:
            status = "Cleaned"
        elif similarity < 0.75:
            status = "Pending Review"
        else:
            status = "Rejected"

        return {
            "similarity": round(similarity, 4),
            "status": status,
            "isCleaned": similarity < 0.55,
            "needsReview": 0.55 <= similarity < 0.75,
            "method": "CLIP"
        }
    except Exception as e:
        print(f"[CLIP] Error: {e}")
        return {"error": str(e), "status": "Error"}

def run_clip_similarity_on_bytes(before_bytes: bytes, after_bytes: bytes) -> dict:
    """
    Direct CLIP comparison of two image byte arrays (no URL fetch).
    Useful for cropped images.
    """
    try:
        model, preprocess = _get_clip_model()
        device = next(model.parameters()).device

        before_img = Image.open(io.BytesIO(before_bytes)).convert("RGB")
        after_img = Image.open(io.BytesIO(after_bytes)).convert("RGB")

        before_tensor = preprocess(before_img).unsqueeze(0).to(device)
        after_tensor = preprocess(after_img).unsqueeze(0).to(device)

        with torch.no_grad():
            before_feat = model.encode_image(before_tensor)
            after_feat = model.encode_image(after_tensor)
            before_feat = before_feat / before_feat.norm(dim=-1, keepdim=True)
            after_feat = after_feat / after_feat.norm(dim=-1, keepdim=True)
            similarity = (before_feat @ after_feat.T).item()
            similarity = (similarity + 1) / 2

        if similarity < 0.55:
            status = "Cleaned"
        elif similarity < 0.75:
            status = "Pending Review"
        else:
            status = "Rejected"

        return {
            "similarity": round(similarity, 4),
            "status": status,
            "isCleaned": similarity < 0.55,
            "needsReview": 0.55 <= similarity < 0.75,
            "method": "CLIP"
        }
    except Exception as e:
        print(f"[CLIP bytes] Error: {e}")
        return {"error": str(e), "status": "Error"}

# ----------------------------------------------------------------------
# SSIM (classic, kept for compatibility)
# ----------------------------------------------------------------------
SSIM_CLEAN_THRESHOLD  = 0.68
SSIM_REVIEW_THRESHOLD = 0.52

def _fetch_image(url: str):
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        arr = np.frombuffer(r.content, np.uint8)
        return cv2.imdecode(arr, cv2.IMREAD_COLOR)
    except Exception as e:
        print(f"[SSIM] Fetch error: {e}")
        return None

def _resize(img, size=(480, 360)):
    return cv2.resize(img, size, interpolation=cv2.INTER_AREA)

def _to_gray(img):
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

def run_ssim(before_url: str, after_bytes: bytes) -> dict:
    before_img = _fetch_image(before_url)
    after_arr = np.frombuffer(after_bytes, np.uint8)
    after_img = cv2.imdecode(after_arr, cv2.IMREAD_COLOR)

    if before_img is None or after_img is None:
        return {"error": "Could not decode images", "ssimScore": None}

    b_gray = _to_gray(_resize(before_img))
    a_gray = _to_gray(_resize(after_img))
    score, _ = ssim(b_gray, a_gray, full=True)
    ssim_score = round(float(score), 4)

    # ORB feature matching (optional)
    orb = cv2.ORB_create(nfeatures=500)
    k1, d1 = orb.detectAndCompute(before_img, None)
    k2, d2 = orb.detectAndCompute(after_img, None)
    orb_ratio = 1.0
    if d1 is not None and d2 is not None and len(k1) > 0:
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = bf.match(d1, d2)
        orb_ratio = round(len(matches) / max(len(k1), 1), 4)

    is_cleaned = ssim_score < SSIM_CLEAN_THRESHOLD
    needs_review = SSIM_REVIEW_THRESHOLD <= ssim_score < SSIM_CLEAN_THRESHOLD

    if needs_review:
        status = "Pending"
    elif is_cleaned:
        status = "Cleaned"
    else:
        status = "Rejected"

    return {
        "ssimScore": ssim_score,
        "orbRatio": orb_ratio,
        "isCleaned": is_cleaned,
        "needsReview": needs_review,
        "status": status,
        "verified": True
    }