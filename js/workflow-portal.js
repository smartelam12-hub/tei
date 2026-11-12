/**
 * TEI PACKAGE - Role-Based Multi-Stage Quotation Approval Workflow Portal
 * Strictly isolates Form 1 (Admin 1), Form 2 (Admin 2), Form 3 (Admin 3), Form 4 (Admin 4),
 * and full 4-form analysis + mistake remarks + final bill approval (Owner Admin).
 */
(function () {
  const TOKEN_KEY = 'tei_auth_token';

  const state = {
    token: localStorage.getItem(TOKEN_KEY) || '',
    user: null,
    workflows: [],
    activeWorkflowId: null
  };

  const LOCAL_WORKFLOWS_KEY = 'tei_local_workflows_v1';
  const LOCAL_SESSIONS_KEY = 'tei_local_sessions_v1';

  const LOCAL_USERS = [
    {
      id: 1,
      username: 'tei@admin1',
      passwordHash: '5b7f2a2223d350c06bfe7f5348bcfab9562a85eb12c1bbc38b64071e32d1f300',
      role: 'admin1',
      display_name: 'Admin 1 — Customer Desk',
      department: 'Quotation & Customer Details (Form 1)',
      assigned_step: 1
    },
    {
      id: 2,
      username: 'tei@admin2',
      passwordHash: 'f76b6ed632bb1877dd58e1ee294dd53d273ca43b228d05fb80853c36f4af4a77',
      role: 'admin2',
      display_name: 'Admin 2 — Design Engineer',
      department: 'Crate Dimensions & Fitments (Form 2)',
      assigned_step: 2
    },
    {
      id: 3,
      username: 'tei@admin3',
      passwordHash: 'b6166919900fa22113ec807589d8d79808204880eb7b2db0b6b169a7bb7856f5',
      role: 'admin3',
      display_name: 'Admin 3 — Production Estimator',
      department: 'Work / Labour Operations (Form 3)',
      assigned_step: 3
    },
    {
      id: 4,
      username: 'tei@admin4',
      passwordHash: '236c0dd63d450cf104224bca2c8ba9c5005302d06ac5acb567db641314be21f6',
      role: 'admin4',
      display_name: 'Admin 4 — BOM & Material Desk',
      department: 'Material Cost Breakdown (Form 4)',
      assigned_step: 4
    },
    {
      id: 5,
      username: 'tei@owner',
      passwordHash: '57bf66609aea2797a5ab88231242eba212edea3f31621770a7cf4d3efe6d045b',
      role: 'owner',
      display_name: 'Owner Admin — Final Approver',
      department: 'Full Analysis, Remarks & Bill Approval',
      assigned_step: 0
    }
  ];

  let resolvedApiBase = null;
  let useLocalFallback = false;

  function isLocalHostname(host) {
    if (!host) return true;
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') return true;
    return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
  }

  function getCandidateApiBases() {
    if (resolvedApiBase !== null) {
      return [resolvedApiBase];
    }

    const proto = window.location.protocol;
    const host = window.location.hostname || 'localhost';
    const port = window.location.port;

    if (proto === 'file:') {
      return ['http://localhost:3000', 'http://127.0.0.1:3000'];
    }

    const candidates = [''];
    if (isLocalHostname(host) && port !== '3000') {
      const sameHost3000 = `http://${host}:3000`;
      if (!candidates.includes(sameHost3000)) candidates.push(sameHost3000);
      if (host !== 'localhost') candidates.push('http://localhost:3000');
      if (host !== '127.0.0.1') candidates.push('http://127.0.0.1:3000');
    }
    return candidates;
  }

  function sha256Hex(str) {
    const bytes = typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(String(str))
      : Array.from(unescape(encodeURIComponent(String(str))), c => c.charCodeAt(0));
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const bitLen = bytes.length * 8;
    const paddedLen = Math.ceil((bytes.length + 9) / 64) * 64;
    const msg = new Uint8Array(paddedLen);
    msg.set(bytes);
    msg[bytes.length] = 0x80;
    const view = new DataView(msg.buffer);
    view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
    view.setUint32(paddedLen - 4, bitLen >>> 0, false);

    const rotr = (v, n) => (v >>> n) | (v << (32 - n));
    const W = new Uint32Array(64);
    for (let i = 0; i < paddedLen; i += 64) {
      for (let t = 0; t < 16; t++) W[t] = view.getUint32(i + t * 4, false);
      for (let t = 16; t < 64; t++) {
        const s0 = rotr(W[t - 15], 7) ^ rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3);
        const s1 = rotr(W[t - 2], 17) ^ rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10);
        W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let t = 0; t < 64; t++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + temp1) >>> 0;
        d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    return H.map(x => x.toString(16).padStart(8, '0')).join('');
  }

  function readStorageJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeStorageJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function createSeedWorkflow() {
    const now = new Date().toISOString();
    return {
      id: 1,
      quotationNo: 'TEI-WF-001',
      quoteDate: '2026-11-12',
      customerName: 'Brembo Brake India Pvt Ltd',
      status: 'PENDING_OWNER',
      step1_done: true,
      step1_by: 'Admin 1 — Customer Desk',
      step1_at: now,
      step1: {
        quotationNo: 'TEI-WF-001',
        date: '2026-11-12',
        customer: 'Brembo Brake India Pvt Ltd',
        contact: 'R. Rajesh / +91 98400 11223',
        reference: 'RFQ-BREMBO-884',
        address: 'MIDC Chakan Phase II, Pune, Maharashtra 410501'
      },
      step2_done: true,
      step2_by: 'Admin 2 — Design Engineer',
      step2_at: now,
      step2: {
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
      },
      step3_done: true,
      step3_by: 'Admin 3 — Production Estimator',
      step3_at: now,
      step3: {
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
      },
      step4_done: true,
      step4_by: 'Admin 4 — BOM & Material Desk',
      step4_at: now,
      step4: {
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
      },
      remarks: [],
      approved_by: null,
      approved_at: null,
      created_at: now,
      updated_at: now
    };
  }

  function computeLocalTotals(step2, step3, step4) {
    const workOps = Array.isArray(step3 && step3.workOps) ? step3.workOps : [];
    const materials = Array.isArray(step4 && step4.materials) ? step4.materials : [];
    const sumItems = (items, qtyKey) => items.reduce((acc, item) => {
      const hasAmt = item.amount !== undefined && item.amount !== null && item.amount !== '';
      const amt = hasAmt ? (parseFloat(item.amount) || 0) : ((parseFloat(item[qtyKey]) || 0) * (parseFloat(item.rate) || 0));
      return acc + amt;
    }, 0);

    const labourTotal = sumItems(workOps, 'manHrs');
    const materialTotal = sumItems(materials, 'qty');
    const unitCost = materialTotal + labourTotal;
    const qty = Math.max(1, parseFloat(step2 && step2.quantity) || 1);
    const subtotal = unitCost * qty;
    const gstRate = parseFloat(step4 && step4.gstPercent) || 0;
    const gstAmount = subtotal * (gstRate / 100);

    return {
      labourTotal: Number(labourTotal.toFixed(2)),
      materialTotal: Number(materialTotal.toFixed(2)),
      unitCost: Number(unitCost.toFixed(2)),
      qty,
      subtotal: Number(subtotal.toFixed(2)),
      gstRate,
      gstAmount: Number(gstAmount.toFixed(2)),
      grandTotal: Number((subtotal + gstAmount).toFixed(2))
    };
  }

  function formatLocalWorkflow(wf) {
    const remarks = Array.isArray(wf.remarks) ? wf.remarks : [];
    return Object.assign({}, wf, {
      openRemarks: remarks.filter(r => !r.resolved),
      totals: computeLocalTotals(wf.step2 || {}, wf.step3 || {}, wf.step4 || {})
    });
  }

  function loadLocalWorkflows() {
    let list = readStorageJson(LOCAL_WORKFLOWS_KEY, null);
    if (!Array.isArray(list) || list.length === 0) {
      list = [createSeedWorkflow()];
      writeStorageJson(LOCAL_WORKFLOWS_KEY, list);
    }
    return list.map(formatLocalWorkflow);
  }

  function saveLocalWorkflows(list) {
    writeStorageJson(LOCAL_WORKFLOWS_KEY, list.map(formatLocalWorkflow));
  }

  function sanitizeUser(u) {
    return {
      id: u.id,
      username: u.username,
      role: u.role,
      display_name: u.display_name,
      department: u.department,
      assigned_step: u.assigned_step
    };
  }

  function getLocalSessionUser() {
    if (!state.token) return null;
    const sessions = readStorageJson(LOCAL_SESSIONS_KEY, {});
    const sess = sessions[state.token];
    if (!sess || sess.expiresAt < Date.now()) {
      if (sess) {
        delete sessions[state.token];
        writeStorageJson(LOCAL_SESSIONS_KEY, sessions);
      }
      return null;
    }
    const found = LOCAL_USERS.find(u => u.id === sess.userId);
    return found ? sanitizeUser(found) : null;
  }

  function createError(message, status) {
    const err = new Error(message);
    err.status = status;
    return err;
  }

  function localFallbackRequest(url, options) {
    const method = ((options && options.method) || 'GET').toUpperCase();
    const body = options && options.body ? JSON.parse(options.body) : {};
    const nowIso = new Date().toISOString();

    if (url === '/api/auth/login' && method === 'POST') {
      const username = String(body.username || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!username || !password) throw createError('Username and password are required.', 400);

      const pwdHash = sha256Hex(`TEI_PKG_SALT::${password}`);
      const user = LOCAL_USERS.find(u => u.username === username && u.passwordHash === pwdHash);
      if (!user) throw createError('Invalid username or password.', 401);

      const token = `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
      const sessions = readStorageJson(LOCAL_SESSIONS_KEY, {});
      sessions[token] = { userId: user.id, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 };
      writeStorageJson(LOCAL_SESSIONS_KEY, sessions);
      return { success: true, token, user: sanitizeUser(user) };
    }

    if (url === '/api/auth/logout' && method === 'POST') {
      if (state.token) {
        const sessions = readStorageJson(LOCAL_SESSIONS_KEY, {});
        delete sessions[state.token];
        writeStorageJson(LOCAL_SESSIONS_KEY, sessions);
      }
      return { success: true, message: 'Logged out.' };
    }

    const user = getLocalSessionUser();
    if (!user) throw createError('Authentication required.', 401);

    if (url === '/api/auth/me' && method === 'GET') {
      return { success: true, user, pendingCount: 0 };
    }

    const workflows = loadLocalWorkflows();
    if (url === '/api/workflows' && method === 'GET') {
      const sorted = workflows.slice().sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || '') || b.id - a.id);
      return { success: true, count: sorted.length, workflows: sorted };
    }

    if (url === '/api/workflows' && method === 'POST') {
      if (user.role !== 'admin1' && user.role !== 'owner') {
        throw createError('Only Admin 1 or Owner Admin can create a new quotation workflow.', 403);
      }
      const step1 = body.step1 || {};
      const nextId = workflows.reduce((m, w) => Math.max(m, Number(w.id) || 0), 0) + 1;
      const quotationNo = String(step1.quotationNo || `TEI-WF-${String(nextId).padStart(3, '0')}`).trim();
      if (workflows.some(w => w.quotationNo === quotationNo)) {
        throw createError('Quotation No. already exists.', 409);
      }
      const quoteDate = String(step1.date || nowIso.split('T')[0]);
      const customerName = String(step1.customer || '').trim();
      const created = formatLocalWorkflow({
        id: nextId,
        quotationNo,
        quoteDate,
        customerName,
        status: 'IN_PROGRESS',
        step1_done: Boolean(customerName),
        step1_by: user.display_name,
        step1_at: nowIso,
        step1: Object.assign({}, step1, { quotationNo, date: quoteDate }),
        step2_done: false, step2_by: null, step2_at: null, step2: {},
        step3_done: false, step3_by: null, step3_at: null, step3: {},
        step4_done: false, step4_by: null, step4_at: null, step4: {},
        remarks: [],
        approved_by: null,
        approved_at: null,
        created_at: nowIso,
        updated_at: nowIso
      });
      workflows.push(created);
      saveLocalWorkflows(workflows);
      return { success: true, workflow: created };
    }

    const stepMatch = url.match(/^\/api\/workflows\/(\d+)\/step$/);
    if (stepMatch && method === 'PUT') {
      const wf = workflows.find(w => w.id === Number(stepMatch[1]));
      if (!wf) throw createError('Workflow not found.', 404);
      const step = parseInt(body.step, 10);
      if (![1, 2, 3, 4].includes(step)) throw createError('Invalid step number.', 400);
      if (user.role !== 'owner' && user.role !== `admin${step}`) {
        throw createError(`Access denied: ${user.display_name} can only update Form ${user.assigned_step}, not Form ${step}.`, 403);
      }
      if (wf.status === 'APPROVED' && user.role !== 'owner') {
        throw createError('This quotation bill is already approved by the Owner and locked.', 403);
      }

      const data = body.data || {};
      wf[`step${step}`] = data;
      wf[`step${step}_done`] = true;
      wf[`step${step}_by`] = user.display_name;
      wf[`step${step}_at`] = nowIso;
      if (step === 1) {
        if (data.quotationNo) wf.quotationNo = String(data.quotationNo).trim();
        if (data.date) wf.quoteDate = String(data.date);
        if (data.customer !== undefined) wf.customerName = String(data.customer).trim();
      }

      let resolvedCount = 0;
      wf.remarks = (wf.remarks || []).map(r => {
        if (!r.resolved && r.targetAdmin === `admin${step}`) {
          resolvedCount++;
          return Object.assign({}, r, { resolved: true, resolvedBy: user.display_name, resolvedAt: nowIso });
        }
        return r;
      });
      if (wf.status !== 'APPROVED') {
        if (wf.remarks.some(r => !r.resolved)) wf.status = 'REMARKED';
        else if (wf.step1_done && wf.step2_done && wf.step3_done) wf.status = 'PENDING_OWNER';
        else wf.status = 'IN_PROGRESS';
      }
      wf.updated_at = nowIso;
      saveLocalWorkflows(workflows);
      return {
        success: true,
        resolvedRemarks: resolvedCount,
        message: resolvedCount > 0 ? `Form ${step} updated and ${resolvedCount} Owner remark(s) marked resolved.` : `Form ${step} saved successfully.`,
        workflow: formatLocalWorkflow(wf)
      };
    }

    const remarkMatch = url.match(/^\/api\/workflows\/(\d+)\/remark$/);
    if (remarkMatch && method === 'POST') {
      if (user.role !== 'owner') throw createError('Only Owner Admin can issue remarks to admins.', 403);
      const wf = workflows.find(w => w.id === Number(remarkMatch[1]));
      if (!wf) throw createError('Workflow not found.', 404);
      const targetAdmin = String(body.targetAdmin || '').trim();
      const message = String(body.message || '').trim();
      if (!['admin1', 'admin2', 'admin3', 'admin4'].includes(targetAdmin)) throw createError('Invalid target admin.', 400);
      if (!message) throw createError('Remark message is required.', 400);

      wf.remarks = wf.remarks || [];
      wf.remarks.push({
        id: `RMK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        targetAdmin,
        message,
        createdBy: user.display_name,
        createdAt: nowIso,
        resolved: false
      });
      wf.status = 'REMARKED';
      wf.approved_by = null;
      wf.approved_at = null;
      wf.updated_at = nowIso;
      saveLocalWorkflows(workflows);
      return { success: true, message: `Remark sent to ${targetAdmin.toUpperCase()} to refill and correct.`, workflow: formatLocalWorkflow(wf) };
    }

    const approveMatch = url.match(/^\/api\/workflows\/(\d+)\/approve$/);
    if (approveMatch && method === 'POST') {
      if (user.role !== 'owner') throw createError('Only Owner Admin can grant final bill approval.', 403);
      const wf = workflows.find(w => w.id === Number(approveMatch[1]));
      if (!wf) throw createError('Workflow not found.', 404);
      const openRemarks = (wf.remarks || []).filter(r => !r.resolved);
      if (openRemarks.length > 0) {
        throw createError(`Cannot approve yet: ${openRemarks.length} unresolved remark(s) still awaiting admin correction.`, 400);
      }
      wf.status = 'APPROVED';
      wf.approved_by = user.display_name;
      wf.approved_at = nowIso;
      wf.updated_at = nowIso;
      saveLocalWorkflows(workflows);
      const updated = formatLocalWorkflow(wf);
      return { success: true, message: `Bill ${updated.quotationNo} approved and saved in browser storage.`, workflow: updated };
    }

    throw createError(`Unsupported offline endpoint: ${method} ${url}`, 404);
  }

  function toast(message, type) {
    if (window.TEI_API && typeof window.TEI_API.showToast === 'function') {
      window.TEI_API.showToast(message, type || 'info');
    } else if (typeof window.showEstimatorToast === 'function') {
      window.showEstimatorToast(message);
    } else {
      alert(message);
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function apiRequest(url, options) {
    if (useLocalFallback) {
      return localFallbackRequest(url, options);
    }

    const headers = Object.assign({ 'Content-Type': 'application/json' }, (options && options.headers) || {});
    if (state.token) {
      headers.Authorization = `Bearer ${state.token}`;
    }

    const candidates = getCandidateApiBases();
    let staticResponse = false;

    for (const base of candidates) {
      let resp;
      try {
        resp = await fetch(`${base}${url}`, Object.assign({}, options, { headers }));
      } catch {
        continue;
      }

      const contentType = (resp.headers.get('content-type') || '').toLowerCase();
      const rawText = await resp.text();
      let data = {};
      let parsedJson = false;
      if (rawText) {
        try {
          data = JSON.parse(rawText);
          parsedJson = true;
        } catch {
          data = {};
        }
      }

      const isApiJson = parsedJson && contentType.includes('application/json') &&
        (Object.prototype.hasOwnProperty.call(data, 'success') || Object.prototype.hasOwnProperty.call(data, 'error'));

      // Static servers / SPA fallbacks (e.g. Live Server, GitHub Pages, Nginx static) respond without API JSON
      if ((resp.status === 405 || resp.status === 404 || resp.status === 501 || resp.status === 200) && !isApiJson) {
        staticResponse = true;
        continue;
      }

      resolvedApiBase = base;
      if (!resp.ok) {
        throw createError(data.error || `Request failed (${resp.status})`, resp.status);
      }
      return data;
    }

    // No Node backend reachable (static hosting or offline): activate browser LocalStorage mode
    if (staticResponse || candidates.length > 0) {
      useLocalFallback = true;
      return localFallbackRequest(url, options);
    }

    throw createError('Request failed.', 500);
  }

  function showLoginView(message) {
    document.getElementById('authLoginSection').style.display = 'flex';
    document.getElementById('mainAppShell').style.display = 'none';
    document.body.classList.add('lg-login-active');
    const navbar = document.querySelector('.navbar');
    if (navbar) navbar.style.display = 'none';
    const navPrintBtn = document.getElementById('navPrintBtn');
    if (navPrintBtn) navPrintBtn.style.display = 'none';

    const errBox = document.getElementById('loginErrorMsg');
    if (errBox) {
      if (message) {
        errBox.textContent = message;
        errBox.style.display = 'block';
      } else {
        errBox.style.display = 'none';
      }
    }
  }

  function setElVisible(id, visible, displayType) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = visible ? (displayType || '') : 'none';
  }

  function applyRoleVisibility(role) {
    const isOwner = role === 'owner';
    const assignedStep =
      role === 'admin1' ? 1 :
      role === 'admin2' ? 2 :
      role === 'admin3' ? 3 :
      role === 'admin4' ? 4 : 0;

    // Header badges & controls
    const badge = document.getElementById('activeRoleBadge');
    if (badge) {
      badge.className = `role-badge-pill ${role}`;
      badge.textContent = isOwner ? 'OWNER ADMIN' : `ADMIN ${assignedStep}`;
    }
    if (state.user) {
      const nameEl = document.getElementById('activeUserDisplay');
      const deptEl = document.getElementById('activeDeptDisplay');
      if (nameEl) nameEl.textContent = state.user.display_name;
      if (deptEl) {
        deptEl.textContent = isOwner
          ? 'Full Analysis • Review All 4 Forms • Issue Admin Remarks & Final Bill Approval'
          : `Restricted Workspace • ${state.user.department}`;
      }
    }

    // Ensure estimator tab is visible when entering
    if (typeof window.switchToolTab === 'function') {
      window.switchToolTab('estimator');
    }

    // Top-level Owner-only chrome
    setElVisible('toolTypeNav', isOwner, 'flex');
    setElVisible('navPrintBtn', isOwner, 'inline-flex');
    setElVisible('quoteSizeTabsBox', isOwner, 'block');
    setElVisible('estimatorActionBar', isOwner, 'flex');
    setElVisible('productDescBox', isOwner, 'block');
    setElVisible('panelOwnerSummary', isOwner, 'block');
    setElVisible('ownerApprovalControls', isOwner, 'block');
    setElVisible('ownerQueueCard', isOwner, 'block');
    setElVisible('btnNewWorkflow', role === 'admin1' || isOwner, 'inline-flex');

    document.querySelectorAll('.owner-remark-btn').forEach(btn => {
      btn.style.display = isOwner ? 'inline-flex' : 'none';
    });

    // Strict Panel Visibility Isolation
    const showColLeft = isOwner || role === 'admin1' || role === 'admin2';
    const showColRight = isOwner || role === 'admin3' || role === 'admin4';
    setElVisible('estimatorLeftCol', showColLeft, 'block');
    setElVisible('estimatorRightCol', showColRight, 'block');

    setElVisible('panelStep1', isOwner || role === 'admin1', 'block');
    setElVisible('panelStep2', isOwner || role === 'admin2', 'block');
    setElVisible('panelStep3', isOwner || role === 'admin3', 'block');
    setElVisible('panelStep4', isOwner || role === 'admin4', 'block');

    const grid = document.getElementById('estimatorMainGrid');
    if (grid) {
      grid.classList.toggle('single-form-mode', !isOwner);
    }

    // Save button visibility: admins see ONLY their assigned form's Save button; owner sees Form 4 edit + review controls
    setElVisible('btnSaveStep1', isOwner || role === 'admin1', 'inline-flex');
    setElVisible('btnSaveStep2', isOwner || role === 'admin2', 'inline-flex');
    setElVisible('btnSaveStep3', isOwner || role === 'admin3', 'inline-flex');
    setElVisible('btnSaveStep4', isOwner || role === 'admin4', 'inline-flex');
  }

  function renderWorkflowSelector() {
    const sel = document.getElementById('wfSelector');
    if (!sel) return;
    sel.innerHTML = '';

    if (state.workflows.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No quotations found';
      sel.appendChild(opt);
      return;
    }

    state.workflows.forEach(wf => {
      const opt = document.createElement('option');
      opt.value = String(wf.id);
      const cust = wf.customerName || wf.step1.customer || 'New Customer';
      const myRemarks = state.user && state.user.role !== 'owner'
        ? wf.openRemarks.filter(r => r.targetAdmin === state.user.role).length
        : 0;
      const flag = myRemarks > 0 ? ` [REMARK: ${myRemarks}]` : '';
      opt.textContent = `${wf.quotationNo} — ${cust} (${wf.status})${flag}`;
      if (wf.id === state.activeWorkflowId) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function renderProgressBanner(wf) {
    if (!wf) return;
    document.getElementById('wfBannerQuoteNo').textContent = wf.quotationNo;
    document.getElementById('wfBannerCustomer').textContent = wf.customerName || wf.step1.customer || 'Unassigned Customer';

    const statusBadge = document.getElementById('wfBannerStatus');
    statusBadge.className = `wf-status-pill ${wf.status}`;
    statusBadge.textContent = wf.status.replace('_', ' ');

    const stamp = document.getElementById('wfApprovedStamp');
    if (stamp) stamp.style.display = wf.status === 'APPROVED' ? 'block' : 'none';

    for (let step = 1; step <= 4; step++) {
      const chip = document.getElementById(`chipStep${step}`);
      if (!chip) continue;
      const done = wf[`step${step}_done`];
      const by = wf[`step${step}_by`];
      const hasRemark = wf.openRemarks.some(r => r.targetAdmin === `admin${step}`);

      chip.className = 'wf-step-chip';
      if (hasRemark) chip.classList.add('remarked');
      else if (done) chip.classList.add('done');

      const label = chip.querySelector('div');
      if (label) {
        if (hasRemark) label.textContent = '🚩 Owner Remark — Needs Refill';
        else if (done) label.textContent = `✅ Done (${by || 'Admin ' + step})`;
        else label.textContent = '⏳ Pending Input';
      }

      const metaEl = document.getElementById(`step${step}MetaInfo`);
      if (metaEl) {
        metaEl.textContent = hasRemark
          ? `🚩 Owner flagged Form ${step} for correction & refill`
          : done
            ? `✅ Submitted by ${by || 'Admin ' + step}`
            : `⏳ Waiting for Admin ${step}`;
      }
    }

    // Update A4 Printable Sheet Approval Stamp
    const prStamp = document.getElementById('printApprovalStampBox');
    if (prStamp) {
      if (wf.status === 'APPROVED') {
        prStamp.innerHTML = `<span class="approved-stamp-badge">APPROVED BY ${escapeHtml(wf.approved_by || 'OWNER')}</span>`;
      } else {
        prStamp.innerHTML = `<span style="font-size:11px; color:#b45309; font-weight:700;">STATUS: ${escapeHtml(wf.status)}</span>`;
      }
    }
  }

  function renderRemarkBanner(wf) {
    const banner = document.getElementById('remarkAlertBanner');
    const titleEl = document.getElementById('remarkAlertTitle');
    const bodyEl = document.getElementById('remarkAlertBody');
    if (!banner || !bodyEl || !wf || !state.user) return;

    const role = state.user.role;
    const isOwner = role === 'owner';
    const relevantRemarks = isOwner
      ? wf.openRemarks
      : wf.openRemarks.filter(r => r.targetAdmin === role);

    if (relevantRemarks.length === 0) {
      banner.style.display = 'none';
      bodyEl.innerHTML = '';
      return;
    }

    banner.style.display = 'block';
    titleEl.textContent = isOwner
      ? `⚠️ ${relevantRemarks.length} Active Owner Remark(s) Pending Admin Refill`
      : `⚠️ Action Required: Owner Sent ${relevantRemarks.length} Remark(s) to ${role.toUpperCase()} — Please Refill & Resubmit Form`;

    bodyEl.innerHTML = relevantRemarks.map(r => `
      <div class="remark-item-card">
        <div style="display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap;">
          <strong>Target: ${escapeHtml(r.targetAdmin.toUpperCase())}</strong>
          <span style="font-size:11.5px; color:#64748b;">By ${escapeHtml(r.createdBy || 'Owner Admin')} • ${escapeHtml((r.createdAt || '').slice(0, 16).replace('T', ' '))}</span>
        </div>
        <div style="margin-top:4px; color:#1e293b;">${escapeHtml(r.message)}</div>
      </div>
    `).join('');
  }

  function renderOwnerQueue() {
    if (!state.user || state.user.role !== 'owner') return;
    const tbody = document.getElementById('ownerQueueTbody');
    const logBox = document.getElementById('ownerRemarkLogBox');
    if (!tbody) return;

    tbody.innerHTML = state.workflows.map(wf => {
      const s1 = wf.step1_done ? '✅' : '⏳';
      const s2 = wf.step2_done ? '✅' : '⏳';
      const s3 = wf.step3_done ? '✅' : '⏳';
      const s4 = wf.step4_done ? '✅' : '⏳';
      const activeHighlight = wf.id === state.activeWorkflowId ? 'background:#f0fdf4;' : '';
      return `
        <tr style="${activeHighlight}">
          <td><strong>${escapeHtml(wf.quotationNo)}</strong></td>
          <td>${escapeHtml(wf.customerName || wf.step1.customer || '—')}</td>
          <td style="font-size:12px;">F1:${s1} &nbsp; F2:${s2} &nbsp; F3:${s3} &nbsp; F4:${s4}</td>
          <td style="font-weight:700;">₹${Number(wf.totals.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td>${wf.openRemarks.length > 0 ? `<span style="color:#b91c1c; font-weight:700;">${wf.openRemarks.length} Open</span>` : '0 Open'}</td>
          <td><span class="wf-status-pill ${wf.status}">${escapeHtml(wf.status)}</span></td>
          <td>
            <button type="button" class="btn btn-outline btn-sm" onclick="WF_PORTAL.selectWorkflow(${wf.id})">Inspect</button>
          </td>
        </tr>
      `;
    }).join('');

    const activeWf = getActiveWorkflow();
    if (logBox && activeWf) {
      if (activeWf.remarks.length === 0) {
        logBox.innerHTML = '<div style="font-size:12.5px; color:var(--muted);">No remarks recorded on this quotation yet.</div>';
      } else {
        logBox.innerHTML = `
          <div style="font-size:12.5px; font-weight:800; color:var(--ink); margin-bottom:6px;">Remarks Audit Log (${escapeHtml(activeWf.quotationNo)}):</div>
          ${activeWf.remarks.map(r => `
            <div style="padding:8px 12px; border:1px solid ${r.resolved ? '#bbf7d0' : '#fecaca'}; background:${r.resolved ? '#f0fdf4' : '#fef2f2'}; border-radius:8px; margin-bottom:6px; font-size:12.5px;">
              <strong>[${escapeHtml(r.targetAdmin.toUpperCase())}]</strong> ${escapeHtml(r.message)}
              <span style="float:right; font-weight:700; color:${r.resolved ? '#15803d' : '#b91c1c'};">
                ${r.resolved ? '✅ Resolved / Refilled' : '⏳ Pending Refill'}
              </span>
            </div>
          `).join('')}
        `;
      }
    }
  }

  function getEstimatorQuotes() {
    if (typeof teiQuotes !== 'undefined' && Array.isArray(teiQuotes)) return teiQuotes;
    if (Array.isArray(window.teiQuotes)) return window.teiQuotes;
    return null;
  }

  function populateEstimatorFromWorkflow(wf) {
    const quotesArr = getEstimatorQuotes();
    if (!wf || !quotesArr) return;

    const s1 = wf.step1 || {};
    const s2 = wf.step2 || {};
    const s3 = wf.step3 || {};
    const s4 = wf.step4 || {};

    const defaultWork = typeof DEFAULT_WORK_OPS !== 'undefined'
      ? JSON.parse(JSON.stringify(DEFAULT_WORK_OPS))
      : [];
    const defaultMats = typeof DEFAULT_MATERIALS !== 'undefined'
      ? JSON.parse(JSON.stringify(DEFAULT_MATERIALS))
      : [];

    const quoteObj = {
      id: wf.quotationNo,
      quotationNo: s1.quotationNo || wf.quotationNo,
      date: s1.date || wf.quoteDate || '',
      customer: s1.customer || wf.customerName || '',
      contact: s1.contact || '',
      reference: s1.reference || '',
      address: s1.address || '',
      partName: s2.partName || '',
      partNo: s2.partNo || '',
      make: s2.make || 'Tuff',
      odLength: s2.odLength || '',
      odWidth: s2.odWidth || '',
      odHeight: s2.odHeight || '',
      idLength: s2.idLength || '',
      idWidth: s2.idWidth || '',
      idHeight: s2.idHeight || '',
      quantity: s2.quantity || 1,
      colour: s2.colour || 'Green',
      bottomType: s2.bottomType || '',
      hdpeThickness: s2.hdpeThickness || '',
      xlpeThickness: s2.xlpeThickness || '',
      sheet1: s2.sheet1 || ' x  x ',
      nettedTape: s2.nettedTape || 'Yes',
      dustCover: s2.dustCover || 'Yes',
      plasticLid: s2.plasticLid || 'No',
      rivetMaterial: s2.rivetMaterial || '',
      rivetCount: s2.rivetCount || 0,
      screenPrinting: s2.screenPrinting || 'No',
      cardHolderType: s2.cardHolderType || '',
      cardHolderColour: s2.cardHolderColour || '',
      cardHolderSize: s2.cardHolderSize || '',
      cardHolderPockets: s2.cardHolderPockets || '',
      workOps: Array.isArray(s3.workOps) && s3.workOps.length > 0 ? JSON.parse(JSON.stringify(s3.workOps)) : defaultWork,
      materials: Array.isArray(s4.materials) && s4.materials.length > 0 ? JSON.parse(JSON.stringify(s4.materials)) : defaultMats,
      wastagePercent: s4.wastagePercent !== undefined ? s4.wastagePercent : 0,
      gstPercent: s4.gstPercent !== undefined ? s4.gstPercent : 18,
      notes: s4.notes || ''
    };

    quotesArr.length = 0;
    quotesArr.push(quoteObj);
    if (typeof window.switchQuoteTab === 'function') {
      window.switchQuoteTab(quoteObj.id);
    }

    syncSummaryMirrorTotals();
  }

  function syncSummaryMirrorTotals() {
    const matEl = document.getElementById('estMaterialTotal');
    const matValEl = document.getElementById('estMaterialTotalVal');
    const labEl = document.getElementById('estLabourTotal');
    const labValEl = document.getElementById('estLabourTotalVal');
    if (matEl && matValEl) matValEl.textContent = matEl.textContent;
    if (labEl && labValEl) labValEl.textContent = labEl.textContent;
  }

  function getActiveWorkflow() {
    return state.workflows.find(w => w.id === state.activeWorkflowId) || null;
  }

  function collectStepData(step) {
    const val = (id) => {
      const el = document.getElementById(id);
      return el ? el.value : '';
    };

    if (step === 1) {
      return {
        quotationNo: val('estQuoteNo').trim(),
        date: val('estDate'),
        customer: val('estCustomer').trim(),
        contact: val('estContact').trim(),
        reference: val('estReference').trim(),
        address: val('estAddress').trim()
      };
    }

    if (step === 2) {
      return {
        partName: val('estPartName').trim(),
        partNo: val('estPartNo').trim(),
        make: val('estMake'),
        odLength: val('estOdLength').trim(),
        odWidth: val('estOdWidth').trim(),
        odHeight: val('estOdHeight').trim(),
        idLength: val('estIdLength').trim(),
        idWidth: val('estIdWidth').trim(),
        idHeight: val('estIdHeight').trim(),
        quantity: parseFloat(val('estQuantity')) || 1,
        colour: val('estColour'),
        bottomType: val('estBottomType').trim(),
        hdpeThickness: val('estHdpeThickness').trim(),
        xlpeThickness: val('estXlpeThickness').trim(),
        sheet1: val('estSheet1').trim(),
        nettedTape: val('estNettedTape'),
        dustCover: val('estDustCover'),
        plasticLid: val('estPlasticLid'),
        rivetMaterial: val('estRivetMaterial').trim(),
        rivetCount: parseFloat(val('estRivetCount')) || 0,
        screenPrinting: val('estScreenPrinting'),
        cardHolderType: val('estCardHolderType').trim(),
        cardHolderColour: val('estCardHolderColour').trim(),
        cardHolderSize: val('estCardHolderSize').trim()
      };
    }

    const quotesArr = getEstimatorQuotes();
    const q = (quotesArr && quotesArr[0]) || {};
    if (step === 3) {
      return {
        workOps: JSON.parse(JSON.stringify(q.workOps || []))
      };
    }

    if (step === 4) {
      return {
        materials: JSON.parse(JSON.stringify(q.materials || [])),
        wastagePercent: parseFloat(val('estWastagePercent')) || 0,
        gstPercent: parseFloat(val('estGstPercent')) || 0,
        notes: val('estNotes').trim()
      };
    }

    return {};
  }

  function renderActiveWorkflowUI() {
    const wf = getActiveWorkflow();
    renderWorkflowSelector();
    if (!wf) return;
    renderProgressBanner(wf);
    renderRemarkBanner(wf);
    populateEstimatorFromWorkflow(wf);
    renderOwnerQueue();

    const approveBtn = document.getElementById('btnOwnerApproveBill');
    if (approveBtn) {
      if (wf.status === 'APPROVED') {
        approveBtn.textContent = '✅ Bill Approved (Synced)';
        approveBtn.disabled = false;
      } else {
        approveBtn.textContent = '✅ Approve Bill (Final)';
        approveBtn.disabled = false;
      }
    }
  }

  async function refreshWorkflows(preferredId) {
    const data = await apiRequest('/api/workflows', { method: 'GET' });
    state.workflows = data.workflows || [];

    if (preferredId) {
      state.activeWorkflowId = Number(preferredId);
    } else if (!state.workflows.some(w => w.id === state.activeWorkflowId)) {
      // Auto-select a workflow with open remarks for the logged-in admin, or the newest one
      const remarkMatch = state.user && state.user.role !== 'owner'
        ? state.workflows.find(w => w.openRemarks.some(r => r.targetAdmin === state.user.role))
        : null;
      state.activeWorkflowId = remarkMatch
        ? remarkMatch.id
        : (state.workflows[0] ? state.workflows[0].id : null);
    }

    renderActiveWorkflowUI();
  }

  async function enterPortal(user) {
    state.user = user;
    document.getElementById('authLoginSection').style.display = 'none';
    document.getElementById('mainAppShell').style.display = 'block';
    document.body.classList.remove('lg-login-active');
    const navbar = document.querySelector('.navbar');
    if (navbar) navbar.style.display = '';
    applyRoleVisibility(user.role);
    await refreshWorkflows();
    toast(
      useLocalFallback
        ? `Signed in as ${user.display_name} (Browser LocalStorage Mode)`
        : `Signed in as ${user.display_name}`,
      'success'
    );
  }

  // Keep summary mirror synced whenever inputs change
  document.addEventListener('input', () => {
    syncSummaryMirrorTotals();
  });

  document.addEventListener('DOMContentLoaded', async () => {
    if (!state.token) {
      showLoginView();
      return;
    }

    try {
      const me = await apiRequest('/api/auth/me', { method: 'GET' });
      if (me && me.user) {
        await enterPortal(me.user);
      } else {
        showLoginView();
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      state.token = '';
      showLoginView();
    }
  });

  window.WF_PORTAL = {
    async handleLoginSubmit(event) {
      if (event) event.preventDefault();
      const username = (document.getElementById('loginUsername').value || '').trim();
      const password = document.getElementById('loginPassword').value || '';
      const errBox = document.getElementById('loginErrorMsg');
      if (errBox) errBox.style.display = 'none';

      try {
        const res = await apiRequest('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username, password })
        });
        state.token = res.token;
        localStorage.setItem(TOKEN_KEY, res.token);
        await enterPortal(res.user);
      } catch (err) {
        if (errBox) {
          errBox.textContent = err.message || 'Sign in failed. Ensure server.js is running on http://localhost:3000.';
          errBox.style.display = 'block';
        }
      }
      return false;
    },

    async logout() {
      try {
        if (state.token) {
          await apiRequest('/api/auth/logout', { method: 'POST' });
        }
      } catch {
        // Ignore network issues on logout
      }
      localStorage.removeItem(TOKEN_KEY);
      state.token = '';
      state.user = null;
      state.workflows = [];
      state.activeWorkflowId = null;
      showLoginView();
      toast('Signed out successfully.', 'info');
    },

    selectWorkflow(id) {
      state.activeWorkflowId = Number(id);
      renderActiveWorkflowUI();
    },

    refreshWorkflows() {
      return refreshWorkflows(state.activeWorkflowId).then(() => {
        toast('Quotation workflow refreshed.', 'info');
      }).catch(err => toast(err.message, 'error'));
    },

    async createNewWorkflow() {
      const defaultNo = `TEI-WF-${String(state.workflows.length + 1).padStart(3, '0')}`;
      const enteredNo = prompt('Enter New Quotation No. (Admin 1 will fill Form 1):', defaultNo);
      if (enteredNo === null) return;

      try {
        const res = await apiRequest('/api/workflows', {
          method: 'POST',
          body: JSON.stringify({
            step1: {
              quotationNo: enteredNo.trim() || defaultNo,
              date: new Date().toISOString().split('T')[0],
              customer: '',
              contact: '',
              reference: '',
              address: ''
            }
          })
        });
        await refreshWorkflows(res.workflow.id);
        toast(`Created workflow ${res.workflow.quotationNo}`, 'success');
      } catch (err) {
        toast(err.message, 'error');
      }
    },

    async saveStep(step) {
      const wf = getActiveWorkflow();
      if (!wf) {
        toast('Select or create a quotation workflow first.', 'error');
        return;
      }

      const payload = collectStepData(step);
      try {
        const res = await apiRequest(`/api/workflows/${wf.id}/step`, {
          method: 'PUT',
          body: JSON.stringify({ step, data: payload })
        });
        await refreshWorkflows(wf.id);
        toast(res.message || `Form ${step} saved successfully.`, 'success');
      } catch (err) {
        toast(err.message, 'error');
      }
    },

    openRemarkModal(defaultTargetAdmin) {
      const modal = document.getElementById('ownerRemarkModal');
      const sel = document.getElementById('remarkTargetAdmin');
      const txt = document.getElementById('remarkMessageInput');
      if (sel && defaultTargetAdmin) sel.value = defaultTargetAdmin;
      if (txt) txt.value = '';
      if (modal) modal.classList.add('active');
    },

    closeRemarkModal() {
      const modal = document.getElementById('ownerRemarkModal');
      if (modal) modal.classList.remove('active');
    },

    async submitRemark(event) {
      if (event) event.preventDefault();
      const wf = getActiveWorkflow();
      if (!wf) return false;

      const targetAdmin = document.getElementById('remarkTargetAdmin').value;
      const message = (document.getElementById('remarkMessageInput').value || '').trim();
      if (!message) {
        toast('Please write the mistake remark message.', 'error');
        return false;
      }

      try {
        const res = await apiRequest(`/api/workflows/${wf.id}/remark`, {
          method: 'POST',
          body: JSON.stringify({ targetAdmin, message })
        });
        window.WF_PORTAL.closeRemarkModal();
        await refreshWorkflows(wf.id);
        toast(res.message, 'success');
      } catch (err) {
        toast(err.message, 'error');
      }
      return false;
    },

    async approveWorkflow() {
      const wf = getActiveWorkflow();
      if (!wf) return;

      if (!confirm(`Confirm Final Approval for Quotation ${wf.quotationNo} (Grand Total ₹${wf.totals.grandTotal})?`)) {
        return;
      }

      try {
        // Save any Owner edits to Step 4 (BOM/Wastage/GST/Notes) right before approving
        await apiRequest(`/api/workflows/${wf.id}/step`, {
          method: 'PUT',
          body: JSON.stringify({ step: 4, data: collectStepData(4) })
        });

        const res = await apiRequest(`/api/workflows/${wf.id}/approve`, {
          method: 'POST',
          body: JSON.stringify({})
        });
        await refreshWorkflows(wf.id);
        toast(res.message, 'success');
      } catch (err) {
        toast(err.message, 'error');
      }
    }
  };
})();
