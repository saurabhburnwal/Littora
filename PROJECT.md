# Project: Littora Full-Stack Security & Test Veracity Hardening

## Architecture

The Littora platform is a full-stack coastal waste telemetry and AI monitoring system comprising four layers:
1. **Frontend Web Application (`frontend/`)**: React 19 SPA with Tailwind CSS v4, Leaflet GIS mapping, real-time analytics, report generation (html2canvas/jsPDF), and authentication state management.
2. **Backend API Microservice (`backend/`)**: Node.js Express REST API orchestrating image upload ingestion, Supabase PostgreSQL persistence, JWT authentication, role authorization, SMTP email notifications, and communication with the AI microservice.
3. **AI Microservice (`ai-service/`)**: FastAPI Python service running YOLOv8 object detection (PyTorch) and Ollama LLM report/cleanup generation (`ministral-3:3b`) with deterministic statistical fallback.
4. **Database & Storage Layer (`supabase/migrations/`)**: Supabase PostgreSQL database with Row Level Security (RLS) policies, PostgREST Data API, authentication, and object storage.

## Feature Inventory

Every security hardening requirement and test veracity deliverable assigned to milestones:
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Express Security Headers & CSP/HSTS | Helmet configuration with same-site CORP, CSP directives, HSTS preload, frameguard | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Express Strict CORS Origin Policy | Restrict allowed origins to FRONTEND_ORIGINS with local fallbacks, remove `origin: true` | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Express Tiered Rate Limiting | Rate limiting for `/api` (global), `/api/analyze` (upload), `/api/email/send-report` (email), and `/api/auth/` | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Express Magic Byte File Ingestion | Enforce JPEG/PNG/WebP magic byte signatures, reject polyglot script payloads and corrupt streams | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Email Endpoint Authentication & Spam Shield | Enforce `requireAuth` on `POST /api/email/send-report` and rate limit dispatch | M1 | ORIGINAL_REQUEST §R1 |
| 6 | Express Dependency Vulnerability Fixes | Remediate `body-parser`, `qs`, `multer` vulnerabilities via package updates | M1 | ORIGINAL_REQUEST §R1 |
| 7 | FastAPI Strict CORS & Headers | Restrict CORS to authorized backend/frontend origins, remove wildcard `*` | M2 | ORIGINAL_REQUEST §R1 |
| 8 | FastAPI Magic Byte & Polyglot Defense | True file signature validation for image endpoints, reject HTML/SVG polyglots and truncate empty files | M2 | ORIGINAL_REQUEST §R1 |
| 9 | FastAPI Payload Limits & GPU OOM Catch | Enforce 10MB payload size limit, defensive GPU OOM catch with automatic CPU fallback | M2 | ORIGINAL_REQUEST §R1 |
| 10 | FastAPI Dependency Vulnerability Fixes | Update `python-multipart` and `pillow` to patched secure releases | M2 | ORIGINAL_REQUEST §R1 |
| 11 | Supabase RLS Hardening for Admin Tables | Revoke authenticated write policies on `ai_models`, `system_settings`, `waste_types`; restrict to `service_role` | M3 | ORIGINAL_REQUEST §R1 |
| 12 | Scoped Telemetry & Dataset Authorization | Scope `GET /api/analyses` and `/api/dataset.*` to requesting user or require admin; enforce Rule 6 in `/api/stats` | M3 | ORIGINAL_REQUEST §R1 |
| 13 | Primary Administrator Protection Trigger | Database-level and API safeguards preventing primary administrator account deletion | M3 | ORIGINAL_REQUEST §R1 |
| 14 | Frontend Vitest Anti-Tautology Hardening | Fix `UploadForm.test.jsx`, `downloadUtils.test.js`, `ProtectedRoute.test.jsx`, `Badge.test.jsx`, `generatePdfReport.js` HTML escaping | M4 | ORIGINAL_REQUEST §R2 |
| 15 | Backend Jest Anti-Tautology Hardening | Fix `aiService.test.js`, `routes.model.test.js`, `middleware.test.js`, `routes.analyses.test.js`, negative upload/auth tests | M4 | ORIGINAL_REQUEST §R2 |
| 16 | AI Microservice Pytest Negative Tests | Add negative magic-byte rejection, polyglot rejection, corrupted stream tests, fix model assertions | M4 | ORIGINAL_REQUEST §R2 |
| 17 | Cross-Stack Integration & Full Gate Verification | Run 100% clean test suites (Vitest, Jest, Pytest), verify build, and pass Forensic Auditor integrity checks | M5 | ORIGINAL_REQUEST §Acceptance Criteria |

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Express Backend Security & Ingestion Hardening | `backend/src/index.js`, `backend/src/routes/analyze.js`, `backend/src/routes/email.js`, `backend/src/middleware/fileValidation.js`, `backend/package.json` | none | DONE |
| M2 | FastAPI AI Microservice Hardening | `ai-service/main.py`, `ai-service/requirements.txt` | none | DONE |
| M3 | Authorization, Supabase RLS & Admin Protection | `supabase/migrations/`, `backend/src/routes/analyses.js`, `backend/src/routes/dataset.js`, `backend/src/services/supabaseClient.js`, `backend/src/routes/auth.js` | none | DONE |
| M4 | Test Suite Veracity & Anti-Tautology Hardening | `frontend/src/**/__tests__/`, `frontend/src/utils/generatePdfReport.js`, `backend/src/__tests__/`, `ai-service/test_*.py` | M1, M2, M3 contracts | DONE |
| M5 | Full-Stack Integration & Verification Gate | Cross-stack test execution (`vitest run`, `npm test`, `pytest`), Vite production build, Forensic Integrity Audit | M1, M2, M3, M4 | DONE |

## Interface Contracts

### File Ingestion Signature Contract
- Accepted formats: JPEG (`FF D8 FF`), PNG (`89 50 4E 47 0D 0A 1A 0A`), WebP (`RIFF....WEBP`).
- Disallowed: All other magic bytes, zero-byte buffers, polyglot payloads containing `<script`, `<?php`, `<html`, `javascript:`, `<svg`.
- Error Response: HTTP 400 Bad Request with `{ "error": "..." }` (Express) or `{ "detail": "..." }` (FastAPI).

### CORS & Security Header Contract
- Express: Strict allowed origins array `["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4000"]` (or `FRONTEND_ORIGINS`). `origin: true` is forbidden.
- Security Headers: Helmet enabled with `crossOriginResourcePolicy: { policy: "same-site" }`, explicit CSP, HSTS maxAge 31536000 with includeSubDomains and preload, X-Content-Type-Options `nosniff`, Frameguard `DENY` or `SAMEORIGIN`.
- FastAPI: `CORSMiddleware` restricted to `ALLOWED_ORIGINS` (defaulting to Express server origins), no wildcard `*`.

### Rate Limiting Contract
- Global API: 1000 requests per 15 minutes per IP.
- Upload `/api/analyze`: 20 requests per minute per IP.
- Email Report `/api/email/send-report`: 10 requests per hour per IP; requires valid authentication.
- Auth `/api/auth/login`: 30 requests per 15 minutes per IP.
- Throttled Response: HTTP 429 Too Many Requests.

### Supabase RLS Privilege Isolation Contract
- `ai_models`, `system_settings`, `waste_types`: `SELECT` granted to public / authenticated; all write operations (`INSERT`, `UPDATE`, `DELETE`) restricted strictly to `service_role`.
- `analyses`, `detections`: User-scoped reads/writes. `GET /api/analyses` only returns records for `req.user.id` unless the user is an admin.
- `auth.users`: Deletion of configured primary admin email is blocked by application checks and Postgres trigger.

## Code Layout

- `backend/`
  - `src/index.js`: CORS, Helmet, rate limiting configuration, global error handling.
  - `src/middleware/fileValidation.js`: Magic byte inspection and polyglot detection utility.
  - `src/middleware/auth.js`: JWT verification, role checks, admin email validation.
  - `src/routes/analyze.js`: Image upload validation with magic bytes, rate limiter, AI dispatch.
  - `src/routes/email.js`: Authenticated and rate-limited email report dispatch.
  - `src/routes/analyses.js`: User-scoped analysis retrieval.
  - `src/routes/dataset.js`: User-scoped or admin-only dataset exports.
  - `src/services/supabaseClient.js`: Scoped database queries and storage uploads with sanitized filenames.
  - `src/__tests__/`: Hardened, non-tautological Jest test suites.
- `ai-service/`
  - `main.py`: Hardened CORS, magic byte and polyglot validation, 10MB payload cap, GPU OOM catch.
  - `requirements.txt`: Patched secure dependencies.
  - `test_ai_service.py`: Pytest suite with genuine negative and boundary tests.
- `supabase/migrations/`
  - `20260903120000_harden_admin_rls_policies.sql`: RLS write revocation for non-admin roles.
  - `20260903130000_protect_primary_admin.sql`: Postgres trigger guarding primary admin account.
- `frontend/`
  - `src/utils/generatePdfReport.js`: HTML entity escaping for dynamic strings.
  - `src/components/__tests__/`: Hardened Vitest component tests (EXIF GPS in UploadForm, ProtectedRoute adminOnly).
  - `src/utils/__tests__/`: Verifiable Blob serialization and download tests.
  - `src/pages/__tests__/`: Behavioral tests for DatasetPage and TrendsPage.
