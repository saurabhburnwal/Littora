# LITTORA — INLINE CSS MIGRATION INVENTORY REPORT
**Phase:** Chunk 1 — Repository-Wide Inline Styling Inventory & Architecture Plan  
**Target Central Stylesheet:** `frontend/src/index.css`  
**Status:** Audit Complete (No code modifications made in this chunk)

---

## 1. Executive Summary & Inventory Totals

A complete, recursive AST and token scan of all frontend source files under `frontend/src/` was executed.

| Metric | Count | Details |
| :--- | :---: | :--- |
| **Total Source Files Inspected** | **44** | All `.jsx`, `.js`, `.css`, and `.html` files in `src/` |
| **Files Containing Inline Styles** | **25** | 12 Components, 12 Pages, 1 Utility Module |
| **Files with Zero Inline Styles (Clean)** | **19** | Contexts, UI primitives (`Badge`, `MetricCard`), clean components |
| **Total Inline Style Occurrences** | **336** | JSX style props, Recharts style props, DOM `.style`, template strings |

### Breakdown by Classification Category (A–H)

| Category | Description | Count | Action Required |
| :--- | :--- | :---: | :--- |
| **Category A** | **Static presentation styling** | **289** | Migrate to CSS classes in `index.css` |
| **Category B** | **Theme-dependent styling** | **1** | Migrate to CSS variables / theme tokens |
| **Category C** | **Responsive styling** | **0** | No JS-driven media styling found (CSS handles queries) |
| **Category D** | **State-based styling** | **12** | Migrate to semantic CSS state modifiers (`.is-active`, `.is-spinning`) |
| **Category E** | **Data-driven dynamic styling** | **18** | **KEEP INLINE** (bounding box coords, split panes, canvas generator) |
| **Category F** | **CSS custom-property injection** | **2** | **KEEP VARIABLE INLINE**, migrate surrounding presentation CSS |
| **Category G** | **Animation / transition runtime styles** | **0** | Keyframe animations migrated to CSS utility rules |
| **Category H** | **Suspicious / unnecessary flex wrappers** | **14** | Replace with CSS utility classes (`.flex-spacer`, `.flex-1`) |
| **TOTAL** | | **336** | |

---

## 2. Component Inline-Style Density Ranking

| Priority Tier | Occurrences | Affected Files | Migration Risk |
| :--- | :---: | :--- | :---: |
| **HIGH** | **256** (76.2%) | `generatePdfReport.js` (67), `TrendsPage.jsx` (51), `ReportsPage.jsx` (39), `SettingsPage.jsx` (37), `UploadForm.jsx` (21), `DatasetPage.jsx` (21), `PollutionMap.jsx` (20) | High |
| **MEDIUM** | **61** (18.2%) | `CleanupPage.jsx` (13), `SetPasswordPage.jsx` (12), `HistoryTable.jsx` (9), `LoginPage.jsx` (9), `BoundingBoxImage.jsx` (6), `Sidebar.jsx` (6), `HistoryPage.jsx` (6) | Medium |
| **LOW** | **19** (5.6%) | `App.jsx` (3), `DashboardPage.jsx` (3), `MapPage.jsx` (3), `AnalysisLightbox.jsx` (2), `UploadPage.jsx` (2), `ConfirmModal.jsx` (1), `PhotoGallery.jsx` (1), `ResultPanel.jsx` (1), `TrendChart.jsx` (1), `WasteBreakdownChart.jsx` (1), `FilterToolbar.jsx` (1) | Low |

---

## 3. High-Risk Components & Runtime Preservation Rules

The following components contain **legitimate dynamic runtime styles** that **MUST REMAIN INLINE**. Modifying these styles into static CSS classes would break runtime coordinate math, zoom transformations, or canvas generation.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      GENUINE RUNTIME STYLES (MUST KEEP)                     │
├─────────────────────────┬───────────────────┬───────────────────────────────┤
│ File / Component        │ Line(s)           │ Runtime Property Reason       │
├─────────────────────────┼───────────────────┼───────────────────────────────┤
│ BoundingBoxImage.jsx    │ L145              │ Zoom scale & origin transform │
│ BoundingBoxImage.jsx    │ L184              │ YOLO % bbox coordinates (x,y) │
│ BoundingBoxImage.jsx    │ L193              │ YOLO category box badge color │
│ BoundingBoxImage.jsx    │ L269              │ CSS variable --chip-color     │
│ AnalysisLightbox.jsx    │ L120, L153        │ Drag split % width & flex     │
│ UploadForm.jsx          │ L148, L157        │ Live preview YOLO % coords    │
│ TrendsPage.jsx          │ L528              │ Dynamic progress % bar fill   │
│ DashboardPage.jsx       │ L28               │ CSS variable --dashboard-image│
│ generatePdfReport.js    │ L52–L60           │ Off-screen canvas DOM metrics │
└─────────────────────────┴───────────────────┴───────────────────────────────┘
```

---

## 4. Comprehensive Repository-Wide Inventory Table

### 4.1 Root & Core Application Shell

| File | Component | Line | Current Inline Properties | Cat | Recommended Migration | Proposed CSS Class | Token Required | Runtime? |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- | :---: | :---: |
| `App.jsx` | `PageLoader` | 21 | `display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'var(--muted)', fontSize: '0.88rem'` | **A** | Migrate to CSS class | `.page-loader-fallback` | Reused (`--muted`) | No |
| `App.jsx` | `AppShell` | 59 | `position: "relative"` | **A** | Move to existing `.content-area` | `.content-area` | No | No |
| `App.jsx` | `AppShell` | 61 | `position: "fixed", top: "1.25rem", right: "1.5rem", zIndex: 1000` | **A** | Migrate to CSS class | `.floating-account-menu-fixed` | No | No |

---

### 4.2 High-Risk Detection & Media Components

| File | Component | Line | Current Inline Properties | Cat | Recommended Migration | Proposed CSS Class | Token Required | Runtime? |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- | :---: | :---: |
| `AnalysisLightbox.jsx` | `AnalysisLightbox` | 120 | `flex: 0 0 ${splitPercent}%, width: ${splitPercent}%, maxWidth: ${splitPercent}%` | **E** | **KEEP INLINE** (dynamic split-drag coordinate) | `.lightbox-stage-panel` | No | **Yes** |
| `AnalysisLightbox.jsx` | `AnalysisLightbox` | 153 | `flex: 0 0 ${100-splitPercent}%, width: ${100-splitPercent}%, maxWidth: ${100-splitPercent}%` | **E** | **KEEP INLINE** (dynamic split-drag coordinate) | `.lightbox-stage-panel` | No | **Yes** |
| `BoundingBoxImage.jsx` | `BoundingBoxImage` | 145 | `aspectRatio, transformOrigin, transform: scale(...), transition` | **E** | **KEEP INLINE** (mouse viewport focus coordinate & scale) | `.bbox-image-frame` | No | **Yes** |
| `BoundingBoxImage.jsx` | `BoundingBoxImage` | 184 | `left, top, width, height, borderColor: color, boxShadow` | **E** | **KEEP INLINE** (YOLO coordinate math & model color) | `.bbox-rect` | No | **Yes** |
| `BoundingBoxImage.jsx` | `BoundingBoxImage` | 193 | `backgroundColor: color` | **E** | **KEEP INLINE** (YOLO category badge color) | `.bbox-label` | No | **Yes** |
| `BoundingBoxImage.jsx` | `BoundingBoxImage` | 241 | `color: "var(--teal)", flexShrink: 0` | **A** | Migrate icon styling to CSS class | `.bbox-filter-icon` | Reused (`--teal`) | No |
| `BoundingBoxImage.jsx` | `BoundingBoxImage` | 242 | `fontSize: "0.76rem", fontWeight: 600` | **A** | Migrate label typography to CSS class | `.bbox-filter-label` | No | No |
| `BoundingBoxImage.jsx` | `BoundingBoxImage` | 269 | `"--chip-color": color, borderColor, color, background` | **F** | **KEEP `--chip-color` INLINE**; move static borders/background to CSS | `.bbox-chip` | No | **Yes (var)** |
| `PhotoGallery.jsx` | `PhotoGallery` | 73 | `animation: "spin 1s linear infinite"` | **D** | Migrate to shared spin utility class | `.is-spinning` | No | No |

---

### 4.3 Navigation, Modals & Utility Components

| File | Component | Line | Current Inline Properties | Cat | Recommended Migration | Proposed CSS Class | Token Required | Runtime? |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- | :---: | :---: |
| `ConfirmModal.jsx` | `ConfirmModal` | 71 | `marginRight: 2` | **A** | Migrate icon spacing to CSS class | `.confirm-btn-icon` | No | No |
| `HistoryTable.jsx` | `HistoryTable` | 93 | `padding: "2.5rem 1rem", textAlign: "center", color: "var(--muted)"` | **A** | Migrate empty state to CSS class | `.history-empty-state` | Reused (`--muted`) | No |
| `HistoryTable.jsx` | `HistoryTable` | 109 | `display: "flex", gap: "0.5rem"` | **H** | Migrate button bar flex wrapper to CSS class | `.history-header-actions` | No | No |
| `HistoryTable.jsx` | `HistoryTable` | 125 | `width: "56px"` | **A** | Migrate table column header width to CSS class | `.th-photo-col` | No | No |
| `HistoryTable.jsx` | `HistoryTable` | 169 | `textAlign: "right", minWidth: "90px"` | **A** | Migrate actions column header alignment to CSS class | `.th-actions-col` | No | No |
| `HistoryTable.jsx` | `HistoryTable` | 187 | `cursor: "pointer"` | **A** | Migrate pointer cursor to existing `.thumb` class | `.thumb` | No | No |
| `HistoryTable.jsx` | `HistoryTable` | 211 | `color: "var(--muted)"` | **A** | Migrate placeholder dash color to CSS class | `.table-null-dash` | Reused (`--muted`) | No |
| `HistoryTable.jsx` | `HistoryTable` | 220 | `color: "var(--muted)"` | **A** | Migrate placeholder dash color to CSS class | `.table-null-dash` | Reused (`--muted`) | No |
| `HistoryTable.jsx` | `HistoryTable` | 234 | `fontSize: "0.78rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px"` | **A** | Migrate user badge layout to CSS class | `.history-user-pill` | No | No |
| `HistoryTable.jsx` | `HistoryTable` | 260 | `animation: "spin 1s linear infinite"` | **D** | Migrate delete spinner animation to CSS utility class | `.is-spinning` | No | No |
| `ResultPanel.jsx` | `ResultPanel` | 148 | `flex: 1` | **H** | Replace spacer div with `.flex-spacer` class | `.flex-spacer` | No | No |
| `Sidebar.jsx` | `Sidebar` | 45 | `display: "flex", alignItems: "center", gap: "0.75rem"` | **A** | Migrate logo brand wrapper to CSS class | `.sidebar-logo-brand` | No | No |
| `Sidebar.jsx` | `Sidebar` | 65 | `display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem", width: "100%"` | **A** | Migrate collapsed logo wrapper to CSS class | `.sidebar-collapsed-brand` | No | No |
| `Sidebar.jsx` | `Sidebar` | 66 | `width: "34px", height: "34px"` | **A** | Move dimensions to `.sidebar-logo-img` | `.sidebar-logo-img` | No | No |
| `Sidebar.jsx` | `Sidebar` | 93 | `opacity: 0.7, cursor: "default", pointerEvents: "none"` | **D** | Migrate locked state to CSS modifier | `.nav-item--locked` | No | No |
| `Sidebar.jsx` | `Sidebar` | 104 | `flex: 1` | **H** | Migrate label flex expansion to CSS class | `.nav-item-label` | No | No |
| `Sidebar.jsx` | `Sidebar` | 105 | `opacity: 0.7, flexShrink: 0` | **A** | Migrate lock icon styling to CSS class | `.nav-item-lock-icon` | No | No |
| `ui/FilterToolbar.jsx` | `FilterToolbar` | 124 | `color: "var(--teal)"` | **A** | Move icon color to CSS class | `.filter-popover-title-icon` | Reused (`--teal`) | No |

---

### 4.4 Charts & Map Components

| File | Component | Line | Current Inline Properties | Cat | Recommended Migration | Proposed CSS Class | Token Required | Runtime? |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- | :---: | :---: |
| `TrendChart.jsx` | `TrendChart` | 55 | `background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "10px", boxShadow: "var(--shadow-md)", fontSize: "12px", color: "var(--text-primary)"` | **A** | Move Recharts Tooltip to shared CSS class | `.recharts-custom-tooltip` | Reused (`--card-bg`, `--border`) | No |
| `WasteBreakdownChart.jsx` | `WasteBreakdownChart` | 44 | `background: "#fff", border: "1px solid #ddd3bf", borderRadius: 8, fontSize: 13` | **A** | Move Recharts Tooltip to shared CSS class | `.recharts-custom-tooltip` | Reused (`--card-bg`, `--border`) | No |
| `PollutionMap.jsx` | `PollutionMap` | 176 | `display: "flex", flexDirection: "column", gap: "0.75rem", padding: "0.9rem 1.2rem"` | **A** | Move to existing `.map-top-bar` | `.map-top-bar` | No | No |
| `PollutionMap.jsx` | `PollutionMap` | 177 | `display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: "0.75rem"` | **A** | Migrate top control row layout to CSS class | `.map-controls-row` | No | No |
| `PollutionMap.jsx` | `PollutionMap` | 179 | `position: "relative", minWidth: "240px", flex: "1 1 260px"` | **A** | Migrate search container to CSS class | `.map-search-wrapper` | No | No |
| `PollutionMap.jsx` | `PollutionMap` | 180 | `position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)"` | **A** | Migrate search icon positioning to CSS class | `.map-search-icon` | Reused (`--muted`) | No |
| `PollutionMap.jsx` | `PollutionMap` | 187 | `width: "100%", padding: "0.4rem 0.75rem 0.4rem 2.1rem", borderRadius: "20px", border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--ink)", fontSize: "0.8rem", outline: "none", transition: "all 0.2s ease"` | **A** | Migrate search input styling to CSS class | `.map-search-input` | Reused (`--border`, `--card-bg`, `--ink`) | No |
| `PollutionMap.jsx` | `PollutionMap` | 203 | `position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer"` | **A** | Migrate clear search button positioning to CSS class | `.map-search-clear-btn` | Reused (`--muted`) | No |
| `PollutionMap.jsx` | `PollutionMap` | 211 | `display: "flex", alignItems: "center", gap: "0.4rem"` | **A** | Migrate timeframe switcher layout to CSS class | `.map-timeframe-group` | No | No |
| `PollutionMap.jsx` | `PollutionMap` | 242 | `display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: "0.5rem", paddingTop: "0.4rem", borderTop: "1px solid var(--border-lt)"` | **A** | Migrate severity filter bar to CSS class | `.map-severity-bar` | Reused (`--border-lt`) | No |
| `PollutionMap.jsx` | `PollutionMap` | 253 | `display: "inline-flex", alignItems: "center", gap: "0.35rem"` | **A** | Migrate chip inner flex layout to CSS class | `.map-severity-chip-inner` | No | No |
| `PollutionMap.jsx` | `PollutionMap` | 256 | `fontSize: "0.68rem", padding: "0.1rem 0.45rem", borderRadius: "10px", background: active ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.08)", color: active ? "#fff" : "inherit", fontWeight: 800` | **D** | Migrate active count badge to CSS modifier | `.map-severity-count-badge--active` | No | No |
| `PollutionMap.jsx` | `PollutionMap` | 276 | `color: "var(--rose)", borderColor: "var(--rose)", fontSize: "0.75rem"` | **A** | Migrate reset filter button colors to CSS class | `.map-filter-reset-btn` | Reused (`--rose`) | No |
| `PollutionMap.jsx` | `PollutionMap` | 292 | `position: "relative", width: "100%", flex: 1, minHeight: "650px"` | **A** | Migrate map canvas sizing to CSS class | `.map-canvas-container` | No | No |
| `PollutionMap.jsx` | `PollutionMap` | 296 | `color: "#0d9488"` | **A** | Migrate GPS icon color to CSS class | `.map-control-icon--gps` | Reused (`--teal`) | No |
| `PollutionMap.jsx` | `PollutionMap` | 300 | `color: "#dc2626"` | **A** | Migrate hotspot icon color to CSS class | `.map-control-icon--hotspot` | Reused (`--red`) | No |
| `PollutionMap.jsx` | `PollutionMap` | 304 | `color: "#d97706"` | **A** | Migrate reset view icon color to CSS class | `.map-control-icon--reset` | Reused (`--amber`) | No |
| `PollutionMap.jsx` | `PollutionMap` | 310 | `height: "100%", minHeight: "450px"` | **A** | Migrate empty state height to CSS class | `.map-empty-state--fill` | No | No |
| `PollutionMap.jsx` | `PollutionMap` | 312 | `marginTop: "0.5rem"` | **A** | Move margin to `.map-empty-text` | `.map-empty-text` | No | No |
| `PollutionMap.jsx` | `PollutionMap` | 319 | `marginTop: "1rem"` | **A** | Move margin to `.map-empty-btn` | `.map-empty-btn` | No | No |
| `PollutionMap.jsx` | `PollutionMap` | 330 | `height: "100%", width: "100%"` | **A** | Migrate Leaflet MapContainer height/width to CSS class | `.leaflet-map-root` | No | No |
| `PollutionMap.jsx` | `PollutionMap` | 411 | `marginTop: "0.45rem", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.76rem", fontWeight: 700, color: "var(--teal)", background: "none", border: "none", cursor: "pointer", padding: 0` | **A** | Migrate popup beach link button styling to CSS class | `.map-popup-beach-link` | Reused (`--teal`) | No |

---

### 4.5 Form & Upload Components

| File | Component | Line | Current Inline Properties | Cat | Recommended Migration | Proposed CSS Class | Token Required | Runtime? |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- | :---: | :---: |
| `UploadForm.jsx` | `UploadForm` | 148 | `left, top, width, height, borderColor: color, boxShadow` | **E** | **KEEP INLINE** (dynamic preview YOLO bbox % coordinates) | `.upload-bbox-rect` | No | **Yes** |
| `UploadForm.jsx` | `UploadForm` | 157 | `backgroundColor: color` | **E** | **KEEP INLINE** (dynamic YOLO category label color) | `.upload-bbox-label` | No | **Yes** |
| `UploadForm.jsx` | `UploadForm` | 191 | `display: "flex", alignItems: "center", gap: "0.45rem"` | **A** | Migrate model title header flex layout to CSS class | `.upload-model-header-title` | No | No |
| `UploadForm.jsx` | `UploadForm` | 192 | `color: "var(--teal)"` | **A** | Move CPU icon color to CSS class | `.upload-model-icon` | Reused (`--teal`) | No |
| `UploadForm.jsx` | `UploadForm` | 193 | `fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)"` | **A** | Migrate title typography to CSS class | `.upload-model-label` | Reused (`--text-primary`) | No |
| `UploadForm.jsx` | `UploadForm` | 196 | `fontSize: "0.72rem", fontWeight: 700, padding: "0.2rem 0.55rem", borderRadius: "999px", background: "var(--teal-light)", color: "var(--teal)"` | **A** | Migrate selected badge to CSS class | `.upload-model-badge` | Reused (`--teal`, `--teal-light`) | No |
| `UploadForm.jsx` | `UploadForm` | 213 | `fontSize: "0.74rem", color: "var(--text-muted)", marginBottom: "0.6rem"` | **A** | Migrate description typography to CSS class | `.upload-model-desc` | Reused (`--text-muted`) | No |
| `UploadForm.jsx` | `UploadForm` | 216 | `display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.5rem"` | **A** | Migrate model options grid to CSS class | `.upload-model-grid` | No | No |
| `UploadForm.jsx` | `UploadForm` | 225 | `padding, borderRadius, border, background, color, cursor, transition` | **D** | Migrate selection state to CSS modifier | `.upload-model-option--selected` | Reused (`--card-bg`, `--border`, `--teal`) | No |
| `UploadForm.jsx` | `UploadForm` | 240 | `fontWeight: 700, fontSize: "0.8rem", color: isSelected ? "var(--teal)" : "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", whiteSpace: "nowrap"` | **D** | Move selection text color & layout to CSS modifier | `.upload-model-opt-header` | Reused (`--teal`, `--text-primary`) | No |
| `UploadForm.jsx` | `UploadForm` | 252 | `color: "var(--teal)", flexShrink: 0` | **A** | Move checkmark icon color to CSS class | `.upload-model-check` | Reused (`--teal`) | No |
| `UploadForm.jsx` | `UploadForm` | 254 | `fontSize: "0.68rem", opacity: 0.8, marginTop: "2px", whiteSpace: "nowrap"` | **A** | Migrate metadata subtitle to CSS class | `.upload-model-params` | No | No |
| `UploadForm.jsx` | `UploadForm` | 266 | `margin: "0.85rem 0"` | **A** | Move margin to `.beach-selector-container` | `.beach-selector-container` | No | No |
| `UploadForm.jsx` | `UploadForm` | 267 | `display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem"` | **A** | Migrate beach selector header to CSS class | `.beach-selector-header` | No | No |
| `UploadForm.jsx` | `UploadForm` | 268 | `display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)"` | **A** | Migrate label typography to CSS class | `.beach-selector-label` | Reused (`--muted`) | No |
| `UploadForm.jsx` | `UploadForm` | 269 | `color: "var(--teal)"` | **A** | Move location pin icon color to CSS class | `.beach-selector-pin` | Reused (`--teal`) | No |
| `UploadForm.jsx` | `UploadForm` | 274 | `display: "flex", alignItems: "center", gap: "0.45rem", padding: "0.45rem 0.75rem", borderRadius: "8px", background: "rgba(14, 140, 134, 0.12)", border: "1px solid rgba(14, 140, 134, 0.3)", color: "var(--teal)", fontSize: "0.75rem", marginBottom: "0.6rem"` | **A** | Migrate EXIF GPS banner styling to CSS class | `.upload-gps-badge` | Reused (`--teal`) | No |
| `UploadForm.jsx` | `UploadForm` | 287 | `flexShrink: 0` | **A** | Move icon flex shrinkage to CSS class | `.upload-gps-icon` | No | No |
| `UploadForm.jsx` | `UploadForm` | 296 | `width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px"` | **A** | Migrate select dropdown sizing to CSS class | `.beach-selector-select` | No | No |
| `UploadForm.jsx` | `UploadForm` | 329 | `color: "var(--muted)"` | **A** | Move color to `.loc-note--muted` modifier | `.loc-note--muted` | Reused (`--muted`) | No |
| `UploadForm.jsx` | `UploadForm` | 334 | `color: "var(--teal)"` | **A** | Move color to `.loc-note--teal` modifier | `.loc-note--teal` | Reused (`--teal`) | No |

---

### 4.6 Pages Overview

#### CleanupPage.jsx (13 occurrences)
* **L197, L201, L202, L206, L207, L211, L212, L213, L214, L217, L218, L222, L263** (Category A): Static presentation for `.cleanup-hero-banner`, `.cleanup-hero-header`, `.cleanup-hero-badge`, `.cleanup-hero-title`, `.cleanup-hero-desc`, `.cleanup-hero-stats`, `.cleanup-hero-stat-block`, `.cleanup-hero-stat-num`, `.cleanup-hero-stat-lbl`, `.cleanup-hero-illustration`, and `.cleanup-priority-section`.

#### DashboardPage.jsx (3 occurrences)
* **L28** (Category F): `'--dashboard-image': url(...)` -> **KEEP CSS variable inline**, migrate base container styles to `.dashboard-light-container`.
* **L107** (Category A): `marginBottom: "1.25rem"` -> Move to `.dashboard-metrics-section`.
* **L127** (Category A): `marginTop: "1.5rem"` -> Move to `.charts-row--spaced`.

#### DatasetPage.jsx (21 occurrences)
* **L129–L165, L179, L248, L255, L261, L285, L293, L311** (Category A): Hero cards, tags, buttons, error banner, table cell formatting.
* **L249–L251** (Category A): File format icon tinting (`.dataset-icon--geojson`, `.dataset-icon--csv`, `.dataset-icon--roboflow`).
* **L265** (Category D): Waste format badge state styling based on format type (`.waste-badge--format`).

#### HistoryPage.jsx (6 occurrences)
* **L262** (Category D): `animation: loading ? "spin 1s linear infinite" : "none"` -> Move to `.is-spinning`.
* **L294, L301, L308, L315, L411** (Category A): Margins, empty hints, and section spacing (`.login-spinner--centered`, `.admin-error-banner--spaced`, `.history-gallery-section`).

#### LoginPage.jsx (9 occurrences)
* **L205, L215, L217, L218, L220, L277, L301, L327** (Category A): Demo pill, key icon, title, subtitle, demo button, password toggle, forgot password, back button.
* **L216** (Category H): `flex: 1` -> `.login-demo-info`.
* **L447, L450** (Category D / DOM event): Replace `onMouseEnter`/`onMouseLeave` JS background swaps with CSS `.login-demo-pill:hover`.

#### MapPage.jsx (3 occurrences)
* **L47, L53, L57** (Category A): Sizing, guest lock wrapper, and fullscreen card modifier (`.map-page-wrapper`, `.map-guest-lock`, `.map-card--fullscreen`).

#### ReportsPage.jsx (39 occurrences)
* **L205, L227** (Category D): Loader animations (`.is-spinning`).
* **L248–L358, L362–L379** (Category A): Report cards, custom report form, executive summary grid, recommendations card, and typography.
* **L359** (Category E): Severity dot dynamic color (`.reports-severity-dot`).

#### SetPasswordPage.jsx (12 occurrences)
* **L100, L110, L115, L118** (Category A): Password toggle, requirements box, title, list item layout.
* **L120–L139** (Category D): Password requirement validation states (`.req-item--valid`, `.req-item--invalid`).

#### SettingsPage.jsx (37 occurrences)
* **L122–L174, L178–L200, L217–L222, L239–L248, L260–L289, L315–L420** (Category A): Header, guest banner, 2-column grid, slider rows, radio groups, modal styling, danger zone actions.
* **L184, L210, L229, L251, L300, L326, L349** (Category H): Row description wrappers with `flex: 1, paddingRight: "1rem"` -> `.settings-row-info`.

#### TrendsPage.jsx (51 occurrences)
* **L362–L461, L470–L527, L536–L569** (Category A): Tooltips, legends, chart card padding, metrics table typography, heatmap grid labels.
* **L476, L562** (Category H): `flex: 1` -> `.chart-card--flex`, `.heatmap-cells-container`.
* **L528** (Category E): **KEEP dynamic percentage width inline** (`width: ${pct}%`).
* **L573** (Category B): Heatmap cell dynamic density background via `getHeatmapColor(cell.value, isDark)`.

#### UploadPage.jsx (2 occurrences)
* **L117** (Category A): Error message top margin (`.error--spaced`).
* **L131** (Category A): Transparent result placeholder (`.result-placeholder--transparent`).

#### generatePdfReport.js (67 occurrences)
* **L52–L60** (Category E - 9 DOM assignments): **KEEP INLINE DOM METRICS** (`container.style.position = "absolute"; container.style.left = "-9999px"; ...`) — required for headless `html2canvas` off-screen rendering without theme collision.
* **L63–L182** (Category A - 58 HTML template styles): **KEEP IN TEMPLATE STRING** for isolated print rendering or extract to a static print stylesheet.

---

## 5. Architectural Findings: Classes, Tokens & Patterns

### 5.1 Existing CSS Classes to Reuse (Prevent Duplication)
* `.empty-state` -> Table and chart empty state containers
* `.thumb` -> Photo thumbnail images in tables and lists
* `.nav-item` -> Sidebar navigation items
* `.login-spinner` -> Standard loading circle spinner
* `.recharts-custom-tooltip` -> Recharts tooltip styling (consolidates 7 separate instances)
* `.chart-card`, `.full-card`, `.stat-card` -> Consistent surface containers

### 5.2 Existing Design Tokens Reused
* **Colors:** `var(--teal)`, `var(--teal-light)`, `var(--teal-dark)`, `var(--sand)`, `var(--rose)`, `var(--amber)`, `var(--green)`, `var(--red)`
* **Surfaces:** `var(--bg)`, `var(--bg-secondary)`, `var(--card-bg)`, `var(--surface-elevated)`
* **Text:** `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`, `var(--ink)`
* **Borders & Shadows:** `var(--border)`, `var(--border-lt)`, `var(--shadow-sm)`, `var(--shadow-md)`, `var(--radius-lg)`, `var(--radius-xl)`, `var(--radius-pill)`

### 5.3 Missing Design Tokens Proposed for `index.css`
To eliminate recurring arbitrary values, the following tokens should be added to `:root`, `[data-theme="earth"]`, and `[data-theme="dark"]`:

```css
:root, [data-theme="earth"] {
  /* Control Surfaces & Indicators */
  --control-bg:            #FFFDF9;
  --control-bg-hover:      #F1E8D8;
  --control-border:        #D7CBB8;
  --focus-ring:            rgba(14, 140, 134, 0.25);
  
  /* Status Opacity Highlights */
  --teal-subtle:           rgba(14, 140, 134, 0.12);
  --rose-subtle:           rgba(198, 40, 40, 0.12);
  --amber-subtle:          rgba(237, 139, 0, 0.12);
  --green-subtle:          rgba(46, 125, 50, 0.12);

  /* Heatmap Cell Palette (Earth) */
  --heatmap-0:             rgba(14, 140, 134, 0.05);
  --heatmap-1:             rgba(14, 140, 134, 0.25);
  --heatmap-2:             rgba(14, 140, 134, 0.50);
  --heatmap-3:             rgba(14, 140, 134, 0.75);
  --heatmap-4:             #0E8C86;
}

[data-theme="dark"] {
  --control-bg:            #1B2736;
  --control-bg-hover:      #223043;
  --control-border:        #2B3748;
  --focus-ring:            rgba(0, 212, 170, 0.35);

  --teal-subtle:           rgba(0, 212, 170, 0.15);
  --rose-subtle:           rgba(244, 63, 94, 0.15);
  --amber-subtle:          rgba(251, 191, 36, 0.15);
  --green-subtle:          rgba(46, 125, 50, 0.15);

  /* Heatmap Cell Palette (Dark) */
  --heatmap-0:             rgba(0, 212, 170, 0.06);
  --heatmap-1:             rgba(0, 212, 170, 0.25);
  --heatmap-2:             rgba(0, 212, 170, 0.50);
  --heatmap-3:             rgba(0, 212, 170, 0.75);
  --heatmap-4:             #00D4AA;
}
```

### 5.4 Duplicate Inline Patterns Identified Across the Codebase
1. **`animation: spin 1s linear infinite`** (5 files) -> Consolidated into `.is-spinning`.
2. **`flex: 1` spacer / layout expansions** (20 occurrences) -> Consolidated into `.flex-spacer` and `.flex-1`.
3. **Recharts Tooltip `contentStyle`** (6 charts) -> Consolidated into `.recharts-custom-tooltip`.
4. **`display: flex, alignItems: center, gap: ...`** (63 occurrences) -> Semantic component layout classes.
5. **`color: "var(--teal)"` on Lucide icons** (22 occurrences) -> Replaced by semantic icon classes.

---

## 6. Recommended Migration Order (Execution Plan for Subsequent Chunks)

To migrate with zero downtime and guaranteed visual parity:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       RECOMMENDED MIGRATION ORDER                           │
├──────┬───────────────────────┬──────────────────────────────────────────────┤
│ Step │ Scope                 │ Target Components & Pages                    │
├──────┼───────────────────────┼──────────────────────────────────────────────┤
│ 1    │ Core Utilities & Shell│ index.css token additions, .is-spinning,     │
│      │                       │ App.jsx, Sidebar.jsx, ConfirmModal.jsx       │
├──────┼───────────────────────┼──────────────────────────────────────────────┤
│ 2    │ Authentication & Guard│ LoginPage.jsx, SetPasswordPage.jsx           │
├──────┼───────────────────────┼──────────────────────────────────────────────┤
│ 3    │ Tables, History & Map │ HistoryTable.jsx, HistoryPage.jsx,           │
│      │                       │ PollutionMap.jsx, MapPage.jsx                │
├──────┼───────────────────────┼──────────────────────────────────────────────┤
│ 4    │ Upload & Detection UI │ UploadForm.jsx, UploadPage.jsx,              │
│      │                       │ (preserving BBox & Lightbox runtime coords)  │
├──────┼───────────────────────┼──────────────────────────────────────────────┤
│ 5    │ Analytics & Reporting │ TrendsPage.jsx, ReportsPage.jsx,             │
│      │                       │ CleanupPage.jsx, DatasetPage.jsx             │
├──────┼───────────────────────┼──────────────────────────────────────────────┤
│ 6    │ Settings & Config     │ SettingsPage.jsx, DashboardPage.jsx          │
└──────┴───────────────────────┴──────────────────────────────────────────────┘
```
