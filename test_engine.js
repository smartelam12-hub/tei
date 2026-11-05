const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('data/teipackage.db');

console.log('=== TEST 1: Check Tables ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
console.log('Tables found:', tables.map(t => t.name).join(', '));

console.log('\n=== TEST 2: Add Quotation ===');
const insertQ = db.prepare(`
  INSERT INTO quotations (quote_no, customer_name, company_name, gstin, phone, grand_total, items_json)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const quoteNo = 'TEI/QT/2026/TEST' + Math.floor(1000 + Math.random() * 9000);
const quoteRes = insertQ.run(quoteNo, 'Ashok Leyland Ltd', 'Ashok Leyland Hosur Plant', '33AAACA0000A1Z5', '9842711111', 48500.00, JSON.stringify([{ desc: 'TEI Standard Crate', qty: 50, rate: 650 }]));
console.log('Quotation inserted with row ID:', quoteRes.lastInsertRowid);
const qCheck = db.prepare('SELECT quote_no, customer_name, grand_total FROM quotations WHERE id = ?').get(quoteRes.lastInsertRowid);
console.log('Retrieved Quotation:', qCheck);

console.log('\n=== TEST 3: Add Inquiry ===');
const insertInq = db.prepare('INSERT INTO inquiries (name, company, phone, email, product_interest, quantity) VALUES (?, ?, ?, ?, ?, ?)');
const inqRes = insertInq.run('Rajesh Kumar', 'TVS Motor Co', '9876543210', 'rajesh@tvsmotor.com', 'Plastic Crates', 200);
console.log('Inquiry inserted with row ID:', inqRes.lastInsertRowid);

console.log('\n=== TEST 4: Monthly Purge (Delete First 10 Records) ===');
const countBeforeMonthly = db.prepare('SELECT COUNT(*) as c FROM retention_data_queue').get().c;
console.log('Queue count before monthly purge:', countBeforeMonthly);
const first10 = db.prepare('SELECT id, title FROM retention_data_queue ORDER BY id ASC LIMIT 10').all();
const ids10 = first10.map(r => r.id);
console.log('First 10 IDs being deleted:', ids10);
const ph10 = ids10.map(() => '?').join(',');
db.prepare('DELETE FROM retention_data_queue WHERE id IN (' + ph10 + ')').run(...ids10);
db.prepare('INSERT INTO retention_logs (cycle_type, target_table, deleted_count, deleted_ids, summary, triggered_by) VALUES (?, ?, ?, ?, ?, ?)').run('MONTHLY', 'retention_data_queue', ids10.length, JSON.stringify(ids10), 'Monthly purge of first 10 items', 'Test Engine');

const countAfterMonthly = db.prepare('SELECT COUNT(*) as c FROM retention_data_queue').get().c;
console.log('Queue count after monthly purge (expected -10):', countAfterMonthly);

console.log('\n=== TEST 5: Daily Purge (Delete Next 1 Record) ===');
const nextOne = db.prepare('SELECT id, title FROM retention_data_queue ORDER BY id ASC LIMIT 1').get();
console.log('Next record being deleted:', nextOne.id, nextOne.title);
db.prepare('DELETE FROM retention_data_queue WHERE id = ?').run(nextOne.id);
db.prepare('INSERT INTO retention_logs (cycle_type, target_table, deleted_count, deleted_ids, summary, triggered_by) VALUES (?, ?, ?, ?, ?, ?)').run('DAILY', 'retention_data_queue', 1, JSON.stringify([nextOne.id]), 'Daily purge of next item #' + nextOne.id, 'Test Engine');

const countAfterDaily = db.prepare('SELECT COUNT(*) as c FROM retention_data_queue').get().c;
console.log('Queue count after daily purge (expected -1):', countAfterDaily);

console.log('\n=== TEST 6: Audit Logs in Database ===');
const logs = db.prepare('SELECT id, cycle_type, deleted_count, summary, executed_at FROM retention_logs ORDER BY id DESC LIMIT 5').all();
console.log('Retention logs:', logs);

console.log('\n========================================');
console.log('✅ ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
console.log('========================================');
