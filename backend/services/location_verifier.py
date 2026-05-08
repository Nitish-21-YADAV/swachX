# backend/services/location_verifier.py
import cv2
import numpy as np
import exifread
from geopy.distance import geodesic
import io

class LocationVerifier:
    def __init__(self):
        self.orb = cv2.ORB_create(nfeatures=2000)
        self.bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    
    def crop_to_boxes(self, img_bytes, detections, expand_ratio=0.1):
        """
        img_bytes: raw image bytes
        detections: list of dicts with "box_2d": [ymin, xmin, ymax, xmax] (normalised 0-1000)
        expand_ratio: expand box by this percentage (to include surroundings)
        Returns: cropped image bytes (JPEG), or None if no detections
        """
        if not detections:
            return None
        # Read image
        img = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_COLOR)
        h, w = img.shape[:2]
        
        # Collect all boxes, convert to pixel coordinates
        boxes = []
        for det in detections:
            ymin, xmin, ymax, xmax = det['box_2d']
            # Normalised [0,1000] to pixel
            x1 = int(xmin / 1000.0 * w)
            y1 = int(ymin / 1000.0 * h)
            x2 = int(xmax / 1000.0 * w)
            y2 = int(ymax / 1000.0 * h)
            # Ensure valid
            x1, x2 = max(0, min(x1, x2)), min(w, max(x1, x2))
            y1, y2 = max(0, min(y1, y2)), min(h, max(y1, y2))
            if x2 > x1 and y2 > y1:
                boxes.append((x1, y1, x2, y2))
        
        if not boxes:
            return None
        
        # Union of all boxes
        min_x = min(b[0] for b in boxes)
        min_y = min(b[1] for b in boxes)
        max_x = max(b[2] for b in boxes)
        max_y = max(b[3] for b in boxes)
        
        # Expand slightly
        expand_w = int((max_x - min_x) * expand_ratio)
        expand_h = int((max_y - min_y) * expand_ratio)
        min_x = max(0, min_x - expand_w)
        min_y = max(0, min_y - expand_h)
        max_x = min(w, max_x + expand_w)
        max_y = min(h, max_y + expand_h)
        
        # Crop
        cropped = img[min_y:max_y, min_x:max_x]
        # Encode back to bytes
        _, encoded = cv2.imencode('.jpg', cropped, [cv2.IMWRITE_JPEG_QUALITY, 85])
        return encoded.tobytes()

    def extract_gps_from_bytes(self, img_bytes):
        """Extract GPS coordinates from image EXIF"""
        try:
            tags = exifread.process_file(io.BytesIO(img_bytes), details=False)
            lat_tag = tags.get('GPS GPSLatitude')
            lon_tag = tags.get('GPS GPSLongitude')
            lat_ref = tags.get('GPS GPSLatitudeRef')
            lon_ref = tags.get('GPS GPSLongitudeRef')
            if lat_tag and lon_tag:
                lat = float(lat_tag.values[0]) + float(lat_tag.values[1])/60 + float(lat_tag.values[2])/3600
                lon = float(lon_tag.values[0]) + float(lon_tag.values[1])/60 + float(lon_tag.values[2])/3600
                if lat_ref.values == 'S':
                    lat = -lat
                if lon_ref.values == 'W':
                    lon = -lon
                return (lat, lon)
        except Exception as e:
            print(f"[GPS] Error: {e}")
        return None

    def compute_geohash(self, lat, lon, precision=6):
        if not lat or not lon:
            return None
        lat_grid = int((lat + 90) / 0.5)
        lon_grid = int((lon + 180) / 0.5)
        return f"{lat_grid}_{lon_grid}"

    def feature_matching_similarity(self, img1_bytes, img2_bytes):
        img1 = cv2.imdecode(np.frombuffer(img1_bytes, np.uint8), cv2.IMREAD_GRAYSCALE)
        img2 = cv2.imdecode(np.frombuffer(img2_bytes, np.uint8), cv2.IMREAD_GRAYSCALE)
        if img1 is None or img2 is None:
            return 0.0
        kp1, des1 = self.orb.detectAndCompute(img1, None)
        kp2, des2 = self.orb.detectAndCompute(img2, None)
        if des1 is None or des2 is None or len(kp1) < 5 or len(kp2) < 5:
            return 0.0
        matches = self.bf.match(des1, des2)
        matches = sorted(matches, key=lambda x: x.distance)[:50]
        similarity = len(matches) / max(len(kp1), len(kp2))
        return round(similarity, 4)

    def verify_same_location(self, before_bytes, after_bytes):
        """
        Returns: (is_same_location, confidence)
        is_same_location can be True, False, or None (uncertain)
        """
        # 1. GPS comparison
        gps_before = self.extract_gps_from_bytes(before_bytes)
        gps_after = self.extract_gps_from_bytes(after_bytes)
        if gps_before and gps_after:
            distance = geodesic(gps_before, gps_after).meters
            if distance < 150:
                return True, 0.95
            elif distance < 500:
                return True, 0.7
            else:
                return False, max(0.0, 1 - distance/1000)
        
        # 2. Feature matching fallback
        orb_sim = self.feature_matching_similarity(before_bytes, after_bytes)
        if orb_sim > 0.12:
            return True, min(orb_sim * 2, 0.9)
        else:
            # Uncertain -> return None (pending review)
            return None, orb_sim

    def verify_location_and_cleaning(self, before_bytes, after_bytes, clip_similarity):
        same_loc, loc_conf = self.verify_same_location(before_bytes, after_bytes)
        
        # If location uncertain -> Pending Review
        if same_loc is None:
            return {
                "status": "Pending Review",
                "reason": f"Location verification uncertain (confidence {loc_conf:.2f}). Manual review needed.",
                "location_confidence": loc_conf,
                "clip_similarity": clip_similarity,
                "final_decision": "Pending Review"
            }
        # If different location -> Rejected
        if not same_loc:
            return {
                "status": "Rejected",
                "reason": "Different location detected. Please upload after‑image from the exact same spot.",
                "location_confidence": loc_conf,
                "clip_similarity": clip_similarity,
                "final_decision": "Rejected"
            }
        
        # Location same – now check cleaning using CLIP similarity
        if clip_similarity < 0.55:
            status = "Cleaned"
        elif clip_similarity < 0.75:
            status = "Pending Review"
        else:
            status = "Rejected"
        
        return {
            "status": status,
            "reason": f"Location verified (confidence {loc_conf:.2f}). Cleaning similarity: {clip_similarity:.2f}",
            "location_confidence": loc_conf,
            "clip_similarity": clip_similarity,
            "final_decision": status
        }