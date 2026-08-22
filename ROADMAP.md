# 🌊 Littora — Future Feature Roadmap & Improvement Proposals

> **Note**: Preserved for implementation after project evaluation. The codebase is currently frozen in a 100% verified, stable state.

---

## 🌟 Tier 1: High-Impact UX & AI Features (Quick Wins)

### 1. 📍 Automatic GPS EXIF Extraction from Photos
- **Description**: Automatically extract embedded GPS coordinates from smartphone camera photos uploaded by users (`exif-js` / `piexifjs`).
- **Benefits**:
  - Eliminates the need for manual location selection.
  - Automatically identifies beach coordinates and matches nearest coastal region.

### 2. 🎚️ Interactive Confidence & Category Filter on Lightbox Modals
- **Description**: Add real-time interactivity to the detection popup modal (`BoundingBoxImage.jsx`).
- **Features**:
  - **Confidence Threshold Slider** (`25% – 90%`): Dynamically hides/shows bounding boxes based on detection certainty.
  - **Category Filter Chips** (`Bottle`, `Can`, `Bag`, `Wrapper`): Clicking a category highlights that specific debris type and dims others.
  - **Hover Tooltips**: Highlights the corresponding row in the waste breakdown list when hovering over a bounding box.

### 3. 📤 Multi-Photo Batch Upload & Survey Queue
- **Description**: Allow coastal survey volunteers and marine biologists to drag and drop multiple photos (5–10 images) at once.
- **Features**:
  - Sequential asynchronous queue with progress indicators.
  - Aggregated multi-image analysis report for an entire beach walk.

---

## 📊 Tier 2: Environmental Action & Research Exports

### 4. 📅 Cleanup Drive Organizer & Volunteer Dispatch Brief
- **Description**: One-click generation of actionable cleanup drive packages from the Cleanup Recommendations page.
- **Features**:
  - Exportable PDF brief with exact GPS map pins, estimated volunteers needed, and required trash bags.
  - Hazardous debris alerts (e.g., broken glass, sharp rusted metal cans).
  - Downloadable `.ics` calendar invites for community cleanup events.

### 5. 🗺️ GeoJSON & GIS Research CSV Export
- **Description**: Provide open data export formats for NGOs, marine biology researchers, and municipal environmental teams.
- **Endpoints / Formats**:
  - `GeoJSON` (`/api/dataset.geojson`): Native compatibility with **QGIS**, **ArcGIS**, and **Google Earth**.
  - Standardized `CSV` export matching UNEP / NOAA marine debris classification standards.

### 6. ⏱️ Temporal Scrubbing Timeline on the Pollution Map
- **Description**: Add an interactive timeline slider (`2024 → 2025 → 2026`) on the global Pollution Map.
- **Benefits**:
  - Visualizes pollution changes and cleanup recovery over time at specific beaches.

---

## ⚡ Tier 3: AI & Performance Engineering

### 7. 🧩 YOLO Instance Segmentation Masks (YOLO-seg)
- **Description**: Upgrade model capabilities from rectangular bounding boxes to pixel-level polygon segmentation masks (`yolov11m-seg.pt`).
- **Benefits**:
  - Accurately captures irregular waste shapes (torn plastic bags entangled in seaweed, ghost nets, scattered micro-debris).

### 8. 🔄 Real-Time Live Sync (Supabase Realtime)
- **Description**: Subscribe to database events on `public.analyses` via Supabase Realtime WebSocket channels.
- **Benefits**:
  - Live Map and Dashboard update instantly without page reloads when new scans are submitted from anywhere in the world.

### 9. 🖼️ Client-Side WebP Compression Before Upload
- **Description**: Convert and compress high-resolution smartphone photos (8–15 MB) to optimized WebP (< 1.5 MB) directly in the browser using `browser-image-compression` before sending to the backend.
- **Benefits**:
  - Reduces mobile data usage and speeds up upload times by up to 80% in remote coastal areas.

---

## 📋 Implementation Matrix

| Improvement | Effort | Impact | Target Layer |
|---|:---:|:---:|---|
| **GPS EXIF Extraction** | 🟢 Low (1 hr) | 🚀 High | Frontend (`UploadForm.jsx`) |
| **Interactive Lightbox Filters** | 🟢 Low (1 hr) | 🚀 High | Frontend (`BoundingBoxImage.jsx`) |
| **GeoJSON / CSV Export** | 🟢 Low (30 min) | 📈 Medium | Backend (`stats.js` / `analyses.js`) |
| **Cleanup Action Brief / PDF** | 🟡 Medium (2 hrs) | 💎 High | Frontend (`CleanupPage.jsx`) |
| **Batch Multi-Photo Upload** | 🟡 Medium (2 hrs) | 🚀 High | Frontend + Backend |
| **Supabase Realtime Live Map** | 🟡 Medium (1.5 hrs) | 🌟 High | Frontend (`PollutionMap.jsx`) |
| **YOLO Instance Segmentation** | 🔴 High (3 hrs) | 🌟 High | AI Service (`main.py`) |
