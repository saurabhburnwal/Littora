"""
AI Service — beach waste detection.

Supports multi-model inference (YOLOv8 Medium, YOLOv11 Medium, YOLOv26 Small).
Stateless FastAPI service — Node backend orchestrates model selection and persistence.
"""

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from PIL import Image
from ultralytics import YOLO
from severity import compute_score

import io
import os
import torch

app = FastAPI(title="Beach Waste Detection AI Service")

MODELS_CONFIG = {
    "yolov8m": {
        "id": "yolov8m",
        "name": "YOLOv8 Medium",
        "tag": "Standard Baseline",
        "architecture": "YOLOv8m",
        "params": "25.9M",
        "path": "models/best.pt",
        "description": "Balanced speed & precision for general coastal debris detection.",
        "badge": "Baseline"
    },
    "yolov11m": {
        "id": "yolov11m",
        "name": "YOLOv11 Medium",
        "tag": "Enhanced Accuracy",
        "architecture": "YOLOv11m",
        "params": "20.1M",
        "path": "models/yolov11m.pt",
        "description": "Enhanced feature extraction & attention mechanisms for complex or occluded waste.",
        "badge": "Default (High Precision)"
    },
    "yolov26s": {
        "id": "yolov26s",
        "name": "YOLOv26 Small",
        "tag": "Ultra-Fast Edge",
        "architecture": "YOLOv26s",
        "params": "9.6M",
        "path": "models/yolov26s.pt",
        "description": "Lightweight, low-latency inference optimized for real-time mobile & drone feeds.",
        "badge": "Fastest"
    }
}

loaded_models = {}

def get_yolo_model(model_id: str):
    target = MODELS_CONFIG.get(model_id, MODELS_CONFIG["yolov11m"])
    path = target["path"]

    if model_id in loaded_models:
        return loaded_models[model_id], target["name"]

    if os.path.exists(path):
        try:
            m = YOLO(path)
            loaded_models[model_id] = m
            return m, target["name"]
        except Exception as err:
            print(f"[Warning] Failed to load model weights at {path}: {err}")

    # Dynamic Fallback: check available model files in models/ directory
    fallback_order = ["models/yolov11m.pt", "models/yolov26s.pt", "models/best.pt"]
    for fb_path in fallback_order:
        if os.path.exists(fb_path):
            fb_key = os.path.basename(fb_path).replace(".pt", "")
            if fb_key not in loaded_models:
                try:
                    loaded_models[fb_key] = YOLO(fb_path)
                except Exception as ex:
                    print(f"[Warning] Could not load fallback {fb_path}: {ex}")
                    continue
            return loaded_models[fb_key], target["name"]

    # Final fallback if standard weights are required
    if "default" not in loaded_models:
        loaded_models["default"] = YOLO("yolov8n.pt")
    return loaded_models["default"], target["name"]


CLASS_NORMALIZATION = {
    "bottle": "bottle",
    "can": "can",
    "bag": "bag",
    "wrapper": "wrapper",
}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/models")
def list_models():
    return {"models": list(MODELS_CONFIG.values())}


@app.post("/detect")
async def detect(
    file: UploadFile = File(...),
    model_name: str = Form("yolov11m")
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read image file")

    model, model_display_name = get_yolo_model(model_name)
    with torch.inference_mode():
        results = model.predict(image, verbose=False)[0]

    detections: dict[str, int] = {}
    boxes = []
    w, h = image.size
    for box in results.boxes:
        class_id = int(box.cls[0])
        raw_name = model.names[class_id]
        name = CLASS_NORMALIZATION.get(raw_name, raw_name)
        detections[name] = detections.get(name, 0) + 1
        
        xyxy = box.xyxy[0].tolist()
        conf = float(box.conf[0])
        boxes.append({
            "class_name": name,
            "confidence": round(conf, 2),
            "box": [round(xyxy[0], 1), round(xyxy[1], 1), round(xyxy[2], 1), round(xyxy[3], 1)],
            "box_normalized": [
                round(xyxy[0] / w, 4),
                round(xyxy[1] / h, 4),
                round(xyxy[2] / w, 4),
                round(xyxy[3] / h, 4)
            ]
        })

    total_waste, pollution_score, severity = compute_score(detections)

    return {
        "detections": detections,
        "total_waste": total_waste,
        "pollution_score": pollution_score,
        "severity": severity,
        "boxes": boxes,
        "model_used": model_name,
        "model_name": model_display_name,
    }
