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

  function getApiBase() {
    if (window.location.protocol === 'file:') {
      return 'http://localhost:3000';
    }
    return '';
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
    const headers = Object.assign({ 'Content-Type': 'application/json' }, (options && options.headers) || {});
    if (state.token) {
      headers.Authorization = `Bearer ${state.token}`;
    }
    const resp = await fetch(`${getApiBase()}${url}`, Object.assign({}, options, { headers }));
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const err = new Error(data.error || `Request failed (${resp.status})`);
      err.status = resp.status;
      throw err;
    }
    return data;
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

  function populateEstimatorFromWorkflow(wf) {
    if (!wf || typeof window.teiQuotes === 'undefined' || !Array.isArray(window.teiQuotes)) return;

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

    window.teiQuotes.length = 0;
    window.teiQuotes.push(quoteObj);
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

    const q = (typeof window.teiQuotes !== 'undefined' && window.teiQuotes[0]) || {};
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
    toast(`Signed in as ${user.display_name}`, 'success');
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
