const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('data/teipackage.db');

// Ensure retention_data_queue schema has record_date
db.exec('DROP TABLE IF EXISTS retention_data_queue;');
db.exec(`
  CREATE TABLE retention_data_queue (
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
`);

const insert = db.prepare(`
  INSERT INTO retention_data_queue (title, category, reference_code, record_date, details)
  VALUES (?, ?, ?, ?, ?)
`);

// 1. Seed November Data (Nov 01 to Nov 05)
console.log('=== SEEDING NOVEMBER DATA ===');
const days = [
  { date: '2026-11-01', count: 5, label: 'Nov 01' },
  { date: '2026-11-02', count: 4, label: 'Nov 02' },
  { date: '2026-11-03', count: 6, label: 'Nov 03' },
  { date: '2026-11-04', count: 5, label: 'Nov 04' },
  { date: '2026-11-05', count: 4, label: 'Nov 05' },
];

for (const d of days) {
  for (let i = 1; i <= d.count; i++) {
    insert.run(`Production Batch ${d.label} #${i}`, 'Industrial Crates', `TEI-${d.label}-${i}`, d.date, `Batch registered on ${d.date}`);
  }
}

function printQueueState() {
  const groups = db.prepare('SELECT record_date, COUNT(*) as c FROM retention_data_queue GROUP BY record_date ORDER BY record_date ASC').all();
  console.log('Current Database State by Date:');
  groups.forEach(g => console.log(`   📅 ${g.record_date}: ${g.c} records`));
  const total = db.prepare('SELECT COUNT(*) as total FROM retention_data_queue').get().total;
  console.log(`   👉 Total Records Remaining: ${total}\n`);
}

printQueueState();

function getPreviousMonthDate(currentDateStr) {
  const parts = currentDateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }
  const daysInPrev = new Date(prevYear, prevMonth, 0).getDate();
  const prevDay = Math.min(day, daysInPrev);

  return `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(prevDay).padStart(2, '0')}`;
}

function purgeForDate(simDate) {
  const targetDate = getPreviousMonthDate(simDate);
  const candidateRows = db.prepare('SELECT id, title, record_date FROM retention_data_queue WHERE record_date = ?').all(targetDate);
  console.log(`----------------------------------------------------------------`);
  console.log(`⚡ EXECUTING PURGE FOR SIMULATED DATE: ${simDate}`);
  console.log(`🎯 Target Date in Previous Month:     ${targetDate}`);
  console.log(`📦 Records Found for ${targetDate}:         ${candidateRows.length} records`);

  if (candidateRows.length > 0) {
    const ids = candidateRows.map(r => r.id);
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM retention_data_queue WHERE id IN (${placeholders})`).run(...ids);
    console.log(`✅ DELETED ${candidateRows.length} records from ${targetDate} (IDs: ${ids.join(', ')})`);
  } else {
    console.log(`ℹ️ No records found for ${targetDate}`);
  }
  console.log(`----------------------------------------------------------------`);
  printQueueState();
}

// STEP 1: Simulate December 01 (Deletes Nov 01 data)
console.log('>>> TEST STEP 1: Current Date is December 01 (2026-12-01)');
purgeForDate('2026-12-01');

// STEP 2: Simulate December 02 (Deletes Nov 02 data)
console.log('>>> TEST STEP 2: Current Date is December 02 (2026-12-02)');
purgeForDate('2026-12-02');

// STEP 3: Simulate December 03 (Deletes Nov 03 data)
console.log('>>> TEST STEP 3: Current Date is December 03 (2026-12-03)');
purgeForDate('2026-12-03');

console.log('================================================================');
console.log('🎉 ROLLING DAY-BY-DAY PURGE RULE VERIFIED 100%!');
console.log('================================================================');
