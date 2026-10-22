# Facebook Comment Feeder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack web application that extracts comments from public Facebook post URLs, previews them in an interactive dashboard with an anonymize toggle (e.g. `Commenter #1`, `Commenter #2`), and exports them to an Excel (`.xlsx`) spreadsheet.

**Architecture:** A lightweight Node.js/Express backend runs a headless Playwright scraper to extract comments without paid APIs and provides asynchronous job status polling. A modern React/Vite frontend displays the dashboard, manages deterministic pseudonym mapping, and uses ExcelJS to generate styled `.xlsx` files client-side.

**Tech Stack:** Node.js, Express, Playwright (Chromium), React (Vite), ExcelJS, Vitest/Jest for testing.

**Spec:** `docs/superpowers/specs/2026-10-22-facebook-comment-feeder-design.md`

## Global Constraints
- Node.js 18+ runtime compatible with Windows and Linux (Render/Docker).
- Playwright Chromium used with stealth evasion headers for headless public post scraping.
- No database; stateless in-memory job handling.
- Deterministic pseudonym mapping: repeated comments from the same author must receive identical pseudonyms (`Commenter #N`).
- Excel export must generate `.xlsx` with custom header styles, auto-fitted column widths, and wrapped comment text.

## Review Focus
1. Malformed or non-Facebook URLs: Must fail fast with a clear validation message before launching a browser.
2. Deleted, private, or restricted Facebook posts: Scraper must time out gracefully and report an actionable error rather than hanging.
3. Posts with zero comments: Must display a clean empty-state message without breaking the dashboard table or Excel exporter.
4. Authors with special characters, emojis, or identical display names: Pseudonym mapping must handle unicode safely without collisions.
5. Large comment volumes (e.g., 100+ comments): Table must remain responsive and Excel export must not crash the browser tab.

---

### Task 1: Project Setup & Backend Job Manager

**Files:**
- Create: `package.json`
- Create: `backend/package.json`
- Create: `backend/src/utils/urlValidator.js`
- Create: `backend/src/jobs.js`
- Test: `backend/tests/urlValidator.test.js`
- Test: `backend/tests/jobs.test.js`

**Interfaces:**
- Produces: `isValidFacebookUrl(url: string) -> { valid: boolean, error?: string }`
- Produces: `createJob(url: string) -> { id: string, status: string, progress: string, comments: Array, error?: string }`
- Produces: `getJob(id: string) -> JobObject | null`
- Produces: `updateJob(id: string, updates: Partial<JobObject>) -> void`

- [ ] **Step 1: Write the failing tests for URL Validator and Job Manager**

```javascript
// backend/tests/urlValidator.test.js
import { describe, it, expect } from 'vitest';
import { isValidFacebookUrl } from '../src/utils/urlValidator.js';

describe('isValidFacebookUrl', () => {
  it('accepts valid facebook desktop post URLs', () => {
    expect(isValidFacebookUrl('https://www.facebook.com/user/posts/123456789').valid).toBe(true);
  });
  it('accepts valid mobile and watch URLs', () => {
    expect(isValidFacebookUrl('https://m.facebook.com/story.php?story_fbid=123').valid).toBe(true);
    expect(isValidFacebookUrl('https://www.facebook.com/watch/?v=123').valid).toBe(true);
  });
  it('rejects invalid or non-facebook URLs', () => {
    expect(isValidFacebookUrl('https://google.com').valid).toBe(false);
    expect(isValidFacebookUrl('not-a-url').valid).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix backend test`
Expected: FAIL with missing modules.

- [ ] **Step 3: Implement `isValidFacebookUrl` and Job Manager**

Implement `backend/src/utils/urlValidator.js` with regex checking for `facebook.com`, `m.facebook.com`, and `fb.watch`. Implement `backend/src/jobs.js` with in-memory map storing jobs with TTL expiration.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm --prefix backend test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend package.json
git commit -m "feat(backend): add URL validator and job state manager"
```

---

### Task 2: Playwright Scraper Engine

**Files:**
- Create: `backend/src/scraper.js`
- Test: `backend/tests/scraper.test.js`

**Interfaces:**
- Consumes: `isValidFacebookUrl` from Task 1
- Produces: `scrapeFacebookComments(url: string, onProgress?: (msg: string) => void) -> Promise<Array<{ id: string, author: string, date: string, text: string }>>`

- [ ] **Step 1: Write the failing test for comment DOM extraction parsing**

```javascript
// backend/tests/scraper.test.js
import { describe, it, expect } from 'vitest';
import { parseCommentNode } from '../src/scraper.js';

describe('parseCommentNode', () => {
  it('extracts author, timestamp, and text from mock comment object', () => {
    const raw = {
      authorText: 'John Doe',
      dateText: '2 hrs ago',
      bodyText: 'Great post!'
    };
    const parsed = parseCommentNode(raw);
    expect(parsed.author).toBe('John Doe');
    expect(parsed.date).toBe('2 hrs ago');
    expect(parsed.text).toBe('Great post!');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run backend/tests/scraper.test.js`
Expected: FAIL

- [ ] **Step 3: Implement Playwright Scraper with anti-bot evasion & comment expansion**

In `backend/src/scraper.js`:
- Configure Playwright with desktop user-agent and stealth args.
- Add handler for cookie banners and login dialog close (`✕` / "Not Now").
- Implement `parseCommentNode` helper for resilient DOM text extraction.
- Implement iterative click & scroll for "View more comments" / "View previous comments".
- Enforce 60-second execution safety timeout.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run backend/tests/scraper.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/scraper.js backend/tests/scraper.test.js
git commit -m "feat(backend): implement Playwright Facebook comment scraper"
```

---

### Task 3: Backend Express API Server

**Files:**
- Create: `backend/src/server.js`
- Test: `backend/tests/server.test.js`

**Interfaces:**
- Consumes: `createJob`, `getJob`, `updateJob` from Task 1
- Consumes: `scrapeFacebookComments` from Task 2
- Produces: HTTP API:
  - `GET /health` -> `{ status: "ok" }`
  - `POST /api/scrape` -> `{ jobId: string }`
  - `GET /api/jobs/:id` -> `{ id: string, status: string, progress: string, comments: Array, error?: string }`

- [ ] **Step 1: Write failing API test using supertest**

```javascript
// backend/tests/server.test.js
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';

describe('Backend API Endpoints', () => {
  it('GET /health returns status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/scrape rejects missing or invalid url', async () => {
    const res = await request(app).post('/api/scrape').send({ url: 'not-facebook' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run backend/tests/server.test.js`
Expected: FAIL

- [ ] **Step 3: Implement Express app in `backend/src/server.js`**

Implement Express app with `cors()`, `express.json()`, `/health`, `POST /api/scrape` (validates URL, creates job, triggers async scrape, returns `jobId`), and `GET /api/jobs/:id` (returns job state).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run backend/tests/server.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/server.js backend/tests/server.test.js
git commit -m "feat(backend): add Express REST API with scrape job endpoints"
```

---

### Task 4: Frontend Anonymization & Excel Exporter Core

**Files:**
- Create: `frontend/src/utils/anonymizer.js`
- Create: `frontend/src/utils/excelExporter.js`
- Test: `frontend/tests/anonymizer.test.js`
- Test: `frontend/tests/excelExporter.test.js`

**Interfaces:**
- Produces: `anonymizeComments(comments: Array, isAnonymized: boolean) -> Array<{ no: number, date: string, author: string, text: string }>`
- Produces: `exportToExcel(comments: Array, isAnonymized: boolean, filename?: string) -> Promise<Blob>`

- [ ] **Step 1: Write failing tests for Anonymizer and Excel generation**

```javascript
// frontend/tests/anonymizer.test.js
import { describe, it, expect } from 'vitest';
import { anonymizeComments } from '../src/utils/anonymizer.js';

describe('anonymizeComments', () => {
  const sample = [
    { id: '1', author: 'Alice Smith', date: '1 hr ago', text: 'First' },
    { id: '2', author: 'Bob Jones', date: '30m ago', text: 'Second' },
    { id: '3', author: 'Alice Smith', date: '10m ago', text: 'Third by Alice' }
  ];

  it('preserves real names when isAnonymized is false', () => {
    const result = anonymizeComments(sample, false);
    expect(result[0].author).toBe('Alice Smith');
    expect(result[1].author).toBe('Bob Jones');
  });

  it('assigns consistent pseudonyms when isAnonymized is true', () => {
    const result = anonymizeComments(sample, true);
    expect(result[0].author).toBe('Commenter #1');
    expect(result[1].author).toBe('Commenter #2');
    expect(result[2].author).toBe('Commenter #1'); // Same author receives same pseudonym
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run frontend/tests/anonymizer.test.js`
Expected: FAIL

- [ ] **Step 3: Implement `anonymizer.js` and `excelExporter.js`**

- `anonymizer.js`: Uses a `Map` to assign sequential numbers to unique authors in appearance order.
- `excelExporter.js`: Uses ExcelJS to construct workbook, adds sheet `Comments`, defines columns with headers (`No.`, `Date`, `Commenter Name`, `Comment Text`), styles header row (dark navy, white bold text), enables wrap-text on comment column, auto-sizes column widths, and triggers browser file download.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run frontend/tests/anonymizer.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils frontend/tests
git commit -m "feat(frontend): implement consistent anonymizer and Excel exporter"
```

---

### Task 5: Frontend Interactive Dashboard UI

**Files:**
- Create: `frontend/index.html`
- Create: `frontend/vite.config.js`
- Create: `frontend/package.json`
- Create: `frontend/src/main.jsx`
- Create: `frontend/src/App.jsx`
- Create: `frontend/src/App.css`
- Create: `frontend/src/components/Header.jsx`
- Create: `frontend/src/components/UrlInput.jsx`
- Create: `frontend/src/components/MetricsCards.jsx`
- Create: `frontend/src/components/ControlsBar.jsx`
- Create: `frontend/src/components/CommentsTable.jsx`
- Test: `frontend/tests/App.test.jsx`

**Interfaces:**
- Consumes: `anonymizeComments` and `exportToExcel` from Task 4
- Consumes: Backend API endpoints from Task 3 (`POST /api/scrape`, `GET /api/jobs/:id`)

- [ ] **Step 1: Write UI component render test**

```javascript
// frontend/tests/App.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../src/App.jsx';

describe('App Dashboard', () => {
  it('renders title, URL input, fetch button, and anonymize toggle', () => {
    render(<App />);
    expect(screen.getByText(/Facebook Comment Feeder/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste Facebook post URL/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fetch Comments/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run frontend/tests/App.test.jsx`
Expected: FAIL

- [ ] **Step 3: Build the UI components and App.jsx**

Build a modern, responsive interface:
- Modern dark-mode UI with polished typography and accents.
- `UrlInput`: Paste action, validation, and loading spinner.
- `MetricsCards`: Total comments, unique commenters, status.
- `ControlsBar`: Interactive Anonymize switch ("Mask Commenter Names"), live keyword search filter, and "Download Excel (.xlsx)" button.
- `CommentsTable`: Clean data table displaying `#`, `Date`, `Commenter`, and `Comment` with instant filter/anonymize switching.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run frontend/tests/App.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "feat(frontend): build interactive dashboard UI with live anonymize toggle"
```

---

### Task 6: Full-Stack Integration & End-to-End Verification

**Files:**
- Modify: `package.json` (add root scripts: `dev`, `start`, `test`, `build`)
- Create: `tests/e2e.test.js`
- Create: `README.md` (Deployment guide for Vercel frontend and Render backend)

- [ ] **Step 1: Write end-to-end integration test**

Verify that submitting a test URL through the API initiates a job, updates progress, and produces downloadable comments.

- [ ] **Step 2: Run test to verify flow**

Run: `npm test`
Expected: All backend and frontend unit tests PASS.

- [ ] **Step 3: Setup concurrent local runner script**

In root `package.json`, configure `npm run dev` to launch both backend and frontend concurrently for seamless local testing. Add clear `README.md` with step-by-step instructions for running locally and deploying to Vercel/Render.

- [ ] **Step 4: Verify end-to-end functionality**

Run `npm run build` and ensure zero build errors for both backend and frontend.

- [ ] **Step 5: Final Commit**

```bash
git add .
git commit -m "feat: complete Facebook comment feeder with local & cloud deployment support"
```
