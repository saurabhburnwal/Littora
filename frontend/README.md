# Littora Frontend — React 18 + Vite Web Application

The frontend of **Littora** is a responsive, feature-rich Single Page Application (SPA) built with **React 18**, **Vite**, and **pure CSS custom design tokens** with full dark-mode and theme customization.

---

## Key Features

- **Dual Theme Engine**:
  - **Earth Theme**: Warm sand tones (`#f7f2e8`), watercolor botanical artwork accents.
  - **Dark Theme**: High-contrast dark mode (`#0a0f1e` deep navy, `#00d4aa` glowing cyan).
- **Progressive Disclosure Detection History (`/history`)**:
  - **Full-Bleed Image Tile Gallery**: Clean 3-column media-first photography archive with subtle scrim gradients, top-left severity badges, top-right delete action, and bottom metadata captions (`Location`, `Date · X waste items`).
  - **Single-Row Simplified Toolbar**: `[ Search detections... ] [ Filters ]` with compact multi-criteria popover filter panel (Severity score tiers `0–10`, `11–30`, `31–60`, `>60`, Waste Types, Date ranges, Beach Locations) and active filter chips with `Clear all`.
  - **Refined KPI Summary Cards**: 4 clean summary metrics (`Detection Sessions`, `Waste Items`, `Avg. Severity Score` with tier indicator, `Unique Contributors`) with generous whitespace.
  - **Two-Pane Detection Details Lightbox (`AnalysisLightbox`)**: Full-size uncropped annotated image with YOLO bounding boxes on the left, and concise metadata (Location, Date, Severity Score, Action Status, Detected Waste list with confidence %, primary `View on Map` button and secondary `···` menu for `Download Photo` & `Export JSON`) on the right.
  - **Structured Analysis Records Table**: Sortable tabular view with `Photo` thumbnail preview, `Date`, `Location`, `Top Waste Type`, `Confidence`, `Score`, `Severity`, `User` (for admin view), `Actions`, and `Export CSV`.
- **Auth & Guest Access Control**:
  - Integrated with **Supabase Auth** via `<AuthProvider>`.
  - Implements **Standard Supabase Sliding Sessions** (seamless background token rotation without artificial hard cutoffs).
  - **Guest Visitor Access**: Enables full preview browsing of stats, maps, and datasets; locks interactive actions behind an `AuthRequiredModal`.
- **Floating Account Menu & Collapsable Navigation**:
  - **Floating Account Menu**: Top-right glassmorphic popover displaying user avatar, role status (*Administrator, Account Member, Preview Guest*), quick links (`/settings`, `/history`, `/analytics`), and modal logout confirmation.
  - **Collapsable Sidebar**: Smooth grid layout transition (`250px` expanded vs `72px` collapsed) with persistent preference state.
- **User-Scoped Settings Engine**:
  - **LocalStorage Key Isolation**: Formats storage keys as `littora_*_user_<id>` for signed-in users and `littora_*_guest` for visitors.
  - **Language Switcher**: English, Hindi, Tamil.
  - **Date Formatters**: `DD MMM YYYY`, `MM/DD/YYYY`, `YYYY-MM-DD`.
  - **Dynamic Pagination**: `10`, `25`, `50` rows per page.
- **Interactive Reports & Secure PDF Export**:
  - Compact, publication-ready PDF Reports (`Daily`, `Weekly`, `Monthly`, `Custom`).
  - Powered by `jsPDF` + `html2canvas` with **75% JPEG compression** (~200KB file size).
  - Built-in HTML entity sanitization (`escapeHtml`) preventing Stored XSS vectors from rendered user input and telemetry labels.
- **Interactive Beach Pollution Map**:
  - Powered by Leaflet & React-Leaflet with satellite, clean light, and street map tiles, and coastal beach presets.

---

## Directory Structure

```text
frontend/
├── src/
│   ├── assets/        → Theme artwork & images (Earth & Dark navbar assets)
│   ├── components/    → UI components:
│   │   ├── FloatingAccountMenu.jsx  → Top-right glassmorphic profile trigger & popover
│   │   ├── GuestLockScreen.jsx      → Locked screen prompt for guest visitors
│   │   ├── ConfirmModal.jsx         → Reusable action confirmation modal dialog
│   │   ├── ToastNotification.jsx    → Dynamic status alert notifications
│   │   ├── Sidebar.jsx              → Collapsable navigation sidebar
│   │   ├── UploadForm.jsx           → Drag & drop file upload with beach location presets
│   │   ├── ResultPanel.jsx          → AI detection results & progressive disclosure details
│   │   ├── PhotoGallery.jsx         → Full-bleed image tile gallery
│   │   ├── HistoryTable.jsx         → Filterable table of past analyses with photo previews
│   │   ├── AnalysisLightbox.jsx     → Two-pane annotated image & metadata lightbox
│   │   ├── BoundingBoxImage.jsx     → Uncropped image frame with YOLO overlays
│   │   ├── PollutionMap.jsx         → Interactive Leaflet map with hotspot markers
│   │   ├── StatCards.jsx            → Summary KPI cards for Dashboard
│   │   ├── TrendChart.jsx           → Trend line visualization
│   │   ├── WasteBreakdownChart.jsx  → Categorical waste distribution bar chart
│   │   ├── ProtectedRoute.jsx       → Route wrapper enforcing role access
│   │   └── ui/                      → Standard UI primitives (Badge, FilterToolbar, MetricCard, SectionHeader)
│   ├── context/       → Global React contexts:
│   │   ├── AuthContext.jsx       → Supabase Auth & sliding session state
│   │   ├── ThemeContext.jsx      → Earth / Dark theme state & tokens
│   │   ├── SettingsContext.jsx   → User-scoped language, date format, & IPP settings
│   │   └── StatsContext.jsx      → Global analytics & stats caching
│   ├── pages/         → Page views:
│   │   ├── DashboardPage.jsx     → Hero banner, feature cards & analytics summary
│   │   ├── UploadPage.jsx        → AI waste detection view
│   │   ├── HistoryPage.jsx       → Detection history with progressive disclosure
│   │   ├── TrendsPage.jsx        → Seasonal trends & day/time pollution heatmaps
│   │   ├── MapPage.jsx           → Interactive beach pollution map view
│   │   ├── ReportsPage.jsx       → Report generator & PDF exporter
│   │   ├── DatasetPage.jsx       → Dataset explorer and training distribution
│   │   ├── CleanupPage.jsx       → Cleanup recommendations and priority rankings
│   │   ├── SettingsPage.jsx      → Preferences & account management
│   │   └── LoginPage.jsx         → Sign in / Sign up tabbed form
│   ├── utils/         → Helper utilities:
│   │   ├── wasteUtils.js         → Centralized waste type, severity, & detection normalizer
│   │   ├── downloadUtils.js      → CSV / JSON export and photo download helpers
│   │   └── generatePdfReport.js  → Optimized PDF report rendering engine
│   ├── index.css      → Global CSS design system, utility tokens & grid layouts
│   └── main.jsx       → React root mount point
├── package.json       → Scripts & dependencies (vitest, @vitest/coverage-v8)
└── vite.config.js     → Vite build configuration
```

---

## Development & Testing

### 1. Installation
```bash
npm install
```

### 2. Run Local Dev Server
```bash
npm run dev
```
*App runs at `http://localhost:5173`.*

### 3. Run Unit Tests & Coverage
```bash
# Run Vitest test runner
npx vitest run

# Generate coverage report
npm run test:coverage
```
- **Passing**: **299 / 299 tests** across 37 test files (100% pass rate) with ~80% line coverage


### 4. Production Build
```bash
npm run build
```
*Builds production bundle to `/dist`.*
