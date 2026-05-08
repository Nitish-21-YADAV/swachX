"""Extract GPS latitude, longitude, pincode from image EXIF."""
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import io, re

def _dms_to_dec(dms_val, ref):
    try:
        d = float(dms_val[0])
        m = float(dms_val[1])
        s = float(dms_val[2])
        dec = d + m / 60.0 + s / 3600.0
        if ref in ("S", "W"):
            dec = -dec
        return round(dec, 7)
    except Exception:
        return None

def extract_metadata(img_bytes: bytes) -> dict:
    result = {
        "latitude": None,
        "longitude": None,
        "pincode": None,
        "altitude": None,
        "datetime": None,
        "hasGPS": False
    }
    try:
        img = Image.open(io.BytesIO(img_bytes))
        raw_exif = img._getexif()
        if not raw_exif:    
            return result

        exif = {TAGS.get(k, k): v for k, v in raw_exif.items()}
        result["datetime"] = str(exif.get("DateTime") or exif.get("DateTimeOriginal") or "")

        gps_raw = exif.get("GPSInfo")
        if not gps_raw:
            return result

        gps = {GPSTAGS.get(k, k): v for k, v in gps_raw.items()}

        lat_dms = gps.get("GPSLatitude")
        lat_ref = gps.get("GPSLatitudeRef", "N")
        lng_dms = gps.get("GPSLongitude")
        lng_ref = gps.get("GPSLongitudeRef", "E")

        if lat_dms and lng_dms:
            result["latitude"]  = _dms_to_dec(lat_dms, lat_ref)
            result["longitude"] = _dms_to_dec(lng_dms, lng_ref)
            result["hasGPS"]    = True

        alt = gps.get("GPSAltitude")
        if alt:
            result["altitude"] = round(float(alt), 2)

        # Attempt pincode extraction from text EXIF fields
        for field in ("ImageDescription", "UserComment", "XPComment",
                      "XPSubject", "Software", "Artist"):
            val = exif.get(field, "") or ""
            if isinstance(val, bytes):
                val = val.decode("utf-8", "ignore")
            match = re.search(r"\b([1-9]\d{5})\b", str(val))
            if match:
                result["pincode"] = match.group(1)
                break

    except Exception as e:
        print(f"[EXIF] {e}")

    return result
