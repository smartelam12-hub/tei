/**
 * TEI PACKAGE - Frontend Client API & Multi-User Database Integration
 * Manages Quotations Sync, Inquiries, and Silent Backend Connection
 */

window.TEI_API = (function() {
  const BASE_URL = window.location.origin;
  let isBackendLive = false;
  let pollInterval = null;

  // ----------------------------------------------------------------
  // 1. TOAST NOTIFICATION SYSTEM
  // ----------------------------------------------------------------
  function showToast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('teiToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'teiToastContainer';
      container.className = 'tei-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `tei-toast ${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span><div style="flex:1;">${message}</div>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ----------------------------------------------------------------
  // 2. HEALTH & SERVER STATUS CHECK
  // ----------------------------------------------------------------
  async function checkServerHealth() {
    try {
      const res = await fetch(`${BASE_URL}/api/health`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        isBackendLive = true;
        updateServerStatusUI(data);
        return true;
      }
    } catch (e) {
      // Offline / standalone mode
    }
    isBackendLive = false;
    updateServerStatusUI(null);
    return false;
  }

  function updateServerStatusUI(healthData) {
    const statusDot = document.getElementById('serverStatusDot');
    const statusText = document.getElementById('serverStatusText');
    const networkPill = document.getElementById('serverNetworkAddress');

    if (healthData && isBackendLive) {
      if (statusDot) statusDot.className = 'live-pulse-dot';
      if (statusText) statusText.textContent = 'SQLite Database Connected • Multi-User Mode Active';
      if (networkPill) {
        const ip = (healthData.localNetworkIPs && healthData.localNetworkIPs[0]) || window.location.hostname;
        const port = window.location.port || '3000';
        networkPill.textContent = `Access on LAN: http://${ip}:${port}`;
        networkPill.style.display = 'inline-block';
      }
    } else {
      if (statusDot) {
        statusDot.className = '';
        statusDot.style.background = '#94a3b8';
      }
      if (statusText) statusText.textContent = 'Standalone Client Mode (LocalStorage Sync)';
      if (networkPill) networkPill.style.display = 'none';
    }
  }

  // ----------------------------------------------------------------
  // 3. QUOTATIONS API
  // ----------------------------------------------------------------
  async function saveQuotation(quotePayload) {
    if (!isBackendLive) {
      showToast('Backend offline. Saved locally in browser storage.', 'info');
      return { success: false, offline: true };
    }

    try {
      const res = await fetch(`${BASE_URL}/api/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotePayload)
      });
      const result = await res.json();
      if (result.success) {
        showToast(`Quotation #${result.quote_no} saved to Database!`, 'success');
        refreshQuotationsList();
        return result;
      } else {
        showToast(result.error || 'Failed to save quotation', 'error');
        return result;
      }
    } catch (err) {
      showToast('Network error saving quotation to server.', 'error');
      return { success: false, error: err.message };
    }
  }

  async function fetchQuotations(search = '', status = '') {
    if (!isBackendLive) return [];
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status) params.append('status', status);

      const res = await fetch(`${BASE_URL}/api/quotations?${params.toString()}`);
      const json = await res.json();
      return json.data || [];
    } catch (err) {
      console.error('Error fetching quotations:', err);
      return [];
    }
  }

  async function deleteQuotation(id) {
    if (!confirm(`Are you sure you want to delete Quotation #${id} from the database?`)) return;

    try {
      const res = await fetch(`${BASE_URL}/api/quotations/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast(`Quotation #${id} deleted from database`, 'success');
        refreshQuotationsList();
      }
    } catch (err) {
      showToast('Error deleting quotation', 'error');
    }
  }

  async function refreshQuotationsList() {
    const tbody = document.getElementById('quotationsTableBody');
    if (!tbody) return;

    const searchInput = document.getElementById('quoteSearchInput');
    const statusSelect = document.getElementById('quoteStatusFilter');
    const search = searchInput ? searchInput.value.trim() : '';
    const status = statusSelect ? statusSelect.value : '';

    const quotes = await fetchQuotations(search, status);
    const countBadge = document.getElementById('quoteListCountBadge');
    if (countBadge) countBadge.textContent = `${quotes.length} Records`;

    if (quotes.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 32px; color: var(--muted);">
            No quotation bills found in database. Create a new quotation above and click "Save to Database"!
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = quotes.map(q => {
      const statusClass = `status-${(q.status || 'draft').toLowerCase()}`;
      const totalFmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(q.grand_total);
      const dateStr = new Date(q.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      return `
        <tr>
          <td><strong style="color: var(--ink);">${escapeHTML(q.quote_no)}</strong></td>
          <td>
            <strong>${escapeHTML(q.customer_name)}</strong>
            ${q.company_name ? `<br><small style="color: var(--muted);">${escapeHTML(q.company_name)}</small>` : ''}
          </td>
          <td>${dateStr}</td>
          <td><strong>${totalFmt}</strong></td>
          <td><span class="status-badge ${statusClass}">${escapeHTML(q.status || 'Draft')}</span></td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="TEI_API.loadQuotationIntoEditor(${q.id})" title="Load into Editor">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="TEI_API.deleteQuotation(${q.id})" title="Delete">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  async function loadQuotationIntoEditor(id) {
    try {
      const res = await fetch(`${BASE_URL}/api/quotations/${id}`);
      const json = await res.json();
      if (!json.success || !json.data) return;

      const q = json.data;
      if (typeof quoteData !== 'undefined') {
        quoteData.quoteNo = q.quote_no;
        quoteData.customer.name = q.customer_name;
        quoteData.customer.company = q.company_name;
        quoteData.customer.gstin = q.gstin;
        quoteData.customer.phone = q.phone;
        quoteData.customer.email = q.email;
        quoteData.customer.billingAddress = q.billing_address;
        quoteData.customer.shippingAddress = q.shipping_address;
        quoteData.taxType = q.tax_type;
        quoteData.freight = q.freight || 0;
        quoteData.discount = q.discount || 0;

        try {
          quoteData.items = JSON.parse(q.items_json);
        } catch (e) {
          quoteData.items = [];
        }

        if (typeof populateFormFromState === 'function') {
          populateFormFromState();
        }
        if (typeof recalculateTotals === 'function') {
          recalculateTotals();
        }

        const quoteSection = document.getElementById('quotation-tool');
        if (quoteSection) {
          quoteSection.scrollIntoView({ behavior: 'smooth' });
        }
        showToast(`Loaded Quotation ${q.quote_no} into editor`, 'success');
      }
    } catch (e) {
      showToast('Failed to load quotation details', 'error');
    }
  }

  // ----------------------------------------------------------------
  // 4. INQUIRIES SUBMISSION API
  // ----------------------------------------------------------------
  async function submitInquiry(formData) {
    if (!isBackendLive) {
      showToast('Message received! (Running in demo offline mode)', 'success');
      return { success: true };
    }
    try {
      const res = await fetch(`${BASE_URL}/api/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success', 5000);
        return data;
      } else {
        showToast(data.error || 'Failed to submit inquiry', 'error');
        return data;
      }
    } catch (e) {
      showToast('Error sending inquiry', 'error');
      return { success: false };
    }
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ----------------------------------------------------------------
  // INITIALIZATION ON DOM READY
  // ----------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', async () => {
    await checkServerHealth();

    if (isBackendLive) {
      refreshQuotationsList();

      // Periodic refresh every 15 seconds
      pollInterval = setInterval(() => {
        refreshQuotationsList();
      }, 15000);
    }

    // Attach search & filter listeners
    const searchInput = document.getElementById('quoteSearchInput');
    const statusSelect = document.getElementById('quoteStatusFilter');
    if (searchInput) searchInput.addEventListener('input', () => refreshQuotationsList());
    if (statusSelect) statusSelect.addEventListener('change', () => refreshQuotationsList());

    // Attach contact form listener
    const contactForm = document.getElementById('inquiryForm');
    if (contactForm) {
      contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          name: document.getElementById('inqName').value.trim(),
          company: document.getElementById('inqCompany').value.trim(),
          phone: document.getElementById('inqPhone').value.trim(),
          email: document.getElementById('inqEmail').value.trim(),
          product_interest: document.getElementById('inqProduct').value,
          quantity: parseInt(document.getElementById('inqQty').value, 10) || 50,
          message: document.getElementById('inqMsg').value.trim()
        };
        const res = await submitInquiry(payload);
        if (res.success) {
          contactForm.reset();
        }
      });
    }
  });

  return {
    showToast,
    saveQuotation,
    fetchQuotations,
    deleteQuotation,
    refreshQuotationsList,
    loadQuotationIntoEditor,
    submitInquiry
  };
})();
