# AuditSight — Security Audit Log Dashboard

A full-stack security log investigation dashboard built with React, Node.js, Express, and MongoDB Atlas.

---

## Features

- **Bulk Upload** — ingest up to 10,000 log records in a single POST request
- **Dashboard Overview** — severity distribution, 7-day activity trends, top actors/actions, region heatmap
- **Log Table** — paginated, filterable, sortable table with all server-side processing
- **Filters** — severity, status, region, resourceType, actor (regex), date range
- **Full-text search** — searches across actor, action, resource, IP, and role fields via MongoDB text index
- **Log Detail Panel** — click any row for a slide-in detail inspector
- **Delete** — remove individual logs or clear the entire dataset
- **Sample data generator** — built into the Upload page for quick testing (500 / 2,000 / 10,000 records)

---

## Stack

| Layer    | Technology |
|----------|-----------|
| Frontend | React 18, Vite, React Router 6, Recharts, CSS Modules |
| Backend  | Node.js 20, Express 4, Mongoose 8 |
| Database | MongoDB Atlas |

---

## Setup

**Prerequisites:** Node.js ≥ 18, a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster

### 1. Create a MongoDB Atlas cluster

1. Sign up at https://cloud.mongodb.com and create a free M0 cluster
2. Under **Database Access**, create a database user with read/write permissions
3. Under **Network Access**, add your IP address (or `0.0.0.0/0` for open access during development)
4. Click **Connect → Drivers** and copy your connection string — it looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/
   ```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and paste your Atlas connection string:

```env
PORT=5000
MONGO_URI=mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/gidy-audit?retryWrites=true&w=majority
CLIENT_ORIGIN=http://localhost:5173
```

### 3. Start the backend

```bash
cd backend
npm install
npm run dev      # runs on http://localhost:5000
```

You should see:
```
✅ MongoDB connected: mongodb+srv://...
🚀 Server running on port 5000
```

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev      # runs on http://localhost:5173
```

Open http://localhost:5173 — go to **Upload → "10,000 records"** to populate sample data.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/logs/upload` | Bulk insert (body: JSON array, max 10k) |
| `GET` | `/api/logs` | List logs (see query params below) |
| `GET` | `/api/logs/:id` | Single log detail |
| `DELETE` | `/api/logs/:id` | Delete one log |
| `DELETE` | `/api/logs` | Delete all logs |
| `GET` | `/api/stats` | Aggregated dashboard stats |
| `GET` | `/health` | Health check |

### GET /api/logs — Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `page` | int | Page number (default: 1) |
| `limit` | int | Records per page, max 500 (default: 50) |
| `sortBy` | string | Field to sort by (default: timestamp) |
| `sortOrder` | `asc`\|`desc` | Sort direction (default: desc) |
| `search` | string | Full-text search across actor, action, resource, IP, role |
| `severity` | string | Comma-separated: `LOW,MEDIUM,HIGH,CRITICAL` |
| `status` | string | Comma-separated: `Resolved,Unresolved,Investigating` |
| `region` | string | Comma-separated region codes |
| `resourceType` | string | Comma-separated resource types |
| `action` | string | Comma-separated action names |
| `actor` | string | Partial match (case-insensitive regex) |
| `from` | ISO8601 | Timestamp range start |
| `to` | ISO8601 | Timestamp range end |

---

## Deployment

### Backend — Render / Railway / Fly.io

Set these environment variables on your hosting platform:

```
PORT=5000
MONGO_URI=mongodb+srv://...   ← your Atlas URI
CLIENT_ORIGIN=https://your-frontend.vercel.app
```

### Frontend — Vercel / Netlify

Set this environment variable:

```
VITE_API_URL=https://your-backend.onrender.com/api
```

---

## Technical Decisions

### MongoDB Atlas over local MongoDB
Atlas provides a fully managed, cloud-hosted MongoDB instance with automatic backups, connection pooling, and a free M0 tier that easily handles 10k+ audit records. No local database process to manage.

### Compound + text indexes for query performance
With 10,000+ records, unindexed queries on severity, status, timestamp, and actor would be full collection scans. Added:
- Single-field indexes on every filterable/sortable field
- Compound indexes on common filter combos (`severity+status`, `actor+timestamp`)
- A MongoDB text index across `actor`, `action`, `resource`, `ipAddress`, `role` for free-text search

### Server-side filtering, sorting, and pagination
The brief explicitly requires this. Pushing filter/sort/paginate to MongoDB keeps payloads small and response times fast regardless of dataset size.

### `insertMany` with `ordered: false` for bulk upload
With `ordered: true`, one invalid document stops the entire batch. `ordered: false` lets valid documents insert even if a few fail, and returns a partial result count — better for real-world ingestion pipelines.

### `Promise.all` for stats aggregations
The stats endpoint runs 7 aggregation pipelines in parallel, cutting response time roughly 7x vs sequential awaits.

### CSS Modules + CSS custom properties
No UI library — hand-crafted dark intelligence-console aesthetic. CSS custom properties flow from `global.css` into every component for consistent theming.

---

## Project Structure

```
gidy-audit/
├── backend/
│   ├── src/
│   │   ├── index.js          # Express app, MongoDB Atlas connection
│   │   ├── models/Log.js     # Mongoose model + indexes
│   │   └── routes/
│   │       ├── logs.js       # CRUD + bulk upload + list endpoint
│   │       └── stats.js      # Aggregation pipeline for dashboard
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/client.js     # Fetch wrapper for all API calls
    │   ├── hooks/useLogs.js  # Data fetching hook with debounce
    │   ├── utils/helpers.js  # Formatters, badge helpers, sample data gen
    │   ├── components/
    │   │   ├── Layout.jsx    # Sidebar navigation shell
    │   │   └── Badges.jsx    # SeverityBadge, StatusBadge
    │   └── pages/
    │       ├── Overview.jsx  # Stats dashboard with Recharts
    │       ├── Logs.jsx      # Main table with filters + detail panel
    │       └── Upload.jsx    # File upload + sample data tools
    └── vite.config.js
```
