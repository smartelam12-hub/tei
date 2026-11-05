# TEI PACKAGE (teipackage.com) — Full-Stack Portal & Automated Quotation Engine

A complete corporate web presence, quotation/billing engine, multi-user backend, and automated data retention lifecycle system built for **TEI PACKAGE** (Sipcot Industrial Complex, Hosur, Tamil Nadu) — manufacturers of heavy-duty plastic crates, industrial storage bins, Foldable Large Containers (FLC), plastic pallets, ESD anti-static trays, and custom returnable packaging.

---

## 🌟 Key Features & Systems

### 1. Complete UI & UX Design
- **Industrial Brand Aesthetics**: Polished dark green (`#173b35`), radiant warm gold/amber (`#c58b48`), crisp modern slate cards, responsive layout, and smooth typography.
- **Interactive Product Catalog**: Real-time filtering (Plastic Crates, Part Bins, FLCs, Pallets, ESD Trays) with live search and 1-click **"+ Add to Quote"** functionality.
- **Top Multi-User Server Banner**: Live status indicator displaying real-time database connection (`SQLite WAL Mode`), server uptime, and LAN Network Access address (`http://<LAN-IP>:3000`) for seamless team collaboration.
- **Customer Inquiry & Lead Form**: Direct inquiry submission form connected directly to backend SQLite database with instant toast notifications.

### 2. Quotation & Billing Engine
- **Custom Crate & Labour Estimator**: Multi-size configuration tabs, foam calculation, labour operations (cutting, drilling, welding, painting), dust covers, and netted tape.
- **Multi-Item Tax Invoice**: Dual GST engine (Intra-State CGST 9% + SGST 9% vs Inter-State IGST 18%), HSN codes (`39231090`, `39239090`), freight, discounts, round-off, and automatic Indian Legal Words converter.
- **A4 Formal Proforma Bill Preview**: Pixel-perfect printable bill ready for purchase orders and WhatsApp sharing.
- **Excel / CSV Export & PDF Printing**: Instant 1-click download of `.csv` formatted data or printer-friendly A4 PDF.
- **Database Persistence**: **"💾 Save to Database"** button permanently writes quotes to backend SQLite storage.

### 3. Multi-User Backend & Persistent Database
- **Built on Node.js**: High-performance HTTP REST server running natively with zero external dependencies using Node.js built-ins (`node:http`, `node:sqlite`, `node:fs`, `node:os`).
- **Concurrent SQLite (WAL Mode)**: Configured with `PRAGMA journal_mode = WAL;` allowing simultaneous concurrent read and write operations so multiple factory, sales, and accounts staff can use the portal simultaneously from laptops, desktops, or phones across the local network.
- **REST API Endpoints**:
  - `GET /api/health` — System status, uptime, server time, LAN IP addresses.
  - `GET /api/quotations` — List quotes with search and status filtering.
  - `POST /api/quotations` — Create and persist new quotation.
  - `GET /api/quotations/:id` — Load individual quote into editor.
  - `DELETE /api/quotations/:id` — Delete quote record.
  - `GET /api/inquiries` & `POST /api/inquiries` — Manage incoming leads.
  - `GET /api/retention/status` — Live retention state, countdowns, queue, and audit log.
  - `POST /api/retention/trigger-monthly` — Run monthly purge (deletes first 10 data items).
  - `POST /api/retention/trigger-daily` — Run daily purge (deletes next 1 data item).
  - `POST /api/retention/seed` — Generate sample test records (+25 items).
  - `POST /api/retention/reset-queue` — Reset queue.

### 4. Automated Data Retention & Lifecycle Manager
Configured precisely to meet the automated data lifecycle requirement:
- **Monthly Purge (First 10 Data Items)**:
  - Background daemon runs once every month (or every 30 days).
  - Automatically queries the queue in FIFO order (`ORDER BY id ASC LIMIT 10`) and permanently deletes the earliest 10 records.
  - Emits an entry to `retention_logs` detailing deleted count, deleted IDs, and timestamp.
- **Daily Purge (Next Data Item Day-by-Day)**:
  - Background daemon runs once every 24 hours.
  - Automatically queries the next earliest record (`ORDER BY id ASC LIMIT 1`) and deletes it progressively day-by-day.
  - Emits an entry to `retention_logs`.
- **Interactive UI Control Center**:
  - Digital monospace countdown clocks showing exact time until the next daily and monthly purges.
  - **"⚡ Run Monthly Purge Now"** and **"⚡ Run Daily Purge Now"** buttons for on-demand execution.
  - Visual Queue Monitor with color-coded chip badges (`[Next Daily Purge]`, `[Target for Monthly 10-Purge]`).
  - **"➕ Seed 25 Sample Data Records"** button to easily add test records and verify deletions visually in real time.
  - Complete Audit Trail Table displaying all past deletion events.

---

## 🚀 How to Run the Application

### Option A: Run Full-Stack Server (Recommended for Multi-User Access)
Requires Node.js (v22+ or v26+):

```bash
# In the project directory:
node server.js
# Or using npm:
npm start
```

Once running, the console will display your local and LAN URLs:
```
================================================================
🏭 TEI PACKAGE - Industrial Portal & Quotation Engine Started
🚀 Local Access:         http://localhost:3000
🌐 Multi-User LAN Access: http://192.168.1.X:3000
💾 Database:             SQLite WAL Persistent (data/teipackage.db)
⏰ Auto-Retention:       Active (Monthly Delete 10, Daily Delete Next)
================================================================
```
Share `http://<your-ip>:3000` with coworkers so multiple users can create quotes and manage data together.

### Option B: Standalone Client Mode (Offline / No Server)
- Double-click `index.html` or `quotation.html` in any browser.
- The app automatically switches to LocalStorage client mode without errors.

---

## 📁 Directory Structure
```
teipackage/
├── server.js              # Full-stack Node.js server, REST API & retention daemon
├── package.json           # Project metadata & start script
├── test_engine.js         # Automated test script for database & retention logic
├── data/
│   └── teipackage.db      # Persistent SQLite WAL database file
├── index.html             # Main portal with integrated quotation app, DB hub & retention UI
├── quotation.html         # Standalone full quotation & crate estimator
├── css/
│   └── style.css          # Industrial design system, responsive styles & A4 print CSS
└── js/
    ├── api.js             # Client-side REST API, real-time sync & countdown timers
    ├── quotation.js       # Billing calculations, dual GST, A4 print & PDF generator
    ├── crate-estimator.js # Custom crate labour & materials estimator
    └── main.js            # UI interactions, navigation & category filtering
```
