# Facebook Comment Feeder & Exporter

A modern, full-stack web application designed to extract comments from public Facebook posts, inspect them on an interactive dashboard with a blind-check **Anonymize Toggle**, and export them directly to Microsoft Excel (`.xlsx`).

---

## ✨ Features

- **Automated Public Post Scraper**: Uses headless **Playwright (Chromium)** with stealth anti-bot evasion headers to expand and scrape comments without requiring expensive third-party APIs.
- **Blind Review / Anonymize Mode**: A toggle switch that deterministically masks author names into consistent pseudonyms (`Commenter #1`, `Commenter #2`, ...). Repeated comments from the same person maintain the same pseudonym so conversational threads remain traceable while keeping identity 100% anonymous.
- **Instant Excel (.xlsx) Exporter**: Client-side spreadsheet generation with styled navy headers, auto-calculated column widths, borders, and text-wrapping for long comment bodies.
- **Live Search & Filter**: Real-time keyword and author filtering on the dashboard.
- **Stateless & Privacy-First**: No database required; comment data remains in-memory during the session and downloads directly to your device.

---

## 🏗️ Architecture

```
┌───────────────────────────────────────┐
│              Web Browser              │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│       Frontend (Vercel-Ready)         │
│  - React 18 + Vite                    │
│  - Interactive Dashboard Table        │
│  - Anonymize Toggle (Blind Review)    │
│  - Client-side ExcelJS Generator      │
└───────────────────┬───────────────────┘
                    │ REST API / Polling
                    ▼
┌───────────────────────────────────────┐
│        Backend (Render-Ready)         │
│  - Node.js + Express Server           │
│  - Playwright Headless Chromium       │
│  - In-memory Job State Manager        │
└───────────────────────────────────────┘
```

---

## 🚀 Running Locally

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher installed on your computer.

### Quick Start
1. **Clone and install dependencies**:
   ```bash
   npm install
   npm run dev
   ```
2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```
3. Paste any public Facebook post URL into the search bar and click **"Fetch Comments"**!

---

## 🌐 Deploying to Production

### 1. Backend on Render.com (Free)
1. Push this repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com/), click **New Web Service** and select this repository.
3. Configure the service:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx playwright install chromium`
   - **Start Command**: `npm start`
4. Copy your backend service URL (e.g. `https://your-backend.onrender.com`).

### 2. Frontend on Vercel (Free)
1. In [Vercel Dashboard](https://vercel.com/new), import your repository.
2. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
3. Add Environment Variable:
   - `VITE_API_URL` = `https://your-backend.onrender.com` (your Render backend URL)
4. Click **Deploy**. Your app is now live publicly!

---

## 🧪 Running Tests

Run all unit, integration, and E2E tests:
```bash
# Run backend tests
npm test --prefix backend

# Run frontend tests
npm test --prefix frontend
```

---

## 📁 Project Structure

```
├── backend/
│   ├── src/
│   │   ├── server.js              # Express REST API endpoints
│   │   ├── scraper.js             # Playwright stealth comment extractor
│   │   ├── jobs.js                # In-memory job state manager
│   │   └── utils/
│   │       └── urlValidator.js    # Facebook URL validation logic
│   └── tests/                     # Unit and E2E integration tests
├── frontend/
│   ├── src/
│   │   ├── components/            # Header, UrlInput, Metrics, Controls, Table
│   │   ├── utils/
│   │   │   ├── anonymizer.js      # Deterministic pseudonym mapper
│   │   │   └── excelExporter.js   # ExcelJS spreadsheet generator
│   │   ├── App.jsx                # Main dashboard coordinator
│   │   └── App.css                # Dark-mode design system
│   └── tests/                     # Component & utility test suites
├── docs/                          # Specs and implementation plans
└── package.json                   # Root monorepo workspace & dev scripts
```
