/**
 * TEI PACKAGE - Industrial Packaging Portal & Quotation System
 * High-Performance Multi-User Backend Server
 * Built with native Node.js HTTP & native SQLite (node:sqlite)
 * Zero external dependencies required - runs out-of-the-box on Node 22+
 */

const http = require('node:http');
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
}, 60 * 1000);

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

const server = http.createServer(async (req, res) => {
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
      activeConnections: server.connections || 1
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
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
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
});

// Start Server
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
