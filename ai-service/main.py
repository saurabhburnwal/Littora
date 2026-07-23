"""
AI Service — beach waste detection.

Single responsibility: run YOLOv8 inference on an uploaded image and return
detection counts + a computed pollution score/severity. This service is
stateless — it never touches Supabase or the database; Node owns persistence.
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from PIL import Image
import io

from ultralytics import YOLO

from severity import compute_score

app = FastAPI(title="Beach Waste Detection AI Service")

# yolov8m.pt (medium) is used for higher accuracy and recall over the nano
# variant — better suited for detecting small or partially occluded beach
# waste items. Replace with the path to your trained weights once Member 2
# finishes training on the remapped (bottle/can/bag/wrapper) dataset.
MODEL_PATH = "models/yolov8m.pt"
model = YOLO(MODEL_PATH)

# YOLO class names → our four target classes. If the trained model's
# class names already match exactly, this is a no-op; it exists as a
# safety net in case the dataset export used slightly different labels.
CLASS_NORMALIZATION = {
    "bottle": "bottle",
    "can": "can",
    "bag": "bag",
    "wrapper": "wrapper",
}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read image file")

    results = model.predict(image, verbose=False)[0]

    detections: dict[str, int] = {}
    for box in results.boxes:
        class_id = int(box.cls[0])
        raw_name = model.names[class_id]
        name = CLASS_NORMALIZATION.get(raw_name, raw_name)
        detections[name] = detections.get(name, 0) + 1

    total_waste, pollution_score, severity = compute_score(detections)

    return {
        "detections": detections,
        "total_waste": total_waste,
        "pollution_score": pollution_score,
        "severity": severity,
    }
