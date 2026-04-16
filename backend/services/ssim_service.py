"""
SSIM-based cleanup verification.
Low SSIM score (images DIFFER) → area was cleaned.
High SSIM score (images SIMILAR) → area still dirty.
"""
import cv2, numpy as np, requests
from skimage.metrics import structural_similarity as ssim

SSIM_CLEAN_THRESHOLD  = 0.80   # Below this → significant change → cleaned
SSIM_REVIEW_THRESHOLD = 0.62   # Between 0.62–0.80 → needs review

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
    after_arr  = np.frombuffer(after_bytes, np.uint8)
    after_img  = cv2.imdecode(after_arr, cv2.IMREAD_COLOR)

    if before_img is None or after_img is None:
        return {"error": "Could not decode images", "ssimScore": None}

    b_gray = _to_gray(_resize(before_img))
    a_gray = _to_gray(_resize(after_img))

    score, diff = ssim(b_gray, a_gray, full=True)
    ssim_score  = round(float(score), 4)

    # ORB feature matching for extra confidence
    orb = cv2.ORB_create(nfeatures=500)
    k1, d1 = orb.detectAndCompute(before_img, None)
    k2, d2 = orb.detectAndCompute(after_img, None)
    orb_ratio = 1.0
    if d1 is not None and d2 is not None and len(k1) > 0:
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = bf.match(d1, d2)
        orb_ratio = round(len(matches) / max(len(k1), 1), 4)

    # Decision logic
    is_cleaned   = ssim_score < SSIM_CLEAN_THRESHOLD
    needs_review = SSIM_REVIEW_THRESHOLD <= ssim_score < SSIM_CLEAN_THRESHOLD

    if needs_review:
        status = "Pending"       # needs admin manual review
    elif is_cleaned:
        status = "Cleaned"
    else:
        status = "Rejected"      # area not clean enough

    return {
        "ssimScore":   ssim_score,
        "orbRatio":    orb_ratio,
        "isCleaned":   is_cleaned,
        "needsReview": needs_review,
        "status":      status,
        "verified":    True
    }
