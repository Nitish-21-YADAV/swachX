"""
YOLOv11 inference + comprehensive waste knowledge base.
Provides wasteType, degradability, environmentalImpact, recyclability.
"""
import os, cv2, numpy as np

MODEL_PATH = "./models/best_old.pt"
_model = None

def get_model():
    global _model
    if _model is None:
        try:
            from ultralytics import YOLO
            _model = YOLO(MODEL_PATH)
            print(f"[YOLO] Model loaded: {MODEL_PATH}")
        except Exception as e:
            print(f"[YOLO] Model load warning: {e} — using fallback classification")
    return _model

# ── Waste Knowledge Base ──────────────────────────────────────────────────────
WASTE_KB = {
    "plastic_bottle": {
        "wasteType": "Plastic Waste — PET Bottle",
        "degradable": False,
        "decomposeYears": 450,
        "environmentalImpact": (
            "PET plastic bottles persist in the environment for up to 450 years. "
            "They break down into microplastics that contaminate soil, groundwater and marine ecosystems. "
            "Marine animals mistake fragments for food, causing internal injuries and starvation. "
            "Chemical additives like antimony can leach into nearby water sources."
        ),
        "recyclable": "Yes — Rinse and place in blue dry-waste bin. Converted to polyester fibre.",
        "recycleBenefit": "Recycling 1 tonne of PET saves ~1.5 tonnes of CO₂ emissions.",
        "severity": "HIGH",
        "color": "#ef4444",
        "icon": "🍶"
    },
    "plastic_bag": {
        "wasteType": "LDPE",
        "degradable": False,
        "decomposeYears": 1000,
        "environmentalImpact": (
            "Plastic bags cause urban flooding by clogging storm drains. "
            "Livestock and marine animals ingest them, leading to intestinal blockage and death. "
            "They fragment into persistent microplastics that enter the food chain. "
            "Open burning of plastic bags releases toxic dioxins and furans into the air."
        ),
        "recyclable": "Limited — Only via designated store take-back programs. Switch to cloth bags.",
        "recycleBenefit": "Eliminating single-use bags prevents over 8 billion kg of plastic waste annually.",
        "severity": "CRITICAL",
        "color": "#dc2626",
        "icon": "🛍️"
    },
    "styrofoam": {
        "wasteType": "Plastic Waste — EPS Styrofoam",
        "degradable": False,
        "decomposeYears": 500,
        "environmentalImpact": (
            "Styrofoam breaks into tiny beads that are nearly impossible to clean up. "
            "It absorbs and concentrates toxic chemicals like PCBs from water. "
            "Styrene monomer residues are classified as possible human carcinogens. "
            "Animals frequently ingest EPS beads, causing false satiety and starvation."
        ),
        "recyclable": "Specialised EPS densification facilities only. Cannot enter regular bins.",
        "recycleBenefit": "Densified EPS can be turned into picture frames, park benches and insulation.",
        "severity": "HIGH",
        "color": "#f97316",
        "icon": "📦"
    },
    "glass_bottle": {
        "wasteType": "Glass Waste — Container Glass",
        "degradable": False,
        "decomposeYears": 1000000,
        "environmentalImpact": (
            "Glass shards injure humans and wildlife. "
            "Broken glass can act as a lens, concentrating sunlight to start fires in dry conditions. "
            "Though inert, glass never biologically decomposes, persisting for over a million years. "
            "Improper disposal wastes a fully recyclable and infinitely reusable material."
        ),
        "recyclable": "Yes, 100% — Sort by colour and place in green glass bin.",
        "recycleBenefit": "Recycling glass saves 20% energy vs making new glass; reduces CO₂ by ~300 kg/tonne.",
        "severity": "MEDIUM",
        "color": "#84cc16",
        "icon": "🍾"
    },
    "metal_can": {
        "wasteType": "Metal Waste — Aluminium/Steel Can",
        "degradable": False,
        "decomposeYears": 200,
        "environmentalImpact": (
            "Rusting cans leach iron and heavy metals into soil and water. "
            "Sharp edges cause injuries to children and wildlife. "
            "Aluminium production is extremely energy-intensive; waste is a missed recycling opportunity. "
            "Discarded cans collect stagnant water, becoming mosquito breeding sites."
        ),
        "recyclable": "Yes — Crush and place in metal recycling bin.",
        "recycleBenefit": "Aluminium recycling uses 95% less energy than primary smelting.",
        "severity": "MEDIUM",
        "color": "#6366f1",
        "icon": "🥫"
    },
    "food_waste": {
        "wasteType": "Organic Waste — Food Waste",
        "degradable": True,
        "decomposeYears": 0.08,
        "environmentalImpact": (
            "Open food waste attracts rodents, stray animals, flies and mosquitoes, "
            "creating serious public health risks including leptospirosis and dengue. "
            "In landfills, organic matter decomposes anaerobically, releasing methane—"
            "a greenhouse gas 25× more potent than CO₂ over 100 years. "
            "Leachate from rotting food contaminates groundwater."
        ),
        "recyclable": "Yes — Compost at home or use green organic bin. Produces biogas and fertiliser.",
        "recycleBenefit": "Composting 1 tonne of food waste prevents ~500 kg of methane-equivalent emissions.",
        "severity": "MEDIUM",
        "color": "#22c55e",
        "icon": "🍎"
    },
    "cardboard": {
        "wasteType": "Paper Waste — Cardboard",
        "degradable": True,
        "decomposeYears": 0.17,
        "environmentalImpact": (
            "Wet cardboard blocks stormwater drains causing urban flooding. "
            "Burning cardboard releases particulate matter, aggravating respiratory conditions. "
            "Though biodegradable, landfilled cardboard still generates methane as it breaks down. "
            "Wasted paper represents deforestation—17 trees are felled per tonne of non-recycled paper."
        ),
        "recyclable": "Yes — Flatten, keep dry, and tie for paper recycler.",
        "recycleBenefit": "Recycling cardboard saves 17 trees and 7,000 gallons of water per tonne.",
        "severity": "LOW",
        "color": "#84cc16",
        "icon": "📦"
    },
    "e_waste": {
        "wasteType": "Electronic Waste — Hazardous E-Waste",
        "degradable": False,
        "decomposeYears": 1000,
        "environmentalImpact": (
            "E-waste contains lead, mercury, cadmium, arsenic and brominated flame retardants. "
            "Informal dismantling causes severe neurological damage and cancer in workers and children. "
            "Heavy metals contaminate groundwater for decades; mercury bioaccumulates in aquatic food chains. "
            "Burning circuit boards releases carcinogenic polycyclic aromatic hydrocarbons."
        ),
        "recyclable": "Yes, but ONLY via CPCB-authorised e-waste collection centres. Never burn or crush.",
        "recycleBenefit": "1 million recycled phones yield 35 lbs of copper, 772 lbs of glass, 33 lbs of precious metals.",
        "severity": "CRITICAL",
        "color": "#dc2626",
        "icon": "💻"
    },
    "tyre": {
        "wasteType": "Rubber Waste — Vehicle Tyre",
        "degradable": False,
        "decomposeYears": 80,
        "environmentalImpact": (
            "Discarded tyres collect rainwater, creating ideal breeding grounds for dengue and malaria mosquitoes. "
            "Tyre fires are nearly impossible to extinguish and release thick toxic black smoke, "
            "containing benzene, toluene and dioxins. "
            "Tyre crumb rubber contains heavy metals that leach into soil and groundwater."
        ),
        "recyclable": "Yes — Return to authorised rubber recycler or tyre dealer.",
        "recycleBenefit": "Ground rubber produces playground surfaces, athletic tracks and road asphalt.",
        "severity": "HIGH",
        "color": "#f97316",
        "icon": "🔧"
    },
    "construction_waste": {
        "wasteType": "C&D Waste — Construction & Demolition",
        "degradable": False,
        "decomposeYears": 200,
        "environmentalImpact": (
            "Concrete and brick dust particles cause silicosis (lung scarring) in nearby workers and residents. "
            "C&D debris blocks roads and storm drains, worsening urban flooding. "
            "Asbestos-containing materials pose severe cancer risk if improperly handled. "
            "Heavy metals from paints and coatings leach into surrounding soil."
        ),
        "recyclable": "Yes — Crushed concrete replaces 20-30% virgin aggregate in new construction.",
        "recycleBenefit": "Recycling C&D waste diverts 25-30% of landfill volume, saving significant tipping fees.",
        "severity": "HIGH",
        "color": "#a16207",
        "icon": "🧱"
    },
    "medical_waste": {
        "wasteType": "Biomedical Waste — Hazardous",
        "degradable": False,
        "decomposeYears": 500,
        "environmentalImpact": (
            "Improperly discarded syringes spread HIV, Hepatitis B and C through needlestick injuries. "
            "Pharmaceutical residues disrupt hormones in aquatic ecosystems at nanogram concentrations. "
            "Pathogen-laden waste can trigger epidemic outbreaks of cholera, typhoid and hepatitis. "
            "Antibiotic residues in waste drive antimicrobial resistance, a global health emergency."
        ),
        "recyclable": "No — Must be handled by CPCB-authorised biomedical waste handlers ONLY.",
        "recycleBenefit": "Proper treatment via autoclave or incineration eliminates 99.99% of pathogens.",
        "severity": "CRITICAL",
        "color": "#dc2626",
        "icon": "💉"
    },
    "waste": {
        "wasteType": "Mixed / Unclassified Waste",
        "degradable": False,
        "decomposeYears": 300,
        "environmentalImpact": (
            "Mixed waste dumping prevents any form of recycling or safe treatment. "
            "Hazardous items mixed with general waste contaminate the entire batch. "
            "Open dumpsites breed disease vectors, emit greenhouse gases, and pollute groundwater. "
            "Blocked drainage from mixed debris is a leading cause of urban flooding."
        ),
        "recyclable": "Segregation required first: green (wet organic), blue (dry recyclable), red (hazardous).",
        "recycleBenefit": "Proper segregation enables recovery of 70% of typical mixed waste as useful materials.",
        "severity": "HIGH",
        "color": "#6b7280",
        "icon": "🗑️"
    }
}

DEFAULT_WASTE = {
    "wasteType": "General Waste",
    "degradable": False,
    "decomposeYears": 200,
    "environmentalImpact": (
        "Unidentified waste poses unknown environmental risks. "
        "Open dumping contaminates soil and water, harms wildlife, and creates public health hazards. "
        "All waste should be properly segregated and disposed via municipal waste management."
    ),
    "recyclable": "Segregate into wet, dry, and hazardous categories before disposal.",
    "recycleBenefit": "Proper disposal reduces environmental burden and enables resource recovery.",
    "severity": "MEDIUM",
    "color": "#94a3b8",
    "icon": "♻️"
}

def _get_info(class_name: str) -> dict:
    cn = class_name.lower().replace(" ", "_").replace("-", "_")
    for key, info in WASTE_KB.items():
        if key in cn or cn in key:
            return info
    # fuzzy match
    for key in WASTE_KB:
        parts = key.split("_")
        if any(p in cn for p in parts if len(p) > 3):
            return WASTE_KB[key]
    return DEFAULT_WASTE

def run_detection(img_bytes: bytes) -> dict:
    model = get_model()
    if model is None:
        return {
            "wasteType": "Unknown — AI Model Not Loaded",
            "degradable": False,
            "decomposeYears": 0,
            "environmentalImpact": "AI model unavailable. Please ensure best.pt is in ai_service/models/",
            "recyclable": "Unavailable",
            "detections": [],
            "totalItems": 0,
            "hasHazardous": False,
            "error": "Model not loaded"
        }

    nparr  = np.frombuffer(img_bytes, np.uint8)
    img    = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return {"error": "Cannot decode image", "detections": [], "totalItems": 0}

    results    = model(img, conf=0.35)[0]
    detections = []
    type_counts = {}

    for box in results.boxes:
        cls_name = model.names[int(box.cls)].lower().strip()
        conf     = float(box.conf)
        x1,y1,x2,y2 = map(int, box.xyxy[0])
        info = _get_info(cls_name)
        det  = {
            "class":      cls_name,
            "label":      cls_name.replace("_"," ").title(),
            "confidence": round(conf * 100, 1),
            "bbox":       [x1,y1,x2,y2],
            **info
        }
        detections.append(det)
        wt = info["wasteType"].split("—")[0].strip()
        type_counts[wt] = type_counts.get(wt, 0) + 1

    primary = detections[0] if detections else {}
    return {
        "wasteType":           primary.get("wasteType", "Unknown"), 
        "degradable":          primary.get("degradable", False),
        "decomposeYears":      primary.get("decomposeYears", 0),
        "environmentalImpact": primary.get("environmentalImpact", ""),
        "recyclable":          primary.get("recyclable", "Unknown"),
        "recycleBenefit":      primary.get("recycleBenefit", ""),
        "severity":            primary.get("severity", "MEDIUM"),
        "icon":                primary.get("icon", "♻️"),
        "totalItems":          len(detections),
        "typeSummary":         type_counts,
        "detections":          detections,
        "hasHazardous":        any(d.get("severity") == "CRITICAL" for d in detections),
    }
