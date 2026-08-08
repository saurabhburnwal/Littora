# Littora Frontend — React 18 + Vite Web Application

The frontend of **Littora** is a responsive, feature-rich Single Page Application (SPA) built with **React 18**, **Vite**, and **Vanilla CSS tokens** with full dark-mode and theme customization.

---

## Key Features

- **Dual Theme Engine**:
  - **Earth Theme**: Warm sand tones (`#f7f2e8`), watercolor botanical artwork accents.
  - **Dark Theme**: High-contrast dark mode (`#0a0f1e` deep navy, `#00d4aa` glowing cyan).
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
- **Interactive Reports & PDF Export**:
  - Compact, publication-ready PDF Reports (`Daily`, `Weekly`, `Monthly`, `Custom`).
  - Powered by `jsPDF` + `html2canvas` with **75% JPEG compression** (~200KB file size).
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
│   │   ├── AuthRequiredModal.jsx    → Sign-in prompt dialog for guest visitors
│   │   ├── Sidebar.jsx              → Collapsable navigation sidebar
│   │   ├── UploadForm.jsx           → Drag & drop file upload with beach location presets
│   │   ├── ResultPanel.jsx          → AI detection results & waste breakdown charts
│   │   ├── HistoryTable.jsx         → Filterable table of past analyses
│   │   ├── PollutionMap.jsx         → Interactive Leaflet map with hotspot markers
│   │   ├── StatCards.jsx            → Metric cards for total waste & pollution score
│   │   └── ProtectedRoute.jsx       → Route wrapper enforcing role access
│   ├── context/       → Global React contexts:
│   │   ├── AuthContext.jsx       → Supabase Auth & sliding session state
│   │   ├── ThemeContext.jsx      → Earth / Dark theme state & tokens
│   │   ├── SettingsContext.jsx   → User-scoped language, date format, & IPP settings
│   │   └── StatsContext.jsx      → Global analytics & stats caching
│   ├── pages/         → Page views:
│   │   ├── DashboardPage.jsx     → Hero banner, feature cards & analytics summary
│   │   ├── UploadPage.jsx        → AI waste detection view
│   │   ├── HistoryPage.jsx       → User-scoped past detection history
│   │   ├── TrendsPage.jsx        → Seasonal trends & day/time pollution heatmaps
│   │   ├── MapPage.jsx           → Interactive beach pollution map view
│   │   ├── ReportsPage.jsx       → Report generator & PDF exporter
│   │   ├── SettingsPage.jsx      → Preferences & account management
│   │   └── LoginPage.jsx         → Sign in / Sign up tabbed form
│   ├── utils/         → Helper utilities:
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
npm test

# Generate coverage report
npm run test:coverage
```
- **Passing**: **154 / 154 tests** across 23 test suites
- **Context Coverage**: **94.96%**

### 4. Production Build
```bash
npm run build
```
*Builds production bundle to `/dist`.*
