"""
Seed script: populates agencyDB.DataAgency collection with pincode→email mappings.
Run once after setting up MongoDB: python scripts/seed_agencies.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from database import agency_col, setup_indexes
from dotenv import load_dotenv
load_dotenv()

# ── Agency data (pincode → agency email) ─────────────────────────────────────
AGENCIES = [ 
    # BMC Mumbai 400001-400107
    *[{"pincode":str(p),"agency":"BMC","city":"Mumbai","email":"nitishzone229@gmail.com"}         for p in range(400001,400108)],
    # NMMC Navi Mumbai
    *[{"pincode":str(p),"agency":"NMMC","city":"Navi Mumbai","email":"nitishzone229@gmail.com"}
      for p in [400701,400702,400703,400704,400705,400706,400707,400708,400709,400710,
                400711,400712,400714,400715,400716,400717,400718,400719,400720]],
    # TMC Thane
    *[{"pincode":str(p),"agency":"TMC","city":"Thane","email":"nitishzone229@gmail.com"}
      for p in [400601,400602,400603,400604,400605,400606,400607,400608,400610,400612,400615,400616,400617]],
    # KDMC Kalyan-Dombivli
    *[{"pincode":str(p),"agency":"KDMC","city":"Kalyan-Dombivli","email":"nitishzone229@gmail.com"}
      for p in [421001,421002,421003,421004,421005,421006,421101,421102,421103,421201,421202,
                421203,421204,421301,421302,421303,421304,421305,421306,421401,421402,421403]],
    # NMC Nagpur 440001-440036
    *[{"pincode":str(p),"agency":"NMC Nagpur","city":"Nagpur","email":"nitishzone229@gmail.com"}   for p in range(440001,440037)],
    # NMC Nashik
    *[{"pincode":str(p),"agency":"NMC Nashik","city":"Nashik","email":"nitishzone229@gmail.com"} for p in range(422001,422022)],
    # Satara
    *[{"pincode":str(p),"agency":"SMC Satara","city":"Satara","email":"nitishzone229@gmail.com"}
      for p in [415001,415002,415003,415004,415005,415010,415011,415012,415015,415020]],
    # Sangli
    *[{"pincode":str(p),"agency":"SMKC Sangli","city":"Sangli","email":"nitishzone229@gmail.com"}
      for p in [416416,416410,416411,416412,416413,416414,416415,416301,416302,416303,416304,416305]],
    # Kolhapur
    *[{"pincode":str(p),"agency":"KMC Kolhapur","city":"Kolhapur","email":"nitishzone229@gmail.com"}
      for p in [416001,416002,416003,416004,416005,416006,416007,416008,416010,416011,416012,
                416013,416014,416015,416016,416020,416021,416022,416023]],
]      

if __name__ == "__main__":
    print("[Seed] Setting up indexes…")
    setup_indexes()

    print("[Seed] Clearing existing DataAgency records…")
    agency_col().drop()
    agency_col().create_index("pincode", unique=True)

    # Deduplicate by pincode
    seen = {}
    for item in AGENCIES:
        seen[item["pincode"]] = item

    records = list(seen.values())
    agency_col().insert_many(records)
    print(f"[Seed] ✅ Inserted {len(records)} pincode→agency mappings into agencyDB.DataAgency")
    print("[Seed] Sample:")
    for r in records[:3]:
        print(f"       {r['pincode']} → {r['agency']} ({r['email']})")
