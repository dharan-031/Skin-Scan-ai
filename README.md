# SkinScan AI

A local-only skin photo screening aid. The browser captures or uploads a photo; FastAPI validates basic image quality and forwards the in-memory image to Ollama's local `/api/chat`. The app does not write images to disk or make cloud requests. It is not a medical diagnostic tool.

## Architecture

```text
┌────────────────────────────────────────┐
│ Browser: frontend/index.html + app.js  │
│ camera (getUserMedia) / image upload   │
└───────────────────┬────────────────────┘
                    │ multipart POST /api/analyze (localhost)
                    ▼
┌────────────────────────────────────────┐
│ FastAPI (backend/app.py)                │
│ size/type/brightness/focus checks       │
│ optional gated Kaggle classifier        │
│ in-memory base64 → Ollama /api/chat     │
│ validates JSON + enforces safety fields │
└───────────────────┬────────────────────┘
                    │ HTTP on loopback only
                    ▼
┌────────────────────────────────────────┐
│ Ollama local model (OLLAMA_MODEL)       │
│ default: medgemma:4b                    │
└────────────────────────────────────────┘
```

## Folder structure

```text
skinscanai/
├── backend/
│   ├── __init__.py
│   ├── app.py             # API, cautious vision prompt, image checks, Ollama client
│   ├── infection_classifier.py # Optional local classifier inference
│   ├── train_infection_classifier.py # grouped training and held-out evaluation
│   ├── requirements.txt
│   └── training-requirements.txt
├── frontend/
│   ├── index.html         # mobile single page and accessible result area
│   ├── app.js             # camera, upload, API call, result rendering
│   └── styles.css         # dark green theme
├── README.md              # plan, contract, prompt, Kilo Code tasks, test plan
```

## Run locally

Python 3.11+ is supported (the requested Python 3.15.6 may not be available in a given environment). Install Ollama and download a vision-capable model compatible with the configured tag. The default tag is `medgemma:4b`, matching the installed local model. Set `OLLAMA_MODEL` to the exact installed tag if yours differs.

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r backend\requirements.txt
$env:OLLAMA_MODEL = "medgemma:4b"
py -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000. Camera access works on localhost in modern browsers. API docs are at http://127.0.0.1:8000/docs. To bind to another interface, change the host explicitly; only localhost is used by default.

## API contract

### `GET /api/health`

Response `200`:

```json
{"status":"ok","model":"medgemma:4b","processing":"local Ollama; images are not stored"}
```

### `POST /api/analyze`

`multipart/form-data` fields:

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| `image` | file | yes | JPEG, PNG, WebP; maximum 12 MiB; minimum 160 × 160 px |
| `context` | string | no | Maximum 1,000 characters; user-provided, unverified |

Successful `200` response (all fields required; arrays can be empty where indicated):

```json
{
  "status": "assessed",
  "most_likely": "A possibility such as contact dermatitis (not a diagnosis)",
  "condition_common_name": "Contact dermatitis",
  "condition_medical_name": "Contact dermatitis",
  "alternatives": ["Eczema", "Fungal infection"],
  "confidence": "low",
  "confidence_reason": "The image shows limited features that overlap across conditions.",
  "visible_features": ["A small red patch", "Slight surface scaling"],
  "home_care": ["Keep the area clean and dry."],
  "avoid": ["Avoid scratching or applying unknown products."],
  "see_doctor_when": ["Arrange clinical advice if it persists or worsens."],
  "image_clarity": "The photo is clear enough for a cautious visual review.",
  "dataset_cross_check": [],
  "disclaimer": "Screening aid only, not a medical diagnosis. See a doctor for confirmation.",
  "red_flags": ["Fever, feeling very unwell, or rapidly spreading redness", "Pus, red streaks, severe pain, or rapid swelling", "Breathing difficulty, or swelling of the face, lips, tongue, or throat", "Rash on or near the eyes or face", "A rash in an infant, especially with fever or worsening symptoms"],
  "urgent_care_message": "Seek urgent medical care if any red-flag symptoms apply."
}
```

For unclear/low-confidence images, `status` is `unclear`, `confidence` is `low`, the result requests a better photo, and alternatives are empty. Errors use FastAPI's JSON shape `{"detail":"Human-readable message"}`. Statuses: `413` too large, `415` unsupported media type, `422` unreadable/dark/blurry/too-small image, `503` Ollama offline/model missing, `504` local inference timeout, `502` invalid model output.

## Vision system prompt

The running prompt is `SYSTEM_PROMPT` in `backend/app.py`. It asks the model to review focus, lighting and resolution first, give both a common name and standard medical term for a specific condition only when supported, then compare observed features against cautious visual patterns for fungal infection, bacterial infection, contact dermatitis, urticaria and eczema. It explicitly warns that appearances overlap and cannot confirm infection, forbids guessing pathogen species from a photo, and requires unclear photos to receive a request for a better image rather than a guess.

> You provide cautious visual health information, not medical care. Never claim a definitive diagnosis. Return ONLY JSON matching the supplied schema. Analyze the photo systematically: first decide whether it clearly shows skin and whether focus, lighting, and resolution are adequate; then describe only visible features (color, shape, distribution, border, scale, crust, blisters, swelling). Do not infer age, identity, skin tone history, symptoms, exposures, or duration unless provided. Consider common pattern categories without forcing a match: fungal infection (for example an annular patch with a scaly advancing edge), bacterial infection (for example warmth/swelling reported by user, pus, or honey-colored crust), allergic/contact dermatitis (itchy eczematous pattern at an exposure site), urticaria (raised transient wheals), and eczema (dry, itchy, recurrent patches). These are illustrative clues, not proof: many conditions overlap and a photo cannot establish infection or distinguish all causes. Compare the most plausible possibility with up to three alternatives using the observed features. Do not invent hallmark signs, use visual appearance alone to claim bacterial/fungal infection, or present a ranked result as certainty. If the image is blurry, too dark, not clearly skin, mostly obstructed, or evidence is insufficient, set status='unclear', confidence='low', state why and request a clear, well-lit, close photo; do not guess. Confidence must be low/medium/high with a short evidence-based reason, never a percentage. Give only general, low-risk care, what to avoid, and when to consult a clinician. Never recommend prescription drugs or dosages. OTC care may mention broad categories only and advise consulting a pharmacist/doctor. Always return the urgent-care flags, including fever, rapidly spreading redness, pus, rapid swelling, breathing difficulty, face/eye involvement, and infants. Set disclaimer exactly to: Screening aid only, not a medical diagnosis. See a doctor for confirmation.

The API also overwrites the disclaimer and red-flag list after inference, so those required fields do not depend on model compliance.

## Optional Kaggle research dataset

The selected infection-focused candidate is the [Infectious Skin Lesion Dataset on Kaggle](https://www.kaggle.com/datasets/aditybarua07/infectious-skin-lesion-dataset). Its accompanying project summary reports 18,131 images across 11 folders: bacterial infections, chickenpox, cowpox, HFMD, healthy, herpes/HPV/other STD, measles, monkeypox, infestations/bites, fungal infections, and warts/molluscum/other viral infections. It also reports significant class imbalance, including only 361 images in the bacterial group. This is a research collection compiled from multiple sources; it is not a clinically validated consumer-photo benchmark, and Kaggle's current dataset license and reuse terms must be checked before using it.

The dataset contains 11 class folders directly under `archive/Infectious Skin Lesion Dataset/`; `.gitignore` excludes this downloaded data and trained model artifacts. It contains no split metadata or license file. Training therefore makes new train/validation/test partitions and groups patient-style filename IDs and exact SHA-256 duplicates to reduce leakage. Some source images have no patient metadata, so complete subject independence cannot be guaranteed. Kaggle authentication must be configured locally, and API tokens must never be committed or sent in chat. Check the dataset's Kaggle terms and original-source terms before reuse.

To train an experimental classifier, install optional training dependencies and run from the repository root:

```powershell
py -m pip install -r backend\training-requirements.txt
py -m backend.train_infection_classifier --data-dir "archive\Infectious Skin Lesion Dataset" --epochs 12
```

The trainer uses MobileNetV3-Large transfer learning, balanced loss weighting, grouped train/validation/test splits, and reports macro-F1, balanced accuracy, and per-class metrics. ImageNet weights download once from TorchVision unless `--from-scratch` is selected. The first held-out run scored macro-F1 `0.467` and balanced accuracy `0.508`; bacterial-infection F1 was `0.21` and infestations/bites F1 was `0.07`. That is too weak to trust as an app cross-check, so the API's metric gate leaves these classifier hints disabled. It still returns a named condition possibility from MedGemma when evidence supports one, and says unclear when it does not. The Kaggle project's summary and class counts are available in its [project documentation](https://github.com/AdityBarua10/infectious-skin-lesion-classification); dataset terms are controlled by Kaggle and the original image sources.

## Kilo Code implementation tasks

1. Create a FastAPI app under `backend/` and serve the single-page frontend from `frontend/` at `/`.
2. Add Pydantic request/response models and `GET /api/health`.
3. Implement in-memory file validation (type, size, dimensions, brightness, blur) with friendly JSON errors.
4. Implement configurable `OLLAMA_MODEL` (default `medgemma:4b`), calling local `POST /api/chat` with base64 image, `stream: false`, and JSON schema in `format`.
5. Add the cautious system prompt and validate Ollama's structured response; convert offline, missing model, timeout, and invalid JSON to useful errors.
6. Enforce the disclaimer, urgent-care red flags, and low-confidence no-guess behavior on the server.
7. Build a mobile-friendly dark green HTML/CSS interface with upload and camera capture (`getUserMedia`), photo preview, optional context, loading, and errors.
8. Render all result fields, including alternatives, confidence, visible features, care, avoid, doctor guidance, and urgent-care warnings; escape model text before inserting HTML.
9. Keep data local and ephemeral. Do not add analytics, remote fonts, external scripts, cloud APIs, or image persistence.

## Test plan

Use consented, non-identifying sample photos and a vision-capable Ollama model. Test through browser and API; do not interpret these checks as clinical validation.

| Scenario | Expected behavior |
| --- | --- |
| Clear, well-lit photo with visible skin concern | Structured possibility, up to 3 alternatives, confidence reason, visible features, general steps, avoid list, clinician guidance, disclaimer, red flags |
| Blurry photo | Friendly 422 image-quality message; ask for retake; no model guess |
| Very dark photo | Friendly 422 message recommending brighter even light |
| Non-image file or unsupported format | Friendly 415/422 JSON error; frontend shows readable message rather than raw exception |
| Clearly non-skin image | Model should return `unclear`, low confidence, request an appropriate skin photo; always show red flags and disclaimer |
| Low visual evidence / ambiguous rash | `unclear`, low confidence, no alternatives, requests a better photo |
| Ollama stopped | 503 with instruction to start local Ollama |
| Configured model tag missing | 503 with the configured tag and pull/configuration guidance |
| Ollama returns malformed JSON | 502 friendly message; no broken result rendering |
| Fever, fast spread, pus, rapid swelling, breathing symptoms, face/eye, infant | Urgent-care block is present in every successful result |
| Camera permission denied | Explain permission and offer upload fallback |
| Maximum size boundary | Exactly 12 MiB accepted if valid; larger file gets 413 |

Automated follow-up can add API tests for schema constraints and mocked Ollama errors, plus browser checks for camera/upload and result rendering. No automated tests are included in this scaffold.
