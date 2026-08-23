# Littora Dataset — Coastal Litter & Beach Waste

This directory documents the sourcing, labeling, merging, and pre-processing workflow for training the **YOLOv8** object detection model used in Littora's `ai-service`.

---

## Target Classes

The model focuses on four primary litter categories commonly found in coastal environments:
1. `bottle` — Plastic water/soda bottles, glass bottles
2. `can` — Metal & aluminum beverage cans
3. `bag` — Plastic shopping bags, trash bags, polymer wrapping
4. `wrapper` — Food wrappers, snack packets, chip bags

---

## Source Datasets

The dataset combines 5 open-source Roboflow / YOLOv8 packages:

| Source Dataset Package | Role / Description | Format |
|---|---|---|
| `TACO- Object Detection.v5-raw-images-alltrash.yolov8` | Base dataset — raw trash annotations in diverse contexts | YOLOv8 |
| `beach-garbage-detection.v21i.yolov8` | Coastal & beach garbage detection imagery | YOLOv8 |
| `ecotide.v1-ecotide.yolov8` | EcoTide dataset for beach & marine litter detection | YOLOv8 |
| `beach litter.v1i.yolov8` | Dedicated beach litter imagery | YOLOv8 |
| `aluminum can.v10i.yolov8` | Focused aluminum beverage can detection set | YOLOv8 |

**Official Project Workspace**: [Littora Beach Waste YOLOv8 Dataset on Roboflow](https://app.roboflow.com/kuhelis-workspace-kt5yi/littora-beach-waste-1/2)


---

## Merging & Processing Workflow

1. **Import & Consolidate**: Import raw annotations from all 5 sources into a unified Roboflow workspace.
2. **Class Remapping**: Collapse granular labels (e.g., *"Clear plastic bottle"*, *"Drink can"*, *"Garbage bag"*, *"Crisp packet"*) into the 4 target classes (`bottle`, `can`, `bag`, `wrapper`).
3. **Class Balancing & Augmentation**: Augment underrepresented classes (e.g. using `aluminum can.v10i.yolov8` to reinforce beverage cans). Apply rotation, brightness adjustment, and mosaic augmentations.
4. **Train / Val / Test Split**: Export in YOLOv8 format with an 80/10/10 split.

---

## Directory Structure

```text
dataset/
├── raw/          # Raw images/annotations as downloaded from source packages
├── merged/       # Combined datasets before class remapping
├── yolo_format/  # Final exported YOLOv8 dataset ready for model training
└── README.md
```
*(Note: Image asset folders are gitignored to maintain a lightweight repository size).*
