import os
import base64
import json
import google.generativeai as genai
from PIL import Image
import io
from dotenv import load_dotenv

load_dotenv()

# --- Configuration ---
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=GOOGLE_API_KEY)

# Use Gemini 1.5 Pro (or 2.0 Pro)
# Options: "gemini-1.5-pro", "gemini-2.0-pro-exp", "gemini-1.5-flash"
MODEL_NAME = "gemini-2.5-flash"  # Change to "gemini-2.0-pro-exp" if you have access

def analyze_waste_image(image_bytes):
    """
    Sends an image to Google Gemini and returns structured waste analysis.
    """
    try:
        # Load image   
        image = Image.open(io.BytesIO(image_bytes))

        # The prompt - instructs model to return only JSON 
        prompt = """
        You are a waste management AI. Analyze the uploaded image of garbage.  
        Return **ONLY** a valid JSON object with the following structure.
        Do not include any other text, explanation, or markdown formatting.

        {
            "plastics": [
                {"type": "PET", "count": number, "totalWeightKg": number},
                {"type": "HDPE", "count": number, "totalWeightKg": number},
                {"type": "PVC", "count": number, "totalWeightKg": number},
                {"type": "LDPE", "count": number, "totalWeightKg": number},
                {"type": "PP", "count": number, "totalWeightKg": number},
                {"type": "PS", "count": number, "totalWeightKg": number}
            ],
            "others": [
                {"type": "metal", "count": number, "totalWeightKg": number},
                {"type": "glass", "count": number, "totalWeightKg": number},
                {"type": "paper", "count": number, "totalWeightKg": number},
                {"type": "organic", "count": number, "totalWeightKg": number}
            ],
            "totalWeightKg": number,
            "totalItems": number
        }

        Use these standard average weights (in kg):
        - Plastic bottle (PET/HDPE/PP): 0.02 each
        - Plastic bag (LDPE): 0.005 each
        - Plastic container (PVC/PS): 0.03 each
        - Metal can: 0.015 each
        - Glass bottle: 0.3 each
        - Paper sheet: 0.005 each
        - Organic waste (fruit/veg): 0.05 each
        """

        # Initialize Gemini model
        model = genai.GenerativeModel(MODEL_NAME)
        
        # Generate content with image and prompt
        response = model.generate_content([prompt, image])
        
        # Extract text from response
        output_text = response.text.strip()
        
        # Clean markdown if present
        if output_text.startswith('```json'):
            output_text = output_text[7:]
        if output_text.endswith('```'):
            output_text = output_text[:-3]
        
        # Parse JSON
        result = json.loads(output_text)
        return result

    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return {
            "error": str(e),
            "plastics": [],
            "others": [],
            "totalWeightKg": 0,
            "totalItems": 0
        }