# Dataset (Member 1)

Target classes: **bottle, can, bag, wrapper** — beach/coastal litter context.

## Sources

| Source | Role |
|---|---|
| [TACO](https://github.com/pedropro/TACO) | Base dataset — widest class coverage, many outdoor/coastal images |
| Roboflow "beach" aggregation (`new-workspace-iyutw/beach-dpf2n`) | Pre-merged TACO + Trash Detection + Plastic Waste Detection |
| Lebanese University "test beach" set | Small but real coastal imagery, classes overlap target set |

## Workflow

1. Import all three sources into one Roboflow Universe project.
2. Use Roboflow's class-remap tool to collapse fine-grained labels (e.g. "Clear plastic bottle," "Drink can," "Garbage bag," "Crisp packet") into the four target classes.
3. Check class balance across the merged set — backfill any underrepresented class (likely "wrapper") with extra images before exporting.
4. Export in **YOLOv8 format** (Roboflow handles the train/val/test split) directly into `yolo_format/`.

## Folders (gitignored — see root `.gitignore`)

```
dataset/
├── raw/          # source images/annotations as downloaded
├── merged/       # after combining the three sources, before remap
└── yolo_format/  # final exported dataset, ready for ai-service training
```

These folders aren't committed to git (too large) — document where the merged dataset is hosted (e.g. a shared Drive link or Roboflow project URL) for the team here once it's ready.
