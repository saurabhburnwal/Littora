# Project: Littora AI Microservice & Reporting Overhaul

## Architecture

The Littora platform consists of three integrated application layers:
1. **AI Microservice (`ai-service/`)**:
   - High-performance FastAPI application for YOLOv8 computer vision detection and Ollama LLM intelligence.
   - Communicates with local Ollama (`http://localhost:11434`, model `ministral-3:3b`) asynchronously via `httpx.AsyncClient` with 30s timeouts.
   - Implements a robust statistical fallback engine that guarantees deterministic HTTP 200 responses if Ollama is offline or times out.
   - Endpoints: `GET /health`, `GET /models`, `POST /detect`, `POST /predict`, `POST /report/generate`, `POST /cleanup/recommendations`.
2. **Backend API Service (`backend/`)**:
   - Node.js / Express microservice orchestrating data ingestion, Supabase persistence, authentication, and email notifications.
   - Supports configurable SMTP delivery with automatic fallback to simulated email logging when credentials are unset.
   - Routes: `POST /api/email/send-report` (using `optionalAuth` and RFC 5322 validation for guest/authenticated multi-recipient delivery), `GET /api/email/status`.
3. **Frontend Web Application (`frontend/`)**:
   - Single-Page React application styled with Tailwind CSS v4.
   - `ReportsPage.jsx`: Dynamic multi-period slicing (Daily 24h, Weekly 7d, Monthly 30d, Custom start/end date range + location filter), AI executive summary & risk assessment, interactive Email Report modal, Markdown/Text export.
   - `generatePdfReport.js`: Renders formatted A4 PDF reports with AI executive summaries and filtered telemetry.
   - `CleanupPage.jsx`: Visualizes AI intervention plans with priority tiers, volunteer estimates, equipment lists, and target zones.
   - `DashboardPage.jsx`: Hero secondary button "View Live Analytics" with smooth scroll to `#dashboard-analytics`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Ollama Async Client & Health | Async HTTP client for `ministral-3:3b` with timeout handling and health check in `ai-service` | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Report Generation AI Endpoint | `POST /report/generate` synthesizing executive summary, risk assessment, and actionable takeaways | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Cleanup Recommendations AI Endpoint | `POST /cleanup/recommendations` synthesizing prioritized intervention plans, equipment, volunteers | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Deterministic AI Fallback Engine | Statistical fallback for reports and cleanup plans when Ollama is offline or times out | M1 | ORIGINAL_REQUEST §R1 |
| 5 | AI Service Pytest Test Suite | 100% test coverage for all AI endpoints including mock Ollama and fallback paths | M1 | ORIGINAL_REQUEST §Acceptance Criteria |
| 6 | Email Transport & Status Health | Configurable SMTP with simulated mode fallback and `GET /api/email/status` in backend | M2 | ORIGINAL_REQUEST §R3 |
| 7 | Multi-Recipient Email Dispatch | `POST /api/email/send-report` with `optionalAuth` and RFC 5322 regex validation for guests/users | M2 | ORIGINAL_REQUEST §R3 |
| 8 | Branded HTML Email Template | Responsive HTML email with Littora branding, KPI cards, and severity breakdown pills | M2 | ORIGINAL_REQUEST §R3 |
| 9 | Backend Jest Test Suite | 100% passing tests for email routes, optionalAuth, status endpoint, and templates | M2 | ORIGINAL_REQUEST §Acceptance Criteria |
| 10 | Dynamic Multi-Period Reporting | `ReportsPage.jsx` dynamic filtering for Daily (24h), Weekly (7d), Monthly (30d), and Custom ranges | M3 | ORIGINAL_REQUEST §R2 |
| 11 | AI Executive Summary UI & Regenerate | Display AI executive summary, risk assessment, priority actions with loading/regeneration state | M3 | ORIGINAL_REQUEST §R2 |
| 12 | Interactive Email Report Modal | Modal in `ReportsPage.jsx` with recipient input, transport mode badge, and send feedback | M3 | ORIGINAL_REQUEST §R3 |
| 13 | Enhanced PDF Report Generation | `generatePdfReport.js` rendering filtered metrics and AI executive summary into A4 PDF | M3 | ORIGINAL_REQUEST §R2 |
| 14 | AI Cleanup Intervention UI | `CleanupPage.jsx` rendering priority tiers, volunteer estimates, equipment, and targeted zones | M3 | ORIGINAL_REQUEST §R4 |
| 15 | Dashboard Hero Button Refinement | Update hero secondary button to "View Live Analytics" with smooth scroll to `#dashboard-analytics` | M3 | ORIGINAL_REQUEST §R5 |
| 16 | Frontend Vitest Suite & Build | 100% passing Vitest suite and clean Vite production build with zero errors | M3 | ORIGINAL_REQUEST §Acceptance Criteria |
| 17 | End-to-End System Verification | Full verification across all tiers, services, and integration points | M4 | ORIGINAL_REQUEST §Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | AI Microservice Ollama & Endpoints | `ai-service/` (Ollama client, schemas, `/report/generate`, `/cleanup/recommendations`, fallback, pytest) | none | DONE |
| M2 | Backend Email Service & Multi-Recipient | `backend/` (`emailService.js`, `email.js`, `optionalAuth`, HTML email templates, `/status`, Jest) | none | DONE |
| M3 | Frontend Reports, Cleanup & Dashboard | `frontend/` (`ReportsPage.jsx`, `CleanupPage.jsx`, `DashboardPage.jsx`, `generatePdfReport.js`, Vitest) | M1, M2 interface contracts | DONE |
| M4 | Cross-Stack Integration & Gate Verification | Comprehensive verification of all test suites (Pytest, Jest, Vitest, Vite build) and audit | M1, M2, M3 | DONE |

## Interface Contracts

### AI Microservice (`POST /report/generate`)
- **Request Body**:
  ```json
  {
    "period": "daily" | "weekly" | "monthly" | "custom",
    "date_range": { "start": "2026-08-25T00:00:00Z", "end": "2026-08-26T23:59:59Z" },
    "location_filter": "All Locations" | "<Location Name>",
    "telemetry": {
      "total_scans": 12,
      "total_waste_items": 154,
      "avg_pollution_score": 38.5,
      "severity_breakdown": { "Low": 2, "Moderate": 5, "High": 4, "Severe": 1 },
      "top_categories": [ { "category": "Plastic", "count": 82 } ]
    }
  }
  ```
- **Response Body (200 OK)**:
  ```json
  {
    "period": "daily",
    "executive_summary": "string",
    "risk_assessment": "string",
    "actionable_takeaways": ["string"],
    "impact_analysis": "string",
    "priority_actions": ["string"],
    "source": "ollama_ministral-3:3b" | "rule_based_fallback",
    "generated_at": "ISO-8601 string"
  }
  ```

### AI Microservice (`POST /cleanup/recommendations`)
- **Request Body**:
  ```json
  {
    "locations": [
      {
        "location": "Juhu Beach",
        "scans": 5,
        "pollution_score": 65.2,
        "severity": "High",
        "top_waste": "Plastic",
        "categories": { "Plastic": 45, "Glass": 12 }
      }
    ]
  }
  ```
- **Response Body (200 OK)**:
  ```json
  {
    "recommendations": [
      {
        "location": "Juhu Beach",
        "priority_tier": "Tier 1 - Critical",
        "urgency": "High",
        "estimated_volunteers": 15,
        "estimated_duration_hours": 3,
        "equipment": ["Heavy-duty gloves", "Trash grabbers", "Plastic sorting bags"],
        "targeted_zones": ["High-tide waterline", "Rocky crevices"],
        "rationale": "High pollution score with elevated plastic debris.",
        "suggested_schedule": "Immediate (Within 48 hours)"
      }
    ],
    "source": "ollama_ministral-3:3b" | "rule_based_fallback",
    "generated_at": "ISO-8601 string"
  }
  ```

### Backend (`POST /api/email/send-report`)
- **Headers**: `Authorization: Bearer <token>` (optional via `optionalAuth`)
- **Request Body**:
  ```json
  {
    "recipientEmail": "user@example.com",
    "reportType": "daily" | "weekly" | "monthly" | "custom",
    "reportText": "Plain text summary for fallback",
    "reportData": {
      "period": "Daily (Last 24h)",
      "totalScans": 12,
      "totalWaste": 154,
      "avgPollutionScore": 38.5,
      "severityBreakdown": { "Low": 2, "Moderate": 5, "High": 4, "Severe": 1 },
      "executiveSummary": "...",
      "riskAssessment": "...",
      "actionableTakeaways": ["..."]
    }
  }
  ```
- **Response Body (200 OK)**:
  ```json
  {
    "message": "Report email sent successfully",
    "recipient": "user@example.com",
    "mode": "smtp" | "simulated",
    "messageId": "..."
  }
  ```

### Backend (`GET /api/email/status`)
- **Response Body (200 OK)**:
  ```json
  {
    "status": "healthy",
    "mode": "smtp" | "simulated",
    "configured": true,
    "transport": {
      "host": "smtp.example.com",
      "port": 587,
      "secure": false,
      "authConfigured": true
    }
  }
  ```

## Code Layout

- `ai-service/`
  - `schemas.py`: Pydantic models for Report, Cleanup, Health, Detections
  - `ollama_client.py`: Async Ollama client for `ministral-3:3b` with timeouts & health check
  - `report_generator.py`: Prompt synthesis & statistical fallback for reports
  - `cleanup_recommender.py`: Prompt synthesis & statistical fallback for cleanups
  - `main.py`: Route definitions & FastAPI lifespan integration
  - `test_report_cleanup.py`: Pytest tests for all new endpoints & Ollama mocks
- `backend/`
  - `src/services/emailService.js`: HTML email generator, SMTP transporter, simulated fallback, `getEmailStatus`
  - `src/routes/email.js`: `optionalAuth`, recipient validation, send-report route, `/status` route
  - `src/__tests__/emailService.test.js`: Unit tests for email service
  - `src/__tests__/routes.email.test.js`: Route integration tests for `/send-report` and `/status`
  - `.env.example`: Documented `SMTP_*` variables
- `frontend/`
  - `src/pages/ReportsPage.jsx`: Dynamic period selector, date/location picker, AI summary card, Email modal, PDF export
  - `src/utils/generatePdfReport.js`: PDF builder with AI summary and filtered telemetry
  - `src/pages/CleanupPage.jsx`: Dynamic AI intervention plans with priority tiers, equipment, zones
  - `src/pages/DashboardPage.jsx`: "View Live Analytics" hero action button
  - `src/pages/__tests__/DashboardPage.test.jsx`: Updated hero button test
  - `src/pages/__tests__/ReportsPage.test.jsx`: Tests for period switching and email modal
  - `src/pages/__tests__/CleanupPage.test.jsx`: Tests for AI intervention rendering
