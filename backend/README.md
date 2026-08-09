# Littora Backend — Node.js & Express API Server

The backend of **Littora** serves as the central orchestration API between the React frontend, the Python AI Inference Service, and Supabase (PostgreSQL & Storage).

---

## Responsibilities

- **Image Storage Orchestration**: Receives multipart image uploads from the browser, forwards them to the AI service for inference, uploads image buffers to Supabase Storage (`beach-waste-images`), and persists analysis records.
- **3-Tier Data Access Isolation**:
  - **Admin**: System-wide platform metrics across all uploaders with uploader email & name enrichment via Supabase Auth Admin API (`listAllAnalysesAdmin`).
  - **Regular User**: User-scoped metrics (`getStats(userId)`), personal analysis listing (`listAnalysesByUser`), and owned row deletion (`deleteAnalysisForUser`).
  - **Guest Visitor**: Empty stats fallback & 0 totals for guest preview mode.
- **Auth & Middleware**:
  - `requireAuth`: Verifies Bearer JWT tokens with Supabase Auth (`supabase.auth.getUser(token)`).
  - `requireAdmin`: Enforces admin privileges by matching `req.user.email` against `ADMIN_EMAIL`.
- **Email Notifications**: Automated report emailing via Nodemailer transport (`/api/email/send-report`).
- **Analytics Aggregation**: Pure JS aggregation for severity breakdowns, waste item counts, geolocated beach markers, and chronological history lists.

---

## Directory Structure

```text
backend/
├── src/
│   ├── index.js           → Express application setup & middleware initialization
│   ├── middleware/
│   │   └── auth.js        → requireAuth and requireAdmin middleware
│   ├── routes/
│   │   ├── admin.js       → /api/admin endpoints (manage all user analyses)
│   │   ├── analyses.js    → /api/analyses endpoints
│   │   ├── analyze.js     → /api/analyze multipart upload & AI orchestration
│   │   ├── auth.js        → /api/auth login & logout endpoints
│   │   ├── email.js       → /api/email send report endpoint
│   │   ├── myAnalyses.js  → /api/my-analyses authenticated user history
│   │   └── stats.js       → /api/stats summary metrics
│   │   ├── services/
│   │   │   ├── aiService.js       → HTTP client forwarding to Python FastAPI
│   │   │   ├── emailService.js    → Nodemailer configuration & transport
│   │   │   └── supabaseClient.js  → Supabase client querying public.vw_analysis_details & 4NF tables
│   │   └── __tests__/         → Jest unit & integration test suite (11 suites, 80 tests passing 100%)
├── .env.example           → Environment variable template
├── jest.config.js         → Jest ES modules configuration
└── package.json           → Express dependencies & scripts
```

---

## Environment Setup & Running

### 1. Configure Environment Variables
Copy `.env.example` to `.env`:
```env
PORT=4000
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SECRET_KEY=your-supabase-secret-key
SUPABASE_STORAGE_BUCKET=beach-waste-images
AI_SERVICE_URL=http://localhost:8000
ADMIN_EMAIL=admin@littora.app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Dev Server
```bash
npm run dev
```
*Server runs on `http://localhost:4000`.*

---

## Testing & Coverage

```bash
# Run unit & integration test suite
npm test

# Generate coverage report
npm run test:coverage
```

### Coverage Metrics (Jest V8)
- **Statements**: **91.2%**
- **Functions**: **97.8%**
- **Lines**: **92.4%**
- **Passing**: **80 / 80 tests** across 11 test suites (100% pass rate)
