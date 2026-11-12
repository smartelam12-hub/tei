/**
 * TEI PACKAGE - Industrial Packaging Portal & Quotation System
 * High-Performance Multi-User Backend Server
 * Built with native Node.js HTTP & native SQLite (node:sqlite)
 * Zero external dependencies required - runs out-of-the-box on Node 22+
 */

const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Bind to all network interfaces for LAN multi-user access

// -------------------------------------------------------------
// 1. DATABASE INITIALIZATION & SCHEMA
// -------------------------------------------------------------
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'teipackage.db');
const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for high concurrency multi-user access
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA busy_timeout = 5000;');
db.exec('PRAGMA synchronous = NORMAL;');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS quotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_no TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    company_name TEXT,
    gstin TEXT,
    phone TEXT,
    email TEXT,
    billing_address TEXT,
    shipping_address TEXT,
    tax_type TEXT DEFAULT 'intra',
    items_json TEXT NOT NULL,
    subtotal REAL DEFAULT 0,
    freight REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    cgst REAL DEFAULT 0,
    sgst REAL DEFAULT 0,
    igst REAL DEFAULT 0,
    round_off REAL DEFAULT 0,
    grand_total REAL NOT NULL,
    amount_in_words TEXT,
    status TEXT DEFAULT 'Draft',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    product_interest TEXT,
    quantity INTEGER DEFAULT 1,
    message TEXT,
    status TEXT DEFAULT 'New',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS retention_data_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    reference_code TEXT,
    record_date DATE NOT NULL,
    details TEXT,
    metric_value REAL DEFAULT 0,
    status TEXT DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS retention_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cycle_type TEXT NOT NULL,
    target_table TEXT NOT NULL,
    target_date DATE,
    deleted_count INTEGER NOT NULL,
    deleted_ids TEXT,
    summary TEXT,
    triggered_by TEXT DEFAULT 'Scheduler',
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS retention_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_name TEXT UNIQUE NOT NULL,
    last_run DATETIME,
    next_run DATETIME,
    interval_desc TEXT,
    status TEXT DEFAULT 'Active'
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    dimensions TEXT,
    material TEXT,
    load_capacity TEXT,
    unit_rate REAL NOT NULL,
    hsn TEXT DEFAULT '39231090',
    stock_status TEXT DEFAULT 'In Stock',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    display_name TEXT NOT NULL,
    department TEXT,
    assigned_step INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL
  );

  CREATE TABLE IF NOT EXISTS crate_workflows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quotation_no TEXT UNIQUE NOT NULL,
    quote_date TEXT,
    customer_name TEXT DEFAULT '',
    status TEXT DEFAULT 'IN_PROGRESS',
    step1_data TEXT DEFAULT '{}',
    step1_done INTEGER DEFAULT 0,
    step1_by TEXT,
    step1_at DATETIME,
    step2_data TEXT DEFAULT '{}',
    step2_done INTEGER DEFAULT 0,
    step2_by TEXT,
    step2_at DATETIME,
    step3_data TEXT DEFAULT '{}',
    step3_done INTEGER DEFAULT 0,
    step3_by TEXT,
    step3_at DATETIME,
    step4_data TEXT DEFAULT '{}',
    step4_done INTEGER DEFAULT 0,
    step4_by TEXT,
    step4_at DATETIME,
    remarks_json TEXT DEFAULT '[]',
    approved_by TEXT,
    approved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Safe column migrations if database already existed
try {
  db.exec('ALTER TABLE retention_data_queue ADD COLUMN record_date DATE;');
} catch (e) {}

try {
  db.exec('ALTER TABLE retention_logs ADD COLUMN target_date DATE;');
} catch (e) {}

// Ensure any existing records have a valid record_date
try {
  db.exec("UPDATE retention_data_queue SET record_date = COALESCE(record_date, DATE(created_at), '2026-11-01');");
} catch (e) {}

// Initialize retention schedule
const checkScheduleStmt = db.prepare('SELECT COUNT(*) as count FROM retention_schedule');
const scheduleCount = checkScheduleStmt.get().count;
if (scheduleCount === 0) {
  const insertSched = db.prepare('INSERT INTO retention_schedule (key_name, last_run, next_run, interval_desc) VALUES (?, ?, ?, ?)');
  const now = new Date();
  const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  insertSched.run('ROLLING_DAY_PURGE', now.toISOString(), nextDay.toISOString(), 'Daily progressive deletion of corresponding previous-month day data');
}

// Seed default products if empty
const prodCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
if (prodCount === 0) {
  const insertProd = db.prepare(`
    INSERT INTO products (code, name, category, dimensions, material, load_capacity, unit_rate, hsn)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertProd.run('TEI-CRT-6432', 'TEI Standard Crate (600x400x325 mm)', 'crates', '600 x 400 x 325 mm', 'HDPE Virgin Polymer', '35 kg UDL', 650.00, '39231090');
  insertProd.run('TEI-CRT-5436', 'TEI Medium Crate (540x360x280 mm)', 'crates', '540 x 360 x 280 mm', 'Polypropylene / HDPE', '25 kg UDL', 520.00, '39231090');
  insertProd.run('TEI-CRT-4030', 'TEI Compact Component Crate (400x300x220 mm)', 'crates', '400 x 300 x 220 mm', 'HDPE High Impact', '18 kg UDL', 380.00, '39231090');
  insertProd.run('TEI-BIN-25', 'TEI Industrial Part Bin #25 (250x150x120 mm)', 'bins', '250 x 150 x 120 mm', 'Copolymer Polypropylene', '8 kg', 140.00, '39231090');
  insertProd.run('TEI-BIN-35', 'TEI Industrial Part Bin #35 (350x210x150 mm)', 'bins', '350 x 210 x 150 mm', 'Copolymer Polypropylene', '15 kg', 220.00, '39231090');
  insertProd.run('TEI-FLC-1210', 'TEI Foldable Large Container FLC (1200x1000x975 mm)', 'flc', '1200 x 1000 x 975 mm', 'Structural Foam HDPE', '1,000 kg Payload', 12500.00, '39231090');
  insertProd.run('TEI-PLT-1210', 'TEI Heavy Duty Plastic Pallet (1200x1000x160 mm)', 'pallets', '1200 x 1000 x 160 mm', 'Reinforced HDPE', '4,000 kg Static / 1,200 kg Dynamic', 2450.00, '39239090');
  insertProd.run('TEI-ESD-3520', 'TEI ESD Anti-Static Conductive Tray (350x250x60 mm)', 'esd', '350 x 250 x 60 mm', 'Conductive Polypropylene (10^4 - 10^6 Ohm)', '10 kg', 460.00, '39231090');
}

// Seed initial multi-day November records if empty
const queueCount = db.prepare('SELECT COUNT(*) as count FROM retention_data_queue').get().count;
if (queueCount === 0) {
  seedNovemberSampleData();
}

// -------------------------------------------------------------
// 1B. ROLE-BASED AUTH & MULTI-STAGE WORKFLOW HELPERS
// -------------------------------------------------------------
function hashPassword(password) {
  return crypto.createHash('sha256').update(`TEI_PKG_SALT::${String(password)}`).digest('hex');
}

function safeJsonParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function seedDefaultUsersAndWorkflow() {
  const configuredUsers = [
    {
      role: 'admin1',
      username: 'tei@admin1',
      password: 'teiadmin@43',
      display_name: 'Admin 1 — Customer Desk',
      department: 'Quotation & Customer Details (Form 1)',
      assigned_step: 1
    },
    {
      role: 'admin2',
      username: 'tei@admin2',
      password: 'teiadmins@57',
      display_name: 'Admin 2 — Design Engineer',
      department: 'Crate Dimensions & Fitments (Form 2)',
      assigned_step: 2
    },
    {
      role: 'admin3',
      username: 'tei@admin3',
      password: 'teiadminz@81',
      display_name: 'Admin 3 — Production Estimator',
      department: 'Work / Labour Operations (Form 3)',
      assigned_step: 3
    },
    {
      role: 'admin4',
      username: 'tei@admin4',
      password: 'teiadminx@98',
      display_name: 'Admin 4 — BOM & Material Desk',
      department: 'Material Cost Breakdown (Form 4)',
      assigned_step: 4
    },
    {
      role: 'owner',
      username: 'tei@owner',
      password: 'teiselva@15',
      display_name: 'Owner Admin — Final Approver',
      department: 'Full Analysis, Remarks & Bill Approval',
      assigned_step: 0
    }
  ];

  const findByRole = db.prepare('SELECT id, username, password_hash FROM users WHERE role = ?');
  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, role, display_name, department, assigned_step)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const updateUser = db.prepare(`
    UPDATE users
    SET username = ?, password_hash = ?, display_name = ?, department = ?, assigned_step = ?
    WHERE id = ?
  `);

  for (const cfg of configuredUsers) {
    const pwdHash = hashPassword(cfg.password);
    const existing = findByRole.get(cfg.role);
    if (!existing) {
      insertUser.run(cfg.username, pwdHash, cfg.role, cfg.display_name, cfg.department, cfg.assigned_step);
    } else if (existing.username !== cfg.username || existing.password_hash !== pwdHash) {
      updateUser.run(cfg.username, pwdHash, cfg.display_name, cfg.department, cfg.assigned_step, existing.id);
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(existing.id);
    }
  }

  const wfCount = db.prepare('SELECT COUNT(*) as count FROM crate_workflows').get().count;
  if (wfCount === 0) {
    const step1Demo = {
      quotationNo: 'TEI-WF-001',
      date: '2026-11-12',
      customer: 'Brembo Brake India Pvt Ltd',
      contact: 'R. Rajesh / +91 98400 11223',
      reference: 'RFQ-BREMBO-884',
      address: 'MIDC Chakan Phase II, Pune, Maharashtra 410501'
    };
    const step2Demo = {
      partName: 'Engine Valve Crate Assembly',
      partNo: 'TEI-EV-6040',
      make: 'Tuff',
      odLength: '600',
      odWidth: '400',
      odHeight: '325',
      idLength: '565',
      idWidth: '365',
      idHeight: '310',
      quantity: 25,
      colour: 'Green',
      bottomType: 'Reinforced Mesh',
      hdpeThickness: '3.0',
      xlpeThickness: '10.0',
      sheet1: '560 x 280 x 4',
      nettedTape: 'Yes',
      dustCover: 'Yes',
      plasticLid: 'No',
      rivetMaterial: 'Aluminium 4x12',
      rivetCount: 16,
      screenPrinting: 'Yes',
      cardHolderType: 'Integrated PP',
      cardHolderColour: 'Transparent',
      cardHolderSize: '150 x 100 mm',
      cardHolderPockets: '1'
    };
    const step3Demo = {
      workOps: [
        { id: 'cutting', name: 'Cutting', min: 12, hrs: 0.20, manHrs: 0.20, rate: 150, amount: 30.00 },
        { id: 'drilling', name: 'Drilling', min: 8, hrs: 0.13, manHrs: 0.13, rate: 150, amount: 19.50 },
        { id: 'welding', name: 'Welding', min: 0, hrs: 0, manHrs: 0, rate: 0, amount: 0 },
        { id: 'painting', name: 'Painting', min: 0, hrs: 0, manHrs: 0, rate: 0, amount: 0 },
        { id: 'dcFixing', name: 'DC Fixing', min: 6, hrs: 0.10, manHrs: 0.10, rate: 150, amount: 15.00 },
        { id: 'pasteAdisave', name: 'Paste-Adisave', min: 10, hrs: 0.17, manHrs: 0.17, rate: 150, amount: 25.50 },
        { id: 'grinding', name: 'Grinding', min: 4, hrs: 0.07, manHrs: 0.07, rate: 150, amount: 10.50 },
        { id: 'removing', name: 'Removing', min: 0, hrs: 0, manHrs: 0, rate: 0, amount: 0 },
        { id: 'washingCleaning', name: 'Washing/Cleaning', min: 5, hrs: 0.08, manHrs: 0.08, rate: 150, amount: 12.00 }
      ]
    };
    const step4Demo = {
      materials: [
        { id: 'plasticCrate', name: 'Plastic crate', qty: 1, rate: 580, amount: 580.00 },
        { id: 'hdpeSheet', name: 'HDPE sheet', qty: 1, rate: 120, amount: 120.00 },
        { id: 'xlpeSheet', name: 'XLPE sheet', qty: 2, rate: 85, amount: 170.00 },
        { id: 'nettedTape', name: 'Netted tape', qty: 4, rate: 8, amount: 32.00 },
        { id: 'dustCover', name: 'Dust cover', qty: 1, rate: 75, amount: 75.00 },
        { id: 'rivets', name: 'Rivets', qty: 16, rate: 1.5, amount: 24.00 },
        { id: 'plasticLid', name: 'Plastic lid', qty: 0, rate: 0, amount: 0 },
        { id: 'screenPrinting', name: 'Screen printing', qty: 1, rate: 25, amount: 25.00 },
        { id: 'cardHolder', name: 'Card holder', qty: 1, rate: 35, amount: 35.00 }
      ],
      wastagePercent: 5,
      gstPercent: 18,
      notes: 'Anti-abrasion XLPE partition crate submitted for Owner review.'
    };

    db.prepare(`
      INSERT INTO crate_workflows (
        quotation_no, quote_date, customer_name, status,
        step1_data, step1_done, step1_by, step1_at,
        step2_data, step2_done, step2_by, step2_at,
        step3_data, step3_done, step3_by, step3_at,
        step4_data, step4_done, step4_by, step4_at,
        remarks_json
      ) VALUES (?, ?, ?, ?, ?, 1, 'Admin 1 — Customer Desk', CURRENT_TIMESTAMP, ?, 1, 'Admin 2 — Design Engineer', CURRENT_TIMESTAMP, ?, 1, 'Admin 3 — Production Estimator', CURRENT_TIMESTAMP, ?, 1, 'Admin 4 — BOM & Material Desk', CURRENT_TIMESTAMP, '[]')
    `).run(
      'TEI-WF-001',
      '2026-11-12',
      'Brembo Brake India Pvt Ltd',
      'PENDING_OWNER',
      JSON.stringify(step1Demo),
      JSON.stringify(step2Demo),
      JSON.stringify(step3Demo),
      JSON.stringify(step4Demo)
    );
  }
}

seedDefaultUsersAndWorkflow();

function getAuthUser(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return null;

  const row = db.prepare(`
    SELECT u.id, u.username, u.role, u.display_name, u.department, u.assigned_step, s.expires_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ?
  `).get(token);

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }

  return {
    id: row.id,
    username: row.username,
    role: row.role,
    display_name: row.display_name,
    department: row.department,
    assigned_step: row.assigned_step
  };
}

function computeWorkflowTotals(step2, step3, step4) {
  const workOps = Array.isArray(step3.workOps) ? step3.workOps : [];
  const materials = Array.isArray(step4.materials) ? step4.materials : [];

  let labourTotal = 0;
  for (const op of workOps) {
    const manHrs = parseFloat(op.manHrs) || 0;
    const rate = parseFloat(op.rate) || 0;
    const amt = (op.amount !== undefined && op.amount !== null && op.amount !== '')
      ? (parseFloat(op.amount) || 0)
      : (manHrs * rate);
    labourTotal += amt;
  }

  let materialTotal = 0;
  for (const mat of materials) {
    const qty = parseFloat(mat.qty) || 0;
    const rate = parseFloat(mat.rate) || 0;
    const amt = (mat.amount !== undefined && mat.amount !== null && mat.amount !== '')
      ? (parseFloat(mat.amount) || 0)
      : (qty * rate);
    materialTotal += amt;
  }

  const unitCost = materialTotal + labourTotal;
  const qty = Math.max(1, parseFloat(step2.quantity) || 1);
  const subtotal = unitCost * qty;
  const gstRate = parseFloat(step4.gstPercent) || 0;
  const gstAmount = subtotal * (gstRate / 100);
  const grandTotal = subtotal + gstAmount;

  return {
    labourTotal: Number(labourTotal.toFixed(2)),
    materialTotal: Number(materialTotal.toFixed(2)),
    unitCost: Number(unitCost.toFixed(2)),
    qty,
    subtotal: Number(subtotal.toFixed(2)),
    gstRate,
    gstAmount: Number(gstAmount.toFixed(2)),
    grandTotal: Number(grandTotal.toFixed(2))
  };
}

function deriveWorkflowStatus(row, remarks) {
  if (row.status === 'APPROVED') return 'APPROVED';
  const hasOpenRemark = Array.isArray(remarks) && remarks.some(r => !r.resolved);
  if (hasOpenRemark) return 'REMARKED';
  if (row.step1_done && row.step2_done && row.step3_done) return 'PENDING_OWNER';
  return 'IN_PROGRESS';
}

function formatWorkflowRow(row) {
  const step1 = safeJsonParse(row.step1_data, {});
  const step2 = safeJsonParse(row.step2_data, {});
  const step3 = safeJsonParse(row.step3_data, {});
  const step4 = safeJsonParse(row.step4_data, {});
  const remarks = safeJsonParse(row.remarks_json, []);
  const totals = computeWorkflowTotals(step2, step3, step4);

  return {
    id: row.id,
    quotationNo: row.quotation_no,
    quoteDate: row.quote_date || step1.date || '',
    customerName: row.customer_name || step1.customer || '',
    status: row.status,
    step1_done: Boolean(row.step1_done),
    step1_by: row.step1_by,
    step1_at: row.step1_at,
    step1,
    step2_done: Boolean(row.step2_done),
    step2_by: row.step2_by,
    step2_at: row.step2_at,
    step2,
    step3_done: Boolean(row.step3_done),
    step3_by: row.step3_by,
    step3_at: row.step3_at,
    step3,
    step4_done: Boolean(row.step4_done),
    step4_by: row.step4_by,
    step4_at: row.step4_at,
    step4,
    remarks,
    openRemarks: remarks.filter(r => !r.resolved),
    totals,
    approved_by: row.approved_by,
    approved_at: row.approved_at,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function syncApprovedWorkflowToQuotation(formattedWf) {
  const s1 = formattedWf.step1 || {};
  const s2 = formattedWf.step2 || {};
  const t = formattedWf.totals;
  const cgst = Number((t.gstAmount / 2).toFixed(2));
  const sgst = Number((t.gstAmount / 2).toFixed(2));
  const dims = `${s2.odLength || '-'}x${s2.odWidth || '-'}x${s2.odHeight || '-'} mm`;
  const itemLine = {
    code: s2.partNo || formattedWf.quotationNo,
    description: `${s2.partName || 'Custom Industrial Crate'} (${dims}, ${s2.make || 'TEI'} ${s2.colour || ''})`,
    hsn: '39231090',
    qty: t.qty,
    unit: 'Nos',
    rate: t.unitCost,
    amount: t.subtotal
  };

  db.prepare(`
    INSERT INTO quotations (
      quote_no, customer_name, company_name, phone, shipping_address,
      tax_type, items_json, subtotal, cgst, sgst, grand_total, status, notes, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'intra', ?, ?, ?, ?, ?, 'Approved', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(quote_no) DO UPDATE SET
      customer_name = excluded.customer_name,
      company_name = excluded.company_name,
      phone = excluded.phone,
      shipping_address = excluded.shipping_address,
      items_json = excluded.items_json,
      subtotal = excluded.subtotal,
      cgst = excluded.cgst,
      sgst = excluded.sgst,
      grand_total = excluded.grand_total,
      status = 'Approved',
      notes = excluded.notes,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    formattedWf.quotationNo,
    s1.customer || formattedWf.customerName || 'Valued Client',
    s1.customer || '',
    s1.contact || '',
    s1.address || '',
    JSON.stringify([itemLine]),
    t.subtotal,
    cgst,
    sgst,
    t.grandTotal,
    `Owner Approved by ${formattedWf.approved_by || 'Owner Admin'}`
  );
}

/**
 * Seeds sample records across multiple November dates
 * E.g. Nov 01 (5 records), Nov 02 (4 records), Nov 03 (6 records), Nov 04 (5 records), Nov 05 (4 records)
 */
function seedNovemberSampleData() {
  const insert = db.prepare(`
    INSERT INTO retention_data_queue (title, category, reference_code, record_date, details, metric_value)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const daysPlan = [
    { date: '2026-11-01', count: 5, label: 'Nov 01' },
    { date: '2026-11-02', count: 4, label: 'Nov 02' },
    { date: '2026-11-03', count: 6, label: 'Nov 03' },
    { date: '2026-11-04', count: 5, label: 'Nov 04' },
    { date: '2026-11-05', count: 4, label: 'Nov 05' }
  ];

  const categories = ['Dispatch Record', 'Material Batch', 'Intra-Plant Transit', 'Gate Pass Entry', 'Quality Inspection'];
  let totalSeeded = 0;

  for (const day of daysPlan) {
    for (let i = 1; i <= day.count; i++) {
      totalSeeded++;
      const cat = categories[i % categories.length];
      const code = `TEI-${day.label.replace(' ', '')}-${100 + i}`;
      insert.run(
        `${cat} (${day.label} #${i})`,
        cat,
        code,
        day.date,
        `Automated production telemetry registered on ${day.date} [Batch #${i}].`,
        Math.round((60 + (i * 15)) * 100) / 100
      );
    }
  }

  return totalSeeded;
}

// -------------------------------------------------------------
// 2. AUTOMATED ROLLING DAY-BY-DAY RETENTION ENGINE
// -------------------------------------------------------------
/**
 * Calculates the exact matching date from the previous month.
 * Example:
 *   Dec 01 (2026-12-01) -> Nov 01 (2026-11-01)
 *   Dec 02 (2026-12-02) -> Nov 02 (2026-11-02)
 *   Dec 03 (2026-12-03) -> Nov 03 (2026-11-03)
 */
function getPreviousMonthDate(currentDateStr) {
  const parts = currentDateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10); // 1-12
  const day = parseInt(parts[2], 10);

  // Previous month calculation
  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }

  // Days in previous month (handles leap year / 30 vs 31 days)
  const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
  const prevDay = Math.min(day, daysInPrevMonth);

  const mStr = String(prevMonth).padStart(2, '0');
  const dStr = String(prevDay).padStart(2, '0');
  return `${prevYear}-${mStr}-${dStr}`;
}

/**
 * Executes Rolling Day-by-Day Purge:
 * When executed on date `currentDateStr` (e.g. Dec 1),
 * it queries and deletes all data registered on the corresponding previous month day (e.g. Nov 1).
 */
function executeRollingDayPurge(currentDateStr, triggeredBy = 'Auto-Scheduler') {
  try {
    // If not supplied, default to today's date in YYYY-MM-DD
    const effectiveCurrentDate = currentDateStr || new Date().toISOString().split('T')[0];
    const targetDate = getPreviousMonthDate(effectiveCurrentDate);

    // 1. Fetch all records registered on targetDate
    const candidateRows = db.prepare(`
      SELECT id, title, reference_code, record_date FROM retention_data_queue
      WHERE record_date = ?
      ORDER BY id ASC
    `).all(targetDate);

    if (candidateRows.length === 0) {
      const summary = `Rolling Day Purge on ${effectiveCurrentDate}: No data found for previous month's date (${targetDate}).`;
      console.log(`[RETENTION] ${summary}`);
      return {
        success: true,
        count: 0,
        currentDate: effectiveCurrentDate,
        targetDate,
        message: summary
      };
    }

    const idsToDelete = candidateRows.map(r => r.id);
    const placeholders = idsToDelete.map(() => '?').join(',');

    // 2. Delete all records for that date
    db.prepare(`DELETE FROM retention_data_queue WHERE id IN (${placeholders})`).run(...idsToDelete);

    // 3. Log to audit trail
    const summary = `Rolling Day Purge (Run for ${effectiveCurrentDate}): Permanently deleted all ${idsToDelete.length} records registered on previous month's day (${targetDate}). IDs: [${idsToDelete.join(', ')}]`;
    
    db.prepare(`
      INSERT INTO retention_logs (cycle_type, target_table, target_date, deleted_count, deleted_ids, summary, triggered_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('ROLLING_MONTH_DAY', 'retention_data_queue', targetDate, idsToDelete.length, JSON.stringify(idsToDelete), summary, triggeredBy);

    // 4. Update schedule next run (24 hours)
    const now = new Date();
    const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    db.prepare(`
      UPDATE retention_schedule
      SET last_run = ?, next_run = ?
      WHERE key_name = 'ROLLING_DAY_PURGE'
    `).run(now.toISOString(), nextDay.toISOString());

    console.log(`[RETENTION SUCCESS] ${summary} [By: ${triggeredBy}]`);
    return {
      success: true,
      count: idsToDelete.length,
      currentDate: effectiveCurrentDate,
      targetDate,
      ids: idsToDelete,
      summary
    };
  } catch (err) {
    console.error('[RETENTION ERROR - Rolling Day Purge]:', err);
    return { success: false, error: err.message };
  }
}

// Background scheduler interval (checks every 60 seconds)
setInterval(() => {
  try {
    const schedule = db.prepare("SELECT * FROM retention_schedule WHERE key_name = 'ROLLING_DAY_PURGE'").get();
    if (schedule && schedule.next_run) {
      const now = new Date();
      if (now >= new Date(schedule.next_run)) {
        console.log('[AUTO-SCHEDULER] Triggering scheduled Rolling Day-by-Day Purge...');
        executeRollingDayPurge(null, 'Auto-Scheduler');
      }
    }
  } catch (err) {
    console.error('[AUTO-SCHEDULER ERROR]:', err);
  }
}, 60 * 1000).unref();

// -------------------------------------------------------------
// 3. HTTP SERVER & REST API IMPLEMENTATION
// -------------------------------------------------------------
function getLocalNetworkIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.csv': 'text/csv; charset=UTF-8',
  '.txt': 'text/plain; charset=UTF-8'
};

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function parseJSONBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', reject);
  });
}

let server = null;

async function handleRequest(req, res) {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // 1. Health & Server Status
  if (pathname === '/api/health' && req.method === 'GET') {
    const stats = {
      status: 'online',
      serverTime: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: 'SQLite (WAL Mode Enabled)',
      localNetworkIPs: getLocalNetworkIPs(),
      activeConnections: server ? (server.connections || 1) : 1
    };
    return sendJSON(res, 200, stats);
  }

  // 2. Quotations API
  if (pathname === '/api/quotations') {
    if (req.method === 'GET') {
      try {
        const search = url.searchParams.get('search') || '';
        const status = url.searchParams.get('status') || '';
        let query = 'SELECT * FROM quotations WHERE 1=1';
        const params = [];

        if (search) {
          query += ' AND (quote_no LIKE ? OR customer_name LIKE ? OR company_name LIKE ?)';
          params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (status) {
          query += ' AND status = ?';
          params.push(status);
        }
        query += ' ORDER BY id DESC LIMIT 100';

        const rows = db.prepare(query).all(...params);
        return sendJSON(res, 200, { success: true, count: rows.length, data: rows });
      } catch (err) {
        return sendJSON(res, 500, { success: false, error: err.message });
      }
    }

    if (req.method === 'POST') {
      try {
        const body = await parseJSONBody(req);
        if (!body.customer_name || !body.grand_total) {
          return sendJSON(res, 400, { success: false, error: 'Customer Name and Grand Total are required' });
        }

        const quoteNo = body.quote_no || `TEI/QT/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`;

        const stmt = db.prepare(`
          INSERT INTO quotations (
            quote_no, customer_name, company_name, gstin, phone, email,
            billing_address, shipping_address, tax_type, items_json,
            subtotal, freight, discount, cgst, sgst, igst, round_off,
            grand_total, amount_in_words, status, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
          quoteNo,
          body.customer_name,
          body.company_name || '',
          body.gstin || '',
          body.phone || '',
          body.email || '',
          body.billing_address || '',
          body.shipping_address || '',
          body.tax_type || 'intra',
          typeof body.items_json === 'string' ? body.items_json : JSON.stringify(body.items || []),
          body.subtotal || 0,
          body.freight || 0,
          body.discount || 0,
          body.cgst || 0,
          body.sgst || 0,
          body.igst || 0,
          body.round_off || 0,
          body.grand_total,
          body.amount_in_words || '',
          body.status || 'Draft',
          body.notes || ''
        );

        return sendJSON(res, 201, {
          success: true,
          id: result.lastInsertRowid,
          quote_no: quoteNo,
          message: `Quotation ${quoteNo} saved to database successfully!`
        });
      } catch (err) {
        return sendJSON(res, 500, { success: false, error: err.message });
      }
    }
  }

  // Single Quotation Operations
  const quoteMatch = pathname.match(/^\/api\/quotations\/(\d+)$/);
  if (quoteMatch) {
    const id = parseInt(quoteMatch[1], 10);
    if (req.method === 'GET') {
      const quote = db.prepare('SELECT * FROM quotations WHERE id = ?').get(id);
      if (!quote) return sendJSON(res, 404, { success: false, error: 'Quotation not found' });
      return sendJSON(res, 200, { success: true, data: quote });
    }
    if (req.method === 'DELETE') {
      db.prepare('DELETE FROM quotations WHERE id = ?').run(id);
      return sendJSON(res, 200, { success: true, message: `Quotation #${id} deleted successfully` });
    }
    if (req.method === 'PUT') {
      try {
        const body = await parseJSONBody(req);
        db.prepare(`
          UPDATE quotations SET
            status = COALESCE(?, status),
            notes = COALESCE(?, notes),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(body.status || null, body.notes || null, id);
        return sendJSON(res, 200, { success: true, message: `Quotation #${id} updated` });
      } catch (err) {
        return sendJSON(res, 500, { success: false, error: err.message });
      }
    }
  }

  // 3. Inquiries API
  if (pathname === '/api/inquiries') {
    if (req.method === 'GET') {
      const inquiries = db.prepare('SELECT * FROM inquiries ORDER BY id DESC LIMIT 100').all();
      return sendJSON(res, 200, { success: true, data: inquiries });
    }
    if (req.method === 'POST') {
      try {
        const body = await parseJSONBody(req);
        if (!body.name || !body.phone) {
          return sendJSON(res, 400, { success: false, error: 'Name and Phone number are required' });
        }
        const stmt = db.prepare(`
          INSERT INTO inquiries (name, company, email, phone, product_interest, quantity, message)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
          body.name,
          body.company || '',
          body.email || '',
          body.phone,
          body.product_interest || 'Plastic Crates',
          parseInt(body.quantity, 10) || 50,
          body.message || ''
        );
        return sendJSON(res, 201, {
          success: true,
          id: result.lastInsertRowid,
          message: 'Thank you! Your industrial inquiry has been registered. Our Hosur sales engineering team will contact you shortly.'
        });
      } catch (err) {
        return sendJSON(res, 500, { success: false, error: err.message });
      }
    }
  }

  // 4. Products API
  if (pathname === '/api/products' && req.method === 'GET') {
    const products = db.prepare('SELECT * FROM products ORDER BY id ASC').all();
    return sendJSON(res, 200, { success: true, data: products });
  }

  // -------------------------------------------------------------
  // 5. ROLLING DAY-BY-DAY DATA RETENTION API
  // -------------------------------------------------------------

  // Get status, grouped date records, next runs, and audit logs
  if (pathname === '/api/retention/status' && req.method === 'GET') {
    const schedule = db.prepare("SELECT * FROM retention_schedule WHERE key_name = 'ROLLING_DAY_PURGE'").get();
    const queueTotal = db.prepare('SELECT COUNT(*) as count FROM retention_data_queue').get().count;

    // Get date groups (e.g. 2026-11-01: 5 items, 2026-11-02: 4 items)
    const dateGroups = db.prepare(`
      SELECT record_date, COUNT(*) as count
      FROM retention_data_queue
      GROUP BY record_date
      ORDER BY record_date ASC
    `).all();

    const sampleItems = db.prepare(`
      SELECT id, title, reference_code, record_date, category
      FROM retention_data_queue
      ORDER BY record_date ASC, id ASC
      LIMIT 30
    `).all();

    const recentLogs = db.prepare('SELECT * FROM retention_logs ORDER BY id DESC LIMIT 15').all();

    // Default simulation date is today (e.g. 2026-12-01)
    const today = new Date().toISOString().split('T')[0];
    const targetDate = getPreviousMonthDate(today);

    return sendJSON(res, 200, {
      success: true,
      queueTotal,
      schedule,
      today,
      targetDate,
      dateGroups,
      nextCandidates: sampleItems,
      recentLogs
    });
  }

  // Execute Rolling Day-by-Day Purge for a specific date (e.g. Dec 01 -> deletes Nov 01 data)
  if (pathname === '/api/retention/trigger-rolling-day' && req.method === 'POST') {
    try {
      const body = await parseJSONBody(req);
      const simDate = body.currentDate || new Date().toISOString().split('T')[0];
      const result = executeRollingDayPurge(simDate, body.triggeredBy || 'Manual Web Trigger');
      return sendJSON(res, 200, result);
    } catch (err) {
      return sendJSON(res, 500, { success: false, error: err.message });
    }
  }

  // Seed sample November multi-day data (Nov 1 to Nov 5)
  if (pathname === '/api/retention/seed-november' && req.method === 'POST') {
    try {
      const count = seedNovemberSampleData();
      const newTotal = db.prepare('SELECT COUNT(*) as count FROM retention_data_queue').get().count;
      return sendJSON(res, 200, {
        success: true,
        message: `Successfully seeded multi-day November test records (+${count} items across Nov 1 - Nov 5). Total queue: ${newTotal}.`,
        queueTotal: newTotal
      });
    } catch (err) {
      return sendJSON(res, 500, { success: false, error: err.message });
    }
  }

  // Reset Queue
  if (pathname === '/api/retention/reset-queue' && req.method === 'POST') {
    db.prepare('DELETE FROM retention_data_queue').run();
    seedNovemberSampleData();
    const count = db.prepare('SELECT COUNT(*) as count FROM retention_data_queue').get().count;
    return sendJSON(res, 200, {
      success: true,
      message: 'Queue reset with fresh multi-day November test data (Nov 01 - Nov 05).',
      queueTotal: count
    });
  }

  // -------------------------------------------------------------
  // 5B. ROLE-BASED AUTHENTICATION API (/api/auth/*)
  // -------------------------------------------------------------
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    try {
      const body = await parseJSONBody(req);
      const username = String(body.username || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!username || !password) {
        return sendJSON(res, 400, { success: false, error: 'Username and password are required.' });
      }

      const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = ?').get(username);
      if (!user || user.password_hash !== hashPassword(password)) {
        return sendJSON(res, 401, { success: false, error: 'Invalid username or password.' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, user.id, expiresAt);

      return sendJSON(res, 200, {
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          display_name: user.display_name,
          department: user.department,
          assigned_step: user.assigned_step
        }
      });
    } catch (err) {
      return sendJSON(res, 500, { success: false, error: err.message });
    }
  }

  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const user = getAuthUser(req);
    if (!user) {
      return sendJSON(res, 401, { success: false, error: 'Unauthorized or session expired.' });
    }

    const workflows = db.prepare('SELECT remarks_json, status FROM crate_workflows').all();
    let pendingRemarksCount = 0;
    for (const wf of workflows) {
      const remarks = safeJsonParse(wf.remarks_json, []);
      if (user.role === 'owner') {
        if (wf.status === 'PENDING_OWNER') pendingRemarksCount++;
      } else {
        pendingRemarksCount += remarks.filter(r => !r.resolved && r.targetAdmin === user.role).length;
      }
    }

    return sendJSON(res, 200, { success: true, user, pendingCount: pendingRemarksCount });
  }

  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (token) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    }
    return sendJSON(res, 200, { success: true, message: 'Logged out.' });
  }

  // -------------------------------------------------------------
  // 5C. MULTI-ADMIN QUOTATION WORKFLOW API (/api/workflows/*)
  // -------------------------------------------------------------
  if (pathname === '/api/workflows' && req.method === 'GET') {
    const user = getAuthUser(req);
    if (!user) return sendJSON(res, 401, { success: false, error: 'Authentication required.' });

    const rows = db.prepare('SELECT * FROM crate_workflows ORDER BY updated_at DESC, id DESC').all();
    const formatted = rows.map(formatWorkflowRow);
    return sendJSON(res, 200, { success: true, count: formatted.length, workflows: formatted });
  }

  if (pathname === '/api/workflows' && req.method === 'POST') {
    const user = getAuthUser(req);
    if (!user) return sendJSON(res, 401, { success: false, error: 'Authentication required.' });
    if (user.role !== 'admin1' && user.role !== 'owner') {
      return sendJSON(res, 403, { success: false, error: 'Only Admin 1 or Owner Admin can create a new quotation workflow.' });
    }

    try {
      const body = await parseJSONBody(req);
      const step1 = body.step1 || {};
      const nextNum = (db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM crate_workflows').get().nextId) || 1;
      const quotationNo = String(step1.quotationNo || body.quotationNo || `TEI-WF-${String(nextNum).padStart(3, '0')}`).trim();
      const quoteDate = String(step1.date || new Date().toISOString().split('T')[0]);
      const customerName = String(step1.customer || '').trim();
      const step1Done = customerName ? 1 : 0;

      const result = db.prepare(`
        INSERT INTO crate_workflows (
          quotation_no, quote_date, customer_name, status,
          step1_data, step1_done, step1_by, step1_at
        ) VALUES (?, ?, ?, 'IN_PROGRESS', ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        quotationNo,
        quoteDate,
        customerName,
        JSON.stringify({ ...step1, quotationNo, date: quoteDate }),
        step1Done,
        user.display_name
      );

      const created = db.prepare('SELECT * FROM crate_workflows WHERE id = ?').get(result.lastInsertRowid);
      return sendJSON(res, 201, { success: true, workflow: formatWorkflowRow(created) });
    } catch (err) {
      const msg = String(err.message || '');
      const status = msg.includes('UNIQUE') ? 409 : 500;
      return sendJSON(res, status, { success: false, error: status === 409 ? 'Quotation No. already exists.' : msg });
    }
  }

  const wfStepMatch = pathname.match(/^\/api\/workflows\/(\d+)\/step$/);
  if (wfStepMatch && req.method === 'PUT') {
    const user = getAuthUser(req);
    if (!user) return sendJSON(res, 401, { success: false, error: 'Authentication required.' });

    const id = parseInt(wfStepMatch[1], 10);
    const existing = db.prepare('SELECT * FROM crate_workflows WHERE id = ?').get(id);
    if (!existing) return sendJSON(res, 404, { success: false, error: 'Workflow not found.' });

    try {
      const body = await parseJSONBody(req);
      const step = parseInt(body.step, 10);
      if (![1, 2, 3, 4].includes(step)) {
        return sendJSON(res, 400, { success: false, error: 'Invalid step number (must be 1, 2, 3, or 4).' });
      }

      if (user.role !== 'owner' && user.role !== `admin${step}`) {
        return sendJSON(res, 403, {
          success: false,
          error: `Access denied: ${user.display_name} can only update Form ${user.assigned_step}, not Form ${step}.`
        });
      }

      if (existing.status === 'APPROVED' && user.role !== 'owner') {
        return sendJSON(res, 403, { success: false, error: 'This quotation bill is already approved by the Owner and locked.' });
      }

      const data = body.data || {};
      const dataCol = `step${step}_data`;
      const doneCol = `step${step}_done`;
      const byCol = `step${step}_by`;
      const atCol = `step${step}_at`;

      const remarks = safeJsonParse(existing.remarks_json, []);
      const targetRole = `admin${step}`;
      const nowIso = new Date().toISOString();
      let resolvedCount = 0;
      const updatedRemarks = remarks.map(r => {
        if (!r.resolved && r.targetAdmin === targetRole) {
          resolvedCount++;
          return { ...r, resolved: true, resolvedBy: user.display_name, resolvedAt: nowIso };
        }
        return r;
      });

      const simulatedRow = {
        ...existing,
        [dataCol]: JSON.stringify(data),
        [doneCol]: 1
      };
      const newStatus = deriveWorkflowStatus(simulatedRow, updatedRemarks);

      let quotationNo = existing.quotation_no;
      let quoteDate = existing.quote_date;
      let customerName = existing.customer_name;
      if (step === 1) {
        if (data.quotationNo) quotationNo = String(data.quotationNo).trim();
        if (data.date) quoteDate = String(data.date);
        if (data.customer !== undefined) customerName = String(data.customer).trim();
      }

      db.prepare(`
        UPDATE crate_workflows SET
          quotation_no = ?,
          quote_date = ?,
          customer_name = ?,
          ${dataCol} = ?,
          ${doneCol} = 1,
          ${byCol} = ?,
          ${atCol} = CURRENT_TIMESTAMP,
          remarks_json = ?,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        quotationNo,
        quoteDate,
        customerName,
        JSON.stringify(data),
        user.display_name,
        JSON.stringify(updatedRemarks),
        newStatus,
        id
      );

      const updated = formatWorkflowRow(db.prepare('SELECT * FROM crate_workflows WHERE id = ?').get(id));
      return sendJSON(res, 200, {
        success: true,
        resolvedRemarks: resolvedCount,
        message: resolvedCount > 0
          ? `Form ${step} updated and ${resolvedCount} Owner remark(s) marked resolved.`
          : `Form ${step} saved successfully.`,
        workflow: updated
      });
    } catch (err) {
      return sendJSON(res, 500, { success: false, error: err.message });
    }
  }

  const wfRemarkMatch = pathname.match(/^\/api\/workflows\/(\d+)\/remark$/);
  if (wfRemarkMatch && req.method === 'POST') {
    const user = getAuthUser(req);
    if (!user) return sendJSON(res, 401, { success: false, error: 'Authentication required.' });
    if (user.role !== 'owner') {
      return sendJSON(res, 403, { success: false, error: 'Only Owner Admin can issue remarks to admins.' });
    }

    const id = parseInt(wfRemarkMatch[1], 10);
    const existing = db.prepare('SELECT * FROM crate_workflows WHERE id = ?').get(id);
    if (!existing) return sendJSON(res, 404, { success: false, error: 'Workflow not found.' });

    try {
      const body = await parseJSONBody(req);
      const targetAdmin = String(body.targetAdmin || '').trim();
      const message = String(body.message || '').trim();

      if (!['admin1', 'admin2', 'admin3', 'admin4'].includes(targetAdmin)) {
        return sendJSON(res, 400, { success: false, error: 'targetAdmin must be admin1, admin2, admin3, or admin4.' });
      }
      if (!message) {
        return sendJSON(res, 400, { success: false, error: 'Remark message is required.' });
      }

      const remarks = safeJsonParse(existing.remarks_json, []);
      remarks.push({
        id: `RMK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        targetAdmin,
        message,
        createdBy: user.display_name,
        createdAt: new Date().toISOString(),
        resolved: false
      });

      db.prepare(`
        UPDATE crate_workflows SET
          remarks_json = ?,
          status = 'REMARKED',
          approved_by = NULL,
          approved_at = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(JSON.stringify(remarks), id);

      const updated = formatWorkflowRow(db.prepare('SELECT * FROM crate_workflows WHERE id = ?').get(id));
      return sendJSON(res, 200, {
        success: true,
        message: `Remark sent to ${targetAdmin.toUpperCase()} to refill and correct.`,
        workflow: updated
      });
    } catch (err) {
      return sendJSON(res, 500, { success: false, error: err.message });
    }
  }

  const wfApproveMatch = pathname.match(/^\/api\/workflows\/(\d+)\/approve$/);
  if (wfApproveMatch && req.method === 'POST') {
    const user = getAuthUser(req);
    if (!user) return sendJSON(res, 401, { success: false, error: 'Authentication required.' });
    if (user.role !== 'owner') {
      return sendJSON(res, 403, { success: false, error: 'Only Owner Admin can grant final bill approval.' });
    }

    const id = parseInt(wfApproveMatch[1], 10);
    const existing = db.prepare('SELECT * FROM crate_workflows WHERE id = ?').get(id);
    if (!existing) return sendJSON(res, 404, { success: false, error: 'Workflow not found.' });

    const remarks = safeJsonParse(existing.remarks_json, []);
    const openRemarks = remarks.filter(r => !r.resolved);
    if (openRemarks.length > 0) {
      return sendJSON(res, 400, {
        success: false,
        error: `Cannot approve yet: ${openRemarks.length} unresolved remark(s) still awaiting admin correction.`
      });
    }

    db.prepare(`
      UPDATE crate_workflows SET
        status = 'APPROVED',
        approved_by = ?,
        approved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(user.display_name, id);

    const updated = formatWorkflowRow(db.prepare('SELECT * FROM crate_workflows WHERE id = ?').get(id));
    syncApprovedWorkflowToQuotation(updated);

    return sendJSON(res, 200, {
      success: true,
      message: `Bill ${updated.quotationNo} officially approved and synced to Live Database.`,
      workflow: updated
    });
  }

  const wfSingleMatch = pathname.match(/^\/api\/workflows\/(\d+)$/);
  if (wfSingleMatch && req.method === 'GET') {
    const user = getAuthUser(req);
    if (!user) return sendJSON(res, 401, { success: false, error: 'Authentication required.' });

    const id = parseInt(wfSingleMatch[1], 10);
    const row = db.prepare('SELECT * FROM crate_workflows WHERE id = ?').get(id);
    if (!row) return sendJSON(res, 404, { success: false, error: 'Workflow not found.' });
    return sendJSON(res, 200, { success: true, workflow: formatWorkflowRow(row) });
  }

  // -------------------------------------------------------------
  // 6. STATIC FILE SERVING
  // -------------------------------------------------------------
  let filePath = path.join(__dirname, 'teipackage', pathname === '/' ? 'index.html' : pathname);

  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': (ext === '.html' || ext === '.css' || ext === '.js')
        ? 'no-cache, must-revalidate'
        : 'public, max-age=3600'
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    const indexPath = path.join(__dirname, 'teipackage', 'index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
      fs.createReadStream(indexPath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  }
}

server = http.createServer(handleRequest);

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    const localIPs = getLocalNetworkIPs();
    console.log('================================================================');
    console.log('🏭 TEI PACKAGE - Industrial Portal & Quotation Engine Started');
    console.log(`🚀 Local Access:         http://localhost:${PORT}`);
    localIPs.forEach(ip => {
      console.log(`🌐 Multi-User LAN Access: http://${ip}:${PORT}`);
    });
    console.log('💾 Database:             SQLite WAL Persistent (data/teipackage.db)');
    console.log('⏰ Auto-Retention:       Rolling Day-by-Day (Dec 1 purges Nov 1, Dec 2 purges Nov 2...)');
    console.log('================================================================');
  });
}

module.exports = { db, handleRequest, hashPassword };
