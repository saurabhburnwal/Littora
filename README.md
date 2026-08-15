# LITTORA — AI Beach Waste Detection & Coastal Pollution Monitoring Platform

**Littora** is an end-to-end AI-powered web application that detects, classifies, and analyzes beach and coastal waste items (*plastics, bottles, cans, bags, foam, glass, metal*) using **YOLOv11m** (with multi-model support for YOLOv11m, YOLOv26s, and YOLOv8m) object detection. It scores pollution severity, tracks environmental trends over time, visualizes beach pollution heatmaps, and provides automated cleanup recommendations.

---

## Key Features

- **Smart AI Detection**: Real-time object detection powered by **YOLOv11m** (Ultralytics) with bounding boxes, confidence scoring, waste classification, and pollution severity calculation (Low, Moderate, High, Severe).
- **Dual Theme Design System**:
  - **Earth Theme**: Warm coastal dune aesthetic (`#f7f2e8` sand tones with custom watercolor botany artwork).
  - **Dark Theme**: High-contrast dark dashboard (`#0a0f1e` deep navy with `#00d4aa` cyan accents, custom glowing cyber-botanical artwork, and high-contrast typography).
- **Auth & 3-Tier Data Access Isolation**:
  - Integrated Supabase Auth with Role-Based Access Control.
  - **Administrator**: System-wide platform metrics across all uploaders with uploader email & name enrichment.
  - **Account Member**: User-scoped metrics and personal detection history gallery.
  - **Guest Visitor**: Interactive preview access (statistics, maps, dataset explorer) with locked actions (*AI detection, data export, report generation, deletion*) prompting an `AuthRequiredModal`.
  - Implements **Standard Supabase Sliding Sessions** (seamless background token rotation without artificial hard cutoffs).
- **Floating Account Menu & Collapsable Navigation**:
  - **Top-Right Floating Account Trigger**: Elevated glassmorphic badge displaying avatar, role status (*Administrator amber, Member teal, Guest grey*), quick links (`/settings`, `/history`, `/analytics`), and modal logout confirmation.
  - **Collapsable Sidebar**: Smooth grid transition between expanded (`250px`) and icon-only (`72px`) view with persistent state.
- **High-Performance PDF Report Generation**:
  - Export styled, publication-ready PDF reports (`Daily`, `Weekly`, `Monthly`, `Custom`).
  - Optimized vector/canvas PDF generator using `jsPDF` + `html2canvas` with **75% JPEG compression** (~200KB file size, 97%+ reduction).
- **User-Scoped Settings System**:
  - **Isolated Storage**: Dynamic localStorage keys formatted as `littora_*_user_<id>` for logged-in users and `littora_*_guest` for guest visitors.
  - **Language Preferences**: Interface language switcher (English, Hindi, Tamil).
  - **Date Format Control**: Configurable date formatting across all tables and charts (`DD MMM YYYY`, `MM/DD/YYYY`, `YYYY-MM-DD`).
  - **Dynamic Pagination**: Customizable rows per page (`10`, `25`, `50`) persisted across sessions.
  - **Notification Controls**: Email alerts, high-pollution threshold notifications, and weekly report preferences.
  - **Data Export & Privacy**: One-click JSON data export of all user analyses and account deletion workflows.
- **Comprehensive Analytics & Reporting**:
  - **Historical Trends**: Detections over time, waste breakdown stacked charts, day/time pollution heatmaps.
  - **Interactive Beach Map**: Geolocation tracking of pollution hot spots with interactive markers and coastal beach presets (*Marina Beach, Puri Beach, Malpe Beach*).
  - **Cleanup Recommendations**: Automated priority-based cleanup suggestions based on severity.
  - **Dataset Explorer**: Sourcing notes and breakdown of merged coastal YOLO training datasets.

---

## Architecture Overview

```
                          ┌───────────────────────────┐
                          │   React 18 + Vite (SPA)   │
                          │   Port: 5173              │
                          └─────────────┬─────────────┘
                                        │ (HTTP / JSON / FormData)
                                        ▼
                          ┌───────────────────────────┐
                          │  Node.js / Express API    │
                          │  Port: 4000               │
                          └──────┬─────────────┬──────┘
                                 │             │
        (Uploads Image & Persists)              (Forward Image for Inference)
                                 │             │
                                 ▼             ▼
  ┌────────────────────────────────────────────────────────┐       ┌─────────────────────────────────┐
  │ Supabase (Postgres + Storage)                          │       │ Python FastAPI + YOLO Inference │
  │ • Storage Bucket: beach-waste-images                   │       │ Port: 8000                      │
  │ • Normalized 5NF Schema:                               │       │ • Multi-model support:          │
  │   - analyses, detections, locations, waste_types       │       │   (yolov11m, yolov26s, yolov8m) │
  │   - ai_models, system_settings                         │       │ • Returns detection JSON & bbox │
  │ • Consolidated View: public.vw_analysis_details        │       └─────────────────────────────────┘
  └────────────────────────────────────────────────────────┘
```

---

## Repository Layout

```text
Littora/
├── frontend/               → React + Vite SPA (Port 5173) [See frontend/README.md]
│   ├── src/
│   │   ├── assets/        → Themed artwork (Earth & Dark navbar images)
│   │   ├── components/    → Sidebar, FloatingAccountMenu, HistoryTable, ResultPanel, UploadForm, etc.
│   │   ├── context/       → AuthContext, ThemeContext, SettingsContext, StatsContext
│   │   ├── pages/         → Dashboard, Detect, Trends, Map, History, Settings, Reports, etc.
│   │   ├── utils/         → PDF Report Generator (generatePdfReport.js)
│   │   └── index.css      → Complete CSS design system & dark mode tokens
│   └── package.json       → Vitest unit testing suite (161 tests passing 100%)
├── backend/                → Node.js / Express API Server (Port 4000) [See backend/README.md]
│   └── src/
│       ├── index.js       → Express server & middleware
│       ├── routes/        → /api/analyze, /api/my-analyses, /api/admin, /api/stats, /api/email, /api/model
│       └── services/      → Supabase client querying public.vw_analysis_details & Email notifications
├── ai-service/             → Python FastAPI + YOLO Inference (Port 8000) [See ai-service/README.md]
│   ├── main.py            → FastAPI application & /detect endpoint
│   ├── models/            → YOLO model weights directory (yolov11m, yolov26s, best.pt)
│   └── requirements.txt   → PyTorch, Ultralytics, FastAPI dependencies
├── dataset/                → YOLO dataset sourcing & merging notes [See dataset/README.md]
└── docs/                   → System roadmap & architecture reference [See docs/README.md]
```

---

## Team Roles & Tech Stack

| Member | Role | Key Technologies |
|---|---|---|
| **Member 1** | Data & Research Lead | Roboflow, OpenCV, LabelImg, Dataset Annotation & Merging |
| **Member 2** | AI/ML Engineer | PyTorch, YOLOv11m (Ultralytics), FastAPI, Python |
| **Member 3** | Full Stack Engineer | React 18, Vite, Node.js, Express, Supabase (Auth, Postgres, Storage), Recharts, jsPDF |

---

## Getting Started

### 1. AI Service (Python + FastAPI)
```bash
cd ai-service
python -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Backend API (Node.js + Express)
```bash
cd backend
npm install
cp .env.example .env        # Configure SUPABASE_URL, SUPABASE_SECRET_KEY, AI_SERVICE_URL
npm run dev                 # Runs on http://localhost:4000
```

### 3. Frontend Application (React + Vite)
```bash
cd frontend
npm install
npm run dev                 # Runs on http://localhost:5173
```

---

## Testing & Verification

### Backend Test Coverage (Jest)
- **Statements**: **91.2%**
- **Functions**: **97.8%**
- **Lines**: **92.4%**
- **Passing**: **80 / 80 tests** across 11 test suites (100% pass rate)
```bash
cd backend
npm test
```

### Frontend Test Coverage (Vitest + Testing Library)
- **Statements**: **74.5%**
- **Context Services**: **96.2%**
- **Passing**: **161 / 161 tests** across 23 test suites (100% pass rate)
```bash
cd frontend
npm test -- --run
```

---

## License
Developed for educational and environmental monitoring research.
