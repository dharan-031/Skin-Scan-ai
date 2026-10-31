"""Local-only SkinScan AI API. Images are inspected in memory and never written to disk."""
from __future__ import annotations

import base64
import io
import json
import os
from pathlib import Path
from typing import Literal

import httpx
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, ImageOps, ImageStat, UnidentifiedImageError
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from .infection_classifier import predict_dataset_classes

OLLAMA_URL = "http://127.0.0.1:11434"
MODEL_TAG = os.getenv("OLLAMA_MODEL", "medgemma:4b")
MAX_IMAGE_BYTES = 12 * 1024 * 1024
DISCLAIMER = "Screening aid only, not a medical diagnosis. See a doctor for confirmation."
RED_FLAGS = [
    "Fever, feeling very unwell, or rapidly spreading redness",
    "Pus, red streaks, severe pain, or rapid swelling",
    "Breathing difficulty, or swelling of the face, lips, tongue, or throat",
    "Rash on or near the eyes or face",
    "A rash in an infant, especially with fever or worsening symptoms",
]


class Assessment(BaseModel):
    status: Literal["assessed", "unclear"]
    most_likely: str = Field(description="Name one specific condition as a possibility when the evidence supports it; otherwise say unclear. Never state a diagnosis.")
    condition_common_name: str = Field(default="Not established from this photo", description="Familiar plain-language name, or state that it is unclear")
    condition_medical_name: str = Field(default="Not established from this photo", description="Standard medical/scientific condition term; do not guess a pathogen species")
    alternatives: list[str] = Field(default_factory=list, max_length=3)
    confidence: Literal["low", "medium", "high"]
    confidence_reason: str
    visible_features: list[str]
    home_care: list[str]
    avoid: list[str]
    see_doctor_when: list[str]
    image_clarity: str
    dataset_cross_check: list[str] = Field(default_factory=list)
    disclaimer: str = DISCLAIMER
    red_flags: list[str] = Field(default_factory=lambda: RED_FLAGS.copy())
    urgent_care_message: str = "Seek urgent medical care if any red-flag symptoms apply."


ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT_DIR / "frontend"
app = FastAPI(title="SkinScan AI", version="1.0.0")
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

SYSTEM_PROMPT = f"""You provide cautious visual health information, not medical care. Never claim a definitive diagnosis. Return ONLY JSON matching the supplied schema. When evidence supports a likely possibility, name the specific condition (for example ringworm/tinea, impetigo, cellulitis, contact dermatitis, urticaria, eczema, chickenpox, or scabies), not only a generic word such as 'infection' or 'rash'. Provide both condition_common_name (familiar plain-language name) and condition_medical_name (standard medical/scientific term), such as 'ringworm' and 'tinea corporis' when that site-specific term is supported. Do not guess an organism or pathogen species from appearance alone; use 'Not established from this photo' when a medical term cannot be supported. If evidence does not support a specific condition, set status='unclear' and do not guess. Analyze the photo systematically: first decide whether it clearly shows skin and whether focus, lighting, and resolution are adequate; then describe only visible features (color, shape, distribution, border, scale, crust, blisters, swelling). Do not infer age, identity, skin tone history, symptoms, exposures, or duration unless provided.

Consider common pattern categories without forcing a match: fungal infection (for example an annular patch with a scaly advancing edge), bacterial infection (for example warmth/swelling reported by user, pus, or honey-colored crust), allergic/contact dermatitis (itchy eczematous pattern at an exposure site), urticaria (raised transient wheals), and eczema (dry, itchy, recurrent patches). These are illustrative clues, not proof: many conditions overlap and a photo cannot establish infection or distinguish all causes. Compare the most plausible possibility with up to three alternatives using the observed features. Do not invent hallmark signs, use visual appearance alone to claim bacterial/fungal infection, or present a ranked result as certainty.

If the image is blurry, too dark, not clearly skin, mostly obstructed, or evidence is insufficient, set status='unclear', confidence='low', state why and request a clear, well-lit, close photo; do not guess. Confidence must be low/medium/high with a short evidence-based reason, never a percentage. Give only general, low-risk care, what to avoid, and when to consult a clinician. Never recommend prescription drugs or dosages. OTC care may mention broad categories only and advise consulting a pharmacist/doctor. Always return the urgent-care flags, including fever, rapidly spreading redness, pus, rapid swelling, breathing difficulty, face/eye involvement, and infants. Set disclaimer exactly to: {DISCLAIMER}"""


def inspect_image(data: bytes) -> tuple[str, str]:
    """Reject obvious technical failures before spending a local model request."""
    try:
        with Image.open(io.BytesIO(data)) as opened:
            image = ImageOps.exif_transpose(opened).convert("RGB")
            width, height = image.size
            if width < 160 or height < 160:
                raise HTTPException(422, "The photo is too small. Please choose an image at least 160 × 160 pixels.")
            gray = image.convert("L")
            mean = ImageStat.Stat(gray).mean[0]
            # Laplacian variance is a simple blur signal; use a conservative threshold.
            import numpy as np
            pixels = np.asarray(gray, dtype=np.float32)
            lap = -4 * pixels[1:-1, 1:-1] + pixels[:-2, 1:-1] + pixels[2:, 1:-1] + pixels[1:-1, :-2] + pixels[1:-1, 2:]
            sharpness = float(lap.var())
            if mean < 30:
                raise HTTPException(422, "The photo is too dark to review. Please retake it in brighter, even light.")
            if sharpness < 8:
                raise HTTPException(422, "The photo looks blurry. Please retake it in focus and keep the camera steady.")
            return ("clear enough for a cautious visual review", f"Image dimensions {width} × {height}; brightness and focus checks passed.")
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(422, "This file is not a readable image. Please upload a JPG, PNG, or WebP photo.")


@app.get("/")
async def home() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "model": MODEL_TAG, "processing": "local Ollama; images are not stored"}


@app.post("/api/analyze", response_model=Assessment)
async def analyze(image: UploadFile = File(...), context: str = Form(default="")) -> Assessment:
    content_type = (image.content_type or "").lower()
    if content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(415, "Please upload a JPG, PNG, or WebP image.")
    data = await image.read(MAX_IMAGE_BYTES + 1)
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "The photo is larger than 12 MB. Please choose a smaller image.")
    clarity, diagnostics = inspect_image(data)
    dataset_hypotheses = await run_in_threadpool(predict_dataset_classes, data)
    classifier_note = (
        "\nOptional Kaggle-trained research classifier top labels (not clinically validated, not calibrated, and not probabilities): "
        + "; ".join(dataset_hypotheses)
        + ". Use only as weak cross-checks if visible features support them. If these conflict with the photo, ignore them and lower confidence."
        if dataset_hypotheses else ""
    )
    prompt = f"Review this skin photo using the visual pattern steps in your instructions. Image check: {clarity}. {diagnostics}\nUser context (unverified; may help distinguish itch/allergy from infection but does not prove a cause): {context[:1000] or 'None provided.'}{classifier_note}"
    payload = {
        "model": MODEL_TAG,
        "stream": False,
        "format": Assessment.model_json_schema(),
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt, "images": [base64.b64encode(data).decode("ascii")]},
        ],
        "options": {"temperature": 0.1},
    }
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=3.0)) as client:
            response = await client.post(f"{OLLAMA_URL.rstrip('/')}/api/chat", json=payload)
    except httpx.ConnectError:
        raise HTTPException(503, "Ollama is offline. Start Ollama locally, then try again.")
    except httpx.TimeoutException:
        raise HTTPException(504, "The local model took too long to respond. Try again or use a smaller image.")
    if response.status_code >= 400:
        detail = "The configured Ollama model is unavailable. Check that the model tag is installed and try again."
        try:
            if "model" in response.text.lower() and ("not found" in response.text.lower() or "pull" in response.text.lower()):
                detail = f"Model '{MODEL_TAG}' is not installed in Ollama. Pull that model tag, or update OLLAMA_MODEL."
        except Exception:
            pass
        raise HTTPException(503, detail)
    try:
        body = response.json()
        raw = body["message"]["content"]
        result = Assessment.model_validate(json.loads(raw))
    except Exception:
        raise HTTPException(502, "The local model returned an unreadable result. Please try again with a clear photo.")
    # Enforce non-negotiable safety text regardless of model compliance.
    result.disclaimer = DISCLAIMER
    result.red_flags = RED_FLAGS.copy()
    result.dataset_cross_check = dataset_hypotheses
    if result.confidence == "low" or result.status == "unclear":
        result.status = "unclear"
        result.most_likely = "Unclear from this photo"
        result.condition_common_name = "Unclear from this photo"
        result.condition_medical_name = "Not established from this photo"
        result.alternatives = []
        result.home_care = ["Retake the photo in focus with bright, even lighting. Do not delay medical care if symptoms are worsening."]
    else:
        if result.condition_common_name == "Not established from this photo":
            result.condition_common_name = result.most_likely
        if not result.condition_medical_name.strip():
            result.condition_medical_name = "Not established from this photo"
    return result
