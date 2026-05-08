import os
import requests
import datetime
from bson import ObjectId
import google.generativeai as genai
from database import complaints_col, verify_col

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

def process_verification_decision(
    complaint_id: str,
    status: str,
    items_left: int,
    agent_reason: str,
    verified_by_email: str,
    after_image_url: str
):
    """Updates MongoDB with the AI decision."""
    now = datetime.datetime.utcnow()
    upd = {
        "afterImageURL": after_image_url,
        "afterTotalItems": items_left if items_left >= 0 else None,
        "status": status,
        "staffRemark": f"AI Agent: {agent_reason}",
        "updatedAt": now,
        "verificationMethod": "Gemini_Twin_Vision_Agent",
    }
    if status == "Cleaned":
        upd["resolvedAt"] = now
    complaints_col().update_one({"_id": ObjectId(complaint_id)}, {"$set": upd})

    complaint = complaints_col().find_one({"_id": ObjectId(complaint_id)})
    before_items = complaint.get("totalItems", 0) if complaint else 0
    verify_col().insert_one({
        "complaintId": complaint_id,
        "beforeImageURL": complaint.get("imageURL") if complaint else "",
        "afterImageURL": after_image_url,
        "beforeTotalItems": before_items,
        "afterTotalItems": items_left,
        "status": status,
        "agentReason": agent_reason,
        "verifiedBy": verified_by_email,
        "verifiedAt": now
    })
    return {"success": True}

def run_twin_vision_agent(
    complaint_id: str,
    before_image_url: str,
    after_image_bytes: bytes,
    verified_by_email: str,
    after_image_url: str
):
    # 1. Fetch before image
    try:
        resp = requests.get(before_image_url, timeout=10)
        resp.raise_for_status()
        before_bytes = resp.content
    except Exception as e:
        print(f"[TwinVision] Fetch before image failed: {e}")
        return {"error": "Could not fetch original complaint image."}

    # 2. Prepare images
    image_parts = [
        {"mime_type": "image/jpeg", "data": before_bytes},
        {"mime_type": "image/jpeg", "data": after_image_bytes}
    ]

    model = genai.GenerativeModel(
        model_name='gemini-2.5-flash',
        tools=[process_verification_decision]
    )

    prompt = f"""
You are the SwachX Verification Agent.
I provide TWO images:
- Image 1: BEFORE (complaint)
- Image 2: AFTER (staff proof)

Execute in order:

1. LOCATION & FRAMING:
   - Same background? (trees, walls, road)
   - Camera angle suspicious? (shifted to hide waste)
   - If different location or deceptive framing → status="Rejected", items_left=-1, reason="Location mismatch or deceptive framing". Stop.

2. WASTE RESOLUTION (only if location passes):
   - Count visible waste items in Image 2 where waste was in Image 1.
   - ≤5 items → status="Cleaned"
   - 6‑20 items but visibly cleaner → status="Pending Review"
   - >20 items or unchanged → status="Rejected"

You MUST call the tool `process_verification_decision` with:
- complaint_id: "{complaint_id}"
- status: (string) "Cleaned", "Pending Review", or "Rejected"
- items_left: integer
- agent_reason: short explanation
- verified_by_email: "{verified_by_email}"
- after_image_url: "{after_image_url}"

Do not output any conversational text – only call the tool.
"""

    try:
        response = model.generate_content([prompt, *image_parts])
        # Force Gemini to call the tool
        # If no function call, raise error
        found_tool = False
        for part in response.parts:
            if fn := part.function_call:
                if fn.name == "process_verification_decision":
                    args = dict(fn.args)   # ✅ Correct extraction
                    process_verification_decision(**args)
                    return {
                        "status": args["status"],
                        "afterItems": args["items_left"],
                        "message": args["agent_reason"]
                    }
                    found_tool = True
        if not found_tool:
            print("[TwinVision] Gemini did not call the tool. Response:", response.text[:200])
            # Fallback: use text response to infer decision (simple)
            text = response.text.lower()
            if "cleaned" in text:
                status = "Cleaned"
                after_items = 0
                reason = "Gemini inferred cleaned (no tool call)."
            elif "rejected" in text:
                status = "Rejected"
                after_items = -1
                reason = "Gemini inferred rejected (no tool call)."
            else:
                status = "Pending Review"
                after_items = -1
                reason = "Agent could not decide, manual review needed."
            # Update manually
            process_verification_decision(
                complaint_id=complaint_id,
                status=status,
                items_left=after_items,
                agent_reason=reason,
                verified_by_email=verified_by_email,
                after_image_url=after_image_url
            )
            return {"status": status, "afterItems": after_items, "message": reason}
    except Exception as e:
        print(f"[TwinVision] Error: {e}")
        return {"error": f"AI Agent error: {str(e)}"}