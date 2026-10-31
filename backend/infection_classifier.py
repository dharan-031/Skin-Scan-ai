"""Optional local Kaggle-trained image-classifier cross-check."""
from __future__ import annotations

import os
import json
from pathlib import Path
from threading import Lock

MODEL_PATH = Path(os.getenv("SKINSCAN_CLASSIFIER_PATH", Path(__file__).parent / "models" / "infection_classifier.pth"))
_model = None
_classes: list[str] = []
_load_lock = Lock()


def _load():
    global _model, _classes
    if _model is not None:
        return _model, _classes
    if not MODEL_PATH.is_file():
        return None, []
    metrics_path = MODEL_PATH.with_name("infection_classifier_metrics.json")
    if not metrics_path.is_file():
        return None, []
    try:
        metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
        # Refuse weak checkpoints rather than feeding unreliable class guesses to MedGemma.
        if metrics.get("test_macro_f1", 0) < 0.60 or metrics.get("test_balanced_accuracy", 0) < 0.60:
            return None, []
    except (OSError, ValueError, TypeError):
        return None, []
    with _load_lock:
        if _model is not None:
            return _model, _classes
        import torch
        from torch import nn
        from torchvision import models

        checkpoint = torch.load(MODEL_PATH, map_location="cpu", weights_only=True)
        classes = checkpoint.get("classes")
        if not isinstance(classes, list) or len(classes) != 11:
            raise ValueError("The local skin classifier checkpoint has invalid class metadata.")
        model = models.mobilenet_v3_large(weights=None)
        model.classifier[-1] = nn.Linear(model.classifier[-1].in_features, len(classes))
        model.load_state_dict(checkpoint["state_dict"])
        model.eval()
        _model, _classes = model, classes
    return _model, _classes


def predict_dataset_classes(image_bytes: bytes) -> list[str]:
    """Return tentative labels only; never return scores as diagnostic confidence."""
    model, classes = _load()
    if model is None:
        return []
    import torch
    from PIL import Image, ImageOps
    from torchvision import transforms

    preprocess = transforms.Compose([
        transforms.Resize(256), transforms.CenterCrop(224), transforms.ToTensor(),
        transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225)),
    ])
    with Image.open(__import__("io").BytesIO(image_bytes)) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")
        tensor = preprocess(image).unsqueeze(0)
    with torch.inference_mode():
        logits = model(tensor)
        probs = torch.softmax(logits, dim=1)[0]
        top = torch.topk(probs, k=3)
    # These are model outputs, not calibrated probabilities or a diagnosis.
    if float(top.values[0]) < 0.35:
        return []
    return [classes[int(index)] for index in top.indices]
