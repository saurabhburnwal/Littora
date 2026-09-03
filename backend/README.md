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

- **Security & Defensive Engineering**:
  - **Magic-Byte Image Validation**: Inspects binary byte headers for JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), and WebP (`RIFF` + `WEBP`), rejecting disguised executable and polyglot payloads (`fileValidation.js`).
  - **HTTP Security Headers & CORS**: Configures `helmet` with Content Security Policy (`default-src 'self'`, `object-src 'none'`), HSTS (1 year with subdomains and preload), and strict CORS origin whitelisting.
  - **Tiered Rate Limiting**: Dedicated rate limiters on sensitive routes (auth: 30/15m, analyze: 20/1m, email: 10/1h, global: 1,000/15m).
  - **Primary Admin Safeguard**: Hardcoded protection preventing deletion or tampering of the platform primary administrator (`admin@littora.app`).

---

## Directory Structure

```text
backend/
├── src/
│   ├── index.js           → Express server, Helmet, CORS, and global rate limiter
│   ├── middleware/
│   │   ├── auth.js        → requireAuth and requireAdmin middleware
│   │   └── fileValidation.js → Magic-byte image validation & polyglot script blocker
│   ├── routes/
│   │   ├── admin.js       → /api/admin endpoints (manage all user analyses)
│   │   ├── analyses.js    → /api/analyses endpoints (user-scoped queries)
│   │   ├── analyze.js     → /api/analyze multipart upload, rate-limited & magic-byte verified
│   │   ├── auth.js        → /api/auth endpoints (account deletion, login)
│   │   ├── dataset.js     → /api/dataset endpoints
│   │   ├── email.js       → /api/email send report endpoint (requireAuth & rate-limited)
│   │   ├── model.js       → /api/model active AI model selection endpoint
│   │   ├── myAnalyses.js  → /api/my-analyses authenticated user history
│   │   └── stats.js       → /api/stats summary metrics (user vs global scoping)
│   ├── services/
│   │   ├── aiService.js       → HTTP client forwarding to Python FastAPI
│   │   ├── emailService.js    → Nodemailer & Resend SMTP transport
│   │   └── supabaseClient.js  → Supabase client querying public.vw_analysis_details & 5NF tables
│   └── __tests__/         → Jest test suite (13 suites, 188 tests passing 100%)
│       └── challenger1_security.test.js → 402-line empirical adversarial penetration suite
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
AI_SERVICE_TIMEOUT_MS=120000
# Production: add the Vercel domain (and any preview domains that need API access)
FRONTEND_ORIGINS=http://localhost:5173
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

### Verification Metrics (Jest V8)
- **Passing**: **188 / 188 tests** across 13 test suites (100% pass rate)
- **Vulnerability Audit**: **0 CVEs** (`npm audit`)
- **Adversarial Resilience**: Empirical coverage for polyglots, spoofed MIMEs, CORS violations, and rate-limiting exhaustion.

