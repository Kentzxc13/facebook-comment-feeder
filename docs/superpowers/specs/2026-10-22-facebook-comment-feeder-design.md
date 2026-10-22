# Facebook Comment Feeder & Exporter Specification

**Date:** 2026-10-22  
**Status:** Approved  
**Author:** Antigravity Pair Programming Assistant  

---

## 1. Executive Summary
The **Facebook Comment Feeder & Exporter** is a web application designed to extract comments from public Facebook post URLs and export them into a professionally formatted Excel spreadsheet (`.xlsx`). 

A key feature is the **Blind Check / Anonymize Toggle**, which maps commenter identities to consistent pseudonyms (e.g. `Commenter #1`, `Commenter #2`) across both the interactive dashboard preview and the downloaded Excel file.

---

## 2. Architecture & Technology Stack

```
┌───────────────────────────────────────────────┐
│              User Web Browser                 │
└───────────────────────┬───────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────┐
│        Frontend (Vercel-Ready / Vite)         │
│  - URL input & "Fetch Comments" button        │
│  - Real-time status / progress indicator      │
│  - Interactive Comment Preview Table          │
│  - Anonymize Toggle Switch (Blind Review)     │
│  - Client-side Excel (.xlsx) Exporter         │
└───────────────────────┬───────────────────────┘
                        │ REST API / Polling
                        ▼
┌───────────────────────────────────────────────┐
│     Backend (Render-Ready / Node.js Express)  │
│  - POST /api/scrape: Starts scraping job      │
│  - GET /api/jobs/:id: Polls status & results  │
│  - Playwright Headless Chromium Engine        │
│  - Cookie / login dismissal & comment expand  │
└───────────────────────────────────────────────┘
```

### 2.1 Technology Choices
* **Frontend**: React + Vite (or Modern Component-based Vanilla JS), styled with a sleek dark-mode design system. Ready for instant deployment on **Vercel**.
* **Backend**: **Node.js + Express** persistent server. Configured to run locally and ready for deployment on **Render** (via Docker or native Node environment with Playwright).
* **Scraper Engine**: **Playwright** (Chromium) in stealth mode. 100% free and unlimited, avoiding paid scraping subscriptions.
* **Storage**: **Stateless** (In-memory per job lifecycle). No backend database required. Optional browser `localStorage` stores recent scrape sessions locally on the user's device.
* **Spreadsheet Generator**: **ExcelJS** running in the browser for instant, client-side `.xlsx` downloads without additional server overhead.

---

## 3. Data Flow & Features

### 3.1 Scraping Workflow
1. **User Input**: User pastes a Facebook post URL (supports desktop `facebook.com`, mobile `m.facebook.com`, reels, and watch links).
2. **Job Initiation**: Frontend calls `POST /api/scrape` with the URL. Backend initializes a background job and immediately returns `{ jobId, status: "pending" }`.
3. **Playwright Execution**:
   - Backend launches a stealth Chromium context with desktop user-agent headers.
   - Navigates to the Facebook post URL.
   - Dismisses cookie banners and any dismissible login prompts ("Not Now", close `✕` icon).
   - If comment sorting dropdown exists, selects *"All comments"* (instead of *"Most relevant"*).
   - Iteratively scrolls and clicks *"View more comments"* / *"View previous comments"* until all visible comments are expanded or max limit is reached.
   - Extracts structured comment objects:
     - `id`: Unique string identifier
     - `author`: Raw name of the commenter
     - `date`: Human-readable date / relative timestamp
     - `text`: Comment content (preserving emojis and line breaks)
4. **Progress Polling**: Frontend polls `GET /api/jobs/:id` every 2 seconds. The backend reports progress (e.g. `status: "expanding_comments"`, `count: 38`).
5. **Results Delivery**: Once complete, the backend responds with the full array of comment objects. The browser displays the comments in the interactive dashboard table.

---

## 4. Anonymization Engine ("Blind Check Mode")

### 4.1 Consistent Pseudonym Algorithm
When the **Anonymize Toggle** is active:
* Each unique commenter name is assigned an incremental pseudonym in order of appearance:
  - First unique person ➔ `Commenter #1`
  - Second unique person ➔ `Commenter #2`
  - If a commenter with name `Jane Doe` (assigned `Commenter #1`) has 3 separate comments or replies, all 3 occurrences will be labeled `Commenter #1`.
* **Purpose**: Allows evaluators or auditors to trace conversation threads and identify repeat contributors while ensuring complete anonymity.

### 4.2 Dynamic UI & Export Consistency
* Toggling the switch instantly updates the dashboard table between real names and pseudonyms in real time.
* The Excel export mirrors the current state of the toggle at the exact moment of download.

---

## 5. User Interface & Dashboard Design

### 5.1 Components
1. **Hero & Input Section**:
   - Title: **Facebook Comment Feeder**
   - Subtitle: *Extract, analyze, and export Facebook comments to Excel.*
   - Clean URL input bar with paste shortcut and **"Fetch Comments"** button.
2. **Status & Progress Banner**:
   - Animated progress bar with live step indicators (*"Connecting"*, *"Expanding comments"*, *"Extracted 45 comments"*).
3. **Metrics Overview Cards**:
   - **Total Comments**
   - **Unique Commenters**
   - **Scrape Duration**
4. **Interactive Controls**:
   - **Anonymize Switch**: Toggle with badge: *"Mask Commenter Names (Commenter #1, #2...)"*.
   - **Live Search Bar**: Filters comments by keyword or commenter in real time.
   - **Download Excel (.xlsx)**: Primary action button with download icon.
5. **Data Table**:
   - Columns:
     1. `#` (Sequential Index)
     2. `Date / Timestamp`
     3. `Commenter` (Real name OR `Commenter #N`)
     4. `Comment` (Full text)

---

## 6. Excel (.xlsx) Export Specification

### 6.1 File Properties
* **Format**: Microsoft Excel OpenXML Spreadsheet (`.xlsx`).
* **Filename**: `facebook_comments_YYYY-MM-DD[_anonymized].xlsx`.
* **Sheet Name**: `Comments`.

### 6.2 Sheet Layout & Styling
* **Header Row**:
  - Dark slate/navy fill (`#1E293B`), white bold text, centered.
  - Columns: `No.`, `Date`, `Commenter Name`, `Comment Text`.
* **Data Rows**:
  - `No.`: Centered, width ~8.
  - `Date`: Centered, width ~20.
  - `Commenter Name`: Left-aligned, width ~25.
  - `Comment Text`: Left-aligned, width ~60, with **Wrap Text enabled** to prevent long text clipping.
* **Borders & Grid**: Light gray borders (`#E2E8F0`) for clean professional printing and reading.

---

## 7. Error Handling & Edge Cases

| Scenario | Behavior / Response |
|----------|-------------------|
| **Invalid / Empty URL** | Frontend validates format; shows inline error message before making API call. |
| **Private or Deleted Post** | Playwright detects 404 / content-not-available page; backend marks job as failed with clear message: *"Post is private, restricted, or deleted."* |
| **Login Checkpoint** | Scraper attempts dismissal. If Facebook presents a hard login wall, scraper returns a friendly notification explaining the post requires authentication. |
| **Post with Zero Comments** | Displays empty state gracefully: *"No comments found on this post."* |
| **Network Timeout** | Backend enforces a 90-second overall timeout per job to prevent hanging processes. |

---

## 8. Verification & Testing Strategy
1. **Scraper Unit & Integration Tests**:
   - Verify URL parser handles desktop, mobile, and video/reel Facebook URL formats.
   - Test Playwright scraper against sample public Facebook posts.
2. **Anonymizer Unit Tests**:
   - Test deterministic mapping: same author returns same `Commenter #N`.
   - Test toggle state toggles displayed and exported values correctly.
3. **Excel Export Validation**:
   - Verify generated `.xlsx` opens cleanly in Excel, Google Sheets, and LibreOffice with proper columns, wrap text, and styling.
4. **End-to-End Workflow**:
   - Test complete flow: Paste URL ➔ Scrape ➔ View Dashboard ➔ Toggle Anonymize ➔ Download Excel.
