"""Train a research-only image classifier on class-folder Kaggle skin images.

The split groups augmented views by the dataset's patient-style filename prefix and
exact duplicate content, keeping related images together across train/validation/test.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

import numpy as np
import torch
from PIL import Image, UnidentifiedImageError
from sklearn.metrics import balanced_accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedGroupKFold
from torch import nn
from torch.utils.data import DataLoader, Subset
from torchvision import datasets, models, transforms

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
PATIENT_FILE = re.compile(r"^(HEALTHY|MKP|CHP|CWP|MSL|HFMD)[_-](\d+)[_-](\d+)(?:[_-](?:ORIGINAL|\d+))?$", re.I)
IMAGE_MEAN = (0.485, 0.456, 0.406)
IMAGE_STD = (0.229, 0.224, 0.225)


class UnionFind:
    def __init__(self, size: int):
        self.parent = list(range(size))

    def find(self, item: int) -> int:
        while self.parent[item] != item:
            self.parent[item] = self.parent[self.parent[item]]
            item = self.parent[item]
        return item

    def union(self, left: int, right: int) -> None:
        a, b = self.find(left), self.find(right)
        if a != b:
            self.parent[b] = a


def dataset_group(path: Path) -> str:
    match = PATIENT_FILE.fullmatch(path.stem)
    if match:
        # Different photos and their generated variants for one subject remain together.
        return f"patient:{match.group(1).upper()}:{match.group(2)}"
    stem = re.sub(r"[_-](?:ORIGINAL|aug\d*|copy\d*|\d+)$", "", path.stem, flags=re.I)
    return f"file:{path.parent.name}:{stem.casefold()}"


def make_group_ids(samples: list[tuple[str, int]], root: Path) -> list[int]:
    union = UnionFind(len(samples))
    first_by_name: dict[str, int] = {}
    first_by_hash: dict[str, int] = {}
    for index, (relative, _) in enumerate(samples):
        path = root / relative
        family = dataset_group(path)
        if family in first_by_name:
            union.union(index, first_by_name[family])
        else:
            first_by_name[family] = index
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest in first_by_hash:
            union.union(index, first_by_hash[digest])
        else:
            first_by_hash[digest] = index
    roots = {root_id: group_id for group_id, root_id in enumerate({union.find(i) for i in range(len(samples))})}
    return [roots[union.find(i)] for i in range(len(samples))]


def grouped_splits(labels: np.ndarray, groups: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Approximate 70/15/15 folds while preserving groups and class balance."""
    splitter = StratifiedGroupKFold(n_splits=6, shuffle=True, random_state=42)
    train_val, test = next(splitter.split(np.zeros(len(labels)), labels, groups))
    remaining_labels = labels[train_val]
    remaining_groups = groups[train_val]
    splitter2 = StratifiedGroupKFold(n_splits=6, shuffle=True, random_state=84)
    train_local, val_local = next(splitter2.split(np.zeros(len(train_val)), remaining_labels, remaining_groups))
    train = train_val[train_local]
    val = train_val[val_local]
    # Verify no patient or exact-duplicate group crosses a split.
    if (set(groups[train]) & set(groups[val])) or (set(groups[train]) & set(groups[test])) or (set(groups[val]) & set(groups[test])):
        raise RuntimeError("Group leakage found between train, validation, and test.")
    return train, val, test


def build_model(num_classes: int, pretrained: bool) -> nn.Module:
    weights = models.MobileNet_V3_Large_Weights.DEFAULT if pretrained else None
    model = models.mobilenet_v3_large(weights=weights)
    model.classifier[-1] = nn.Linear(model.classifier[-1].in_features, num_classes)
    return model


def train(args: argparse.Namespace) -> None:
    root = Path(args.data_dir).expanduser().resolve()
    if not root.is_dir():
        raise SystemExit(f"Dataset folder not found: {root}")
    base = datasets.ImageFolder(root)
    if len(base.classes) != 11:
        raise SystemExit(f"Expected 11 class folders; found {len(base.classes)}: {base.classes}")
    if len(base) < 1000:
        raise SystemExit(f"Only {len(base)} images found; refusing to train on a partial dataset.")
    valid_samples = []
    invalid_files = []
    for path, label in base.samples:
        try:
            with Image.open(path) as image:
                image.verify()
            valid_samples.append((path, label))
        except (UnidentifiedImageError, OSError, ValueError):
            invalid_files.append(path)
    if invalid_files:
        print(f"Skipping {len(invalid_files)} corrupt/unreadable files.")
    base.samples = valid_samples
    base.imgs = valid_samples
    samples = [(Path(path).relative_to(root).as_posix(), label) for path, label in base.samples]
    labels = np.asarray([label for _, label in samples], dtype=np.int64)
    print("Building patient and duplicate groups. This reads image files to compute SHA-256 hashes…", flush=True)
    groups = np.asarray(make_group_ids(samples, root), dtype=np.int64)
    train_idx, val_idx, test_idx = grouped_splits(labels, groups)
    print(f"Images: train={len(train_idx)}, validation={len(val_idx)}, test={len(test_idx)}; independent groups={len(set(groups))}")

    train_transform = transforms.Compose([
        transforms.Resize(256), transforms.RandomResizedCrop(224, scale=(0.82, 1.0)),
        transforms.RandomHorizontalFlip(), transforms.RandomRotation(12), transforms.ToTensor(),
        transforms.Normalize(IMAGE_MEAN, IMAGE_STD),
    ])
    eval_transform = transforms.Compose([
        transforms.Resize(256), transforms.CenterCrop(224), transforms.ToTensor(),
        transforms.Normalize(IMAGE_MEAN, IMAGE_STD),
    ])
    train_data = datasets.ImageFolder(root, transform=train_transform)
    eval_data = datasets.ImageFolder(root, transform=eval_transform)
    train_data.samples = train_data.imgs = valid_samples
    eval_data.samples = eval_data.imgs = valid_samples
    workers = min(args.workers, 4)
    train_loader = DataLoader(Subset(train_data, train_idx), batch_size=args.batch_size, shuffle=True,
                              num_workers=workers, pin_memory=torch.cuda.is_available())
    val_loader = DataLoader(Subset(eval_data, val_idx), batch_size=args.batch_size, shuffle=False,
                            num_workers=workers, pin_memory=torch.cuda.is_available())
    test_loader = DataLoader(Subset(eval_data, test_idx), batch_size=args.batch_size, shuffle=False,
                             num_workers=workers, pin_memory=torch.cuda.is_available())

    device = torch.device("cuda" if torch.cuda.is_available() and not args.cpu else "cpu")
    model = build_model(len(base.classes), pretrained=not args.from_scratch).to(device)
    counts = np.bincount(labels[train_idx], minlength=len(base.classes))
    class_weights = (counts.sum() / np.maximum(counts, 1)) ** 0.5
    class_weights = class_weights / class_weights.mean()
    criterion = nn.CrossEntropyLoss(weight=torch.tensor(class_weights, dtype=torch.float32, device=device))
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.learning_rate, weight_decay=1e-4)
    output = Path(args.output).expanduser().resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    best_f1, stale_epochs = -1.0, 0

    def predict(loader: DataLoader) -> tuple[list[int], list[int]]:
        model.eval()
        actual: list[int] = []
        predicted: list[int] = []
        with torch.inference_mode():
            for images, targets in loader:
                logits = model(images.to(device, non_blocking=True))
                predicted.extend(logits.argmax(1).cpu().tolist())
                actual.extend(targets.tolist())
        return actual, predicted

    print(f"Training MobileNetV3-Large on {device}; pretrained ImageNet weights: {not args.from_scratch}", flush=True)
    for epoch in range(1, args.epochs + 1):
        model.train()
        losses: list[float] = []
        for images, targets in train_loader:
            images, targets = images.to(device, non_blocking=True), targets.to(device, non_blocking=True)
            optimizer.zero_grad(set_to_none=True)
            loss = criterion(model(images), targets)
            loss.backward()
            optimizer.step()
            losses.append(float(loss.detach().cpu()))
        y_true, y_pred = predict(val_loader)
        val_f1 = f1_score(y_true, y_pred, average="macro", zero_division=0)
        val_balanced = balanced_accuracy_score(y_true, y_pred)
        print(f"epoch={epoch}/{args.epochs} train_loss={np.mean(losses):.4f} val_macro_f1={val_f1:.4f} val_balanced_accuracy={val_balanced:.4f}", flush=True)
        if val_f1 > best_f1:
            best_f1, stale_epochs = val_f1, 0
            torch.save({"state_dict": model.cpu().state_dict(), "classes": base.classes,
                        "mean": IMAGE_MEAN, "std": IMAGE_STD, "image_size": 224,
                        "validation_macro_f1": best_f1, "dataset": "Kaggle infectious skin lesion research dataset"}, output)
            model.to(device)
        else:
            stale_epochs += 1
            if stale_epochs >= args.patience:
                break

    checkpoint = torch.load(output, map_location=device, weights_only=True)
    model.load_state_dict(checkpoint["state_dict"])
    test_true, test_pred = predict(test_loader)
    metrics = {
        "classes": base.classes,
        "images": {"total": len(samples), "train": len(train_idx), "validation": len(val_idx), "test": len(test_idx)},
        "independent_groups": len(set(groups)),
        "validation_macro_f1_best": best_f1,
        "test_macro_f1": f1_score(test_true, test_pred, average="macro", zero_division=0),
        "test_balanced_accuracy": balanced_accuracy_score(test_true, test_pred),
        "test_confusion_matrix": confusion_matrix(test_true, test_pred, labels=range(len(base.classes))).tolist(),
        "test_classification_report": classification_report(test_true, test_pred, target_names=base.classes, output_dict=True, zero_division=0),
        "split_note": "Grouped by patient-style image IDs and exact SHA-256 duplicates. Some source images lack patient metadata; group independence is not guaranteed for those source photos.",
    }
    metrics_path = output.with_name("infection_classifier_metrics.json")
    metrics_path.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(f"Saved research checkpoint: {output}")
    print(f"Held-out test macro-F1: {metrics['test_macro_f1']:.4f}; balanced accuracy: {metrics['test_balanced_accuracy']:.4f}")
    print(f"Per-class report: {metrics_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", default="archive/Infectious Skin Lesion Dataset")
    parser.add_argument("--output", default="backend/models/infection_classifier.pth")
    parser.add_argument("--epochs", type=int, default=12)
    parser.add_argument("--patience", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--workers", type=int, default=0, help="Use 0 on Windows if worker processes fail to start.")
    parser.add_argument("--learning-rate", type=float, default=1e-4)
    parser.add_argument("--cpu", action="store_true", help="Force CPU training.")
    parser.add_argument("--from-scratch", action="store_true", help="Avoid downloading ImageNet weights; typically requires more training data/epochs.")
    train(parser.parse_args())


if __name__ == "__main__":
    main()
