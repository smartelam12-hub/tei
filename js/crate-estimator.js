/**
 * TEI PACKAGE - Custom Crate & Bin Quotation Estimator
 * Models exact industrial cost estimation: Crate Dimensions & Structure,
 * Partition & Sheet Dimension Formula (HDPE 3mm/5mm/8mm, XLPE 2mm, Welding Rod, Adisave),
 * Labour work matrix, BOM, Auto-generated description, Multi-tab sizes, and CSV/PDF export.
 * Clean, reactive, non-duplicate partition data architecture.
 */

// Master Material Standard Specifications ("Cost Break Down")
const MASTER_COST_BREAKDOWN = [
  { material: "HDPE 3 MM", stdLength: 2000, stdWidth: 1200, price: 1383, totalSize: 2400000, wastagePercent: 1.2 },
  { material: "HDPE 5 MM", stdLength: 2000, stdWidth: 1200, price: 2268, totalSize: 2400000, wastagePercent: 1.2 },
  { material: "HDPE 8 MM", stdLength: 2000, stdWidth: 1200, price: 3830.40, totalSize: 2400000, wastagePercent: 1.2 },
  { material: "XLPE 2 mm", stdLength: 100000, stdWidth: 980, price: 17400, totalSize: 98000000, wastagePercent: 1.2 },
  { material: "Welding Rod", stdLength: 5000, stdWidth: 1, price: 180, totalSize: 5000, wastagePercent: 1.2 },
  { material: "DUST COVER", stdLength: 0, stdWidth: 0, price: 600, totalSize: 0, wastagePercent: 1.2 },
  { material: "ADISAVE", stdLength: 5000, stdWidth: 1, price: 10, totalSize: 5000, wastagePercent: 1.2 }
];
window.MASTER_COST_BREAKDOWN = MASTER_COST_BREAKDOWN;

// Initial Labour Work Operations
const DEFAULT_WORK_OPS = [
  { id: "cutting", name: "Cutting", min: 0, hrs: 0, manHrs: 0, rate: 0, amount: 0 },
  { id: "drilling", name: "Drilling", min: 0, hrs: 0, manHrs: 0, rate: 0, amount: 0 },
  { id: "welding", name: "Welding", min: 0, hrs: 0, manHrs: 0, rate: 0, amount: 0 },
  { id: "painting", name: "Painting", min: 0, hrs: 0, manHrs: 0, rate: 0, amount: 0 },
  { id: "dcFixing", name: "DC Fixing", min: 0, hrs: 0, manHrs: 0, rate: 0, amount: 0 },
  { id: "pasteAdisave", name: "Paste-Adisave", min: 0, hrs: 0, manHrs: 0, rate: 0, amount: 0 },
  { id: "grinding", name: "Grinding", min: 0, hrs: 0, manHrs: 0, rate: 0, amount: 0 },
  { id: "removing", name: "Removing", min: 0, hrs: 0, manHrs: 0, rate: 0, amount: 0 },
  { id: "washingCleaning", name: "Washing/Cleaning", min: 0, hrs: 0, manHrs: 0, rate: 0, amount: 0 }
];

// Initial Bill of Materials
const DEFAULT_MATERIALS = [
  { id: "plasticCrate", name: "Plastic crate", qty: 1, rate: 0, amount: 0 },
  { id: "hdpeSheet", name: "HDPE sheet (Partitions)", qty: 0, rate: 0, amount: 0 },
  { id: "xlpeSheet", name: "XLPE sheet (Fitments)", qty: 0, rate: 0, amount: 0 },
  { id: "nettedTape", name: "Netted tape", qty: 0, rate: 0, amount: 0 },
  { id: "dustCover", name: "Dust cover", qty: 0, rate: 0, amount: 0 },
  { id: "rivets", name: "Rivets", qty: 0, rate: 0, amount: 0 },
  { id: "plasticLid", name: "Plastic lid", qty: 0, rate: 0, amount: 0 },
  { id: "screenPrinting", name: "Screen printing", qty: 0, rate: 0, amount: 0 },
  { id: "cardHolder", name: "Card holder", qty: 0, rate: 0, amount: 0 }
];

// Quote Dataset with Clean Deduplicated Partition Matrix
let teiQuotes = [
  {
    id: "TEI-DEMO-001",
    quotationNo: "TEI-DEMO-001",
    date: "2026-11-02",
    customer: "TVS Motor Company Ltd",
    contact: "Mr. Suresh Kumar",
    address: "Harita, Hosur, Tamil Nadu - 635109",
    partName: "Engine Valve Transit Crate",
    partNo: "TEI-EV-6040",
    reference: "RFQ-2026-TVS-09",
    odLength: "600",
    odWidth: "400",
    odHeight: "325",
    idLength: "565",
    idWidth: "365",
    idHeight: "310",
    make: "Tuff",
    quantity: 100,
    colour: "Green",
    bottomType: "Reinforced Solid",
    hdpeThickness: "3.0",
    xlpeThickness: "10.0",
    // Clean partition structure (Zero duplicate rows)
    partitions: [
      { material: "HDPE 3 MM", l: 560, h: 150, qty: 6, weldingCost: 0 }
    ],
    nettedTape: "Yes",
    dustCover: "Yes",
    rivetMaterial: "Aluminium",
    rivetCount: 16,
    plasticLid: "No",
    screenPrinting: "Yes",
    cardHolderType: "Integrated PP",
    cardHolderColour: "Transparent",
    cardHolderSize: "150 x 100 mm",
    cardHolderPockets: "1",
    wastagePercent: 5,
    gstPercent: 18,
    notes: "Special anti-abrasion XLPE partition for engine valves. Dispatch via direct truck.",
    workOps: [
      { id: "cutting", name: "Cutting", min: 12, hrs: 0.20, manHrs: 0.20, rate: 150, amount: 30.00 },
      { id: "drilling", name: "Drilling", min: 8, hrs: 0.13, manHrs: 0.13, rate: 150, amount: 19.50 },
      { id: "welding", name: "Welding", min: 0, hrs: 0, manHrs: 0, rate: 0, amount: 0 },
      { id: "painting", name: "Painting", min: 0, hrs: 0, manHrs: 0, rate: 0, amount: 0 },
      { id: "dcFixing", name: "DC Fixing", min: 6, hrs: 0.10, manHrs: 0.10, rate: 150, amount: 15.00 },
      { id: "pasteAdisave", name: "Paste-Adisave", min: 10, hrs: 0.17, manHrs: 0.17, rate: 150, amount: 25.50 },
      { id: "grinding", name: "Grinding", min: 4, hrs: 0.07, manHrs: 0.07, rate: 150, amount: 10.50 },
      { id: "removing", name: "Removing", min: 0, hrs: 0, manHrs: 0, rate: 0, amount: 0 },
      { id: "washingCleaning", name: "Washing/Cleaning", min: 5, hrs: 0.08, manHrs: 0.08, rate: 150, amount: 12.00 }
    ],
    materials: [
      { id: "plasticCrate", name: "Plastic crate", qty: 1, rate: 580, amount: 580.00 },
      { id: "hdpeSheet", name: "HDPE sheet (Partitions)", qty: 1, rate: 348.52, amount: 348.52 },
      { id: "xlpeSheet", name: "XLPE sheet (Fitments)", qty: 0, rate: 0, amount: 0 },
      { id: "nettedTape", name: "Netted tape", qty: 4, rate: 8, amount: 32.00 },
      { id: "dustCover", name: "Dust cover", qty: 1, rate: 75, amount: 75.00 },
      { id: "rivets", name: "Rivets", qty: 16, rate: 1.5, amount: 24.00 },
      { id: "plasticLid", name: "Plastic lid", qty: 0, rate: 0, amount: 0 },
      { id: "screenPrinting", name: "Screen printing", qty: 1, rate: 25, amount: 25.00 },
      { id: "cardHolder", name: "Card holder", qty: 1, rate: 35, amount: 35.00 }
    ]
  },
  {
    id: "TEI-DEMO-002",
    quotationNo: "TEI-DEMO-002",
    date: "2026-11-02",
    customer: "",
    contact: "",
    address: "",
    partName: "",
    partNo: "",
    reference: "",
    odLength: "",
    odWidth: "",
    odHeight: "",
    idLength: "",
    idWidth: "",
    idHeight: "",
    make: "Tuff",
    quantity: 1,
    colour: "Green",
    bottomType: "",
    hdpeThickness: "3.0",
    xlpeThickness: "",
    partitions: [],
    nettedTape: "Yes",
    dustCover: "Yes",
    rivetMaterial: "",
    rivetCount: 0,
    plasticLid: "No",
    screenPrinting: "No",
    cardHolderType: "",
    cardHolderColour: "",
    cardHolderSize: "",
    cardHolderPockets: "",
    wastagePercent: 0,
    gstPercent: 18,
    notes: "",
    workOps: JSON.parse(JSON.stringify(DEFAULT_WORK_OPS)),
    materials: JSON.parse(JSON.stringify(DEFAULT_MATERIALS))
  }
];
window.teiQuotes = teiQuotes;

let activeQuoteId = "TEI-DEMO-001";

// Helper format functions
function formatINR(num) {
  if (typeof window.formatINR === "function") return window.formatINR(num);
  return Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  renderQuoteTabs();
  loadQuoteData(activeQuoteId);
});

// Render Quote Tabs (e.g., TEI-DEMO-001, TEI-DEMO-002, + New size)
function renderQuoteTabs() {
  const container = document.getElementById("quoteTabsContainer");
  if (!container) return;

  container.innerHTML = "";
  teiQuotes.forEach(q => {
    const btn = document.createElement("button");
    btn.className = `quote-tab-pill ${q.id === activeQuoteId ? "active" : ""}`;
    btn.textContent = q.quotationNo || q.id;
    btn.onclick = () => switchQuoteTab(q.id);
    container.appendChild(btn);
  });

  const addBtn = document.createElement("button");
  addBtn.className = "quote-tab-pill add-tab-btn";
  addBtn.textContent = "+ New size";
  addBtn.onclick = addNewQuoteTab;
  container.appendChild(addBtn);
}

// Switch Active Tab
window.switchQuoteTab = function(id) {
  activeQuoteId = id;
  renderQuoteTabs();
  loadQuoteData(id);
};

// Add New Size Tab
window.addNewQuoteTab = function() {
  const num = teiQuotes.length + 1;
  const newId = `TEI-DEMO-00${num}`;
  const today = new Date().toISOString().split("T")[0];

  const newQuote = {
    id: newId,
    quotationNo: newId,
    date: today,
    customer: "",
    contact: "",
    address: "",
    partName: "",
    partNo: "",
    reference: "",
    odLength: "",
    odWidth: "",
    odHeight: "",
    idLength: "",
    idWidth: "",
    idHeight: "",
    make: "Tuff",
    quantity: 1,
    colour: "Green",
    bottomType: "",
    hdpeThickness: "3.0",
    xlpeThickness: "",
    partitions: [],
    nettedTape: "Yes",
    dustCover: "Yes",
    rivetMaterial: "",
    rivetCount: 0,
    plasticLid: "No",
    screenPrinting: "No",
    cardHolderType: "",
    cardHolderColour: "",
    cardHolderSize: "",
    cardHolderPockets: "",
    wastagePercent: 0,
    gstPercent: 18,
    notes: "",
    workOps: JSON.parse(JSON.stringify(DEFAULT_WORK_OPS)),
    materials: JSON.parse(JSON.stringify(DEFAULT_MATERIALS))
  };

  teiQuotes.push(newQuote);
  activeQuoteId = newId;
  renderQuoteTabs();
  loadQuoteData(newId);
  showEstimatorToast(`Created new size tab: ${newId}`);
};

// Delete Current Size Tab
window.deleteCurrentQuoteTab = function() {
  if (teiQuotes.length <= 1) {
    showEstimatorToast("At least one quotation tab must remain.");
    return;
  }
  if (!confirm(`Delete size quotation tab "${activeQuoteId}"?`)) return;

  const idx = teiQuotes.findIndex(q => q.id === activeQuoteId);
  if (idx >= 0) {
    teiQuotes.splice(idx, 1);
    activeQuoteId = teiQuotes[0].id;
    renderQuoteTabs();
    loadQuoteData(activeQuoteId);
    showEstimatorToast("Tab deleted.");
  }
};

// Load quote data into form inputs
function loadQuoteData(id) {
  const q = teiQuotes.find(item => item.id === id);
  if (!q) return;

  // Header and specifications
  setFormVal("estQuoteNo", q.quotationNo);
  setFormVal("estDate", q.date);
  setFormVal("estCustomer", q.customer);
  setFormVal("estContact", q.contact);
  setFormVal("estAddress", q.address);
  setFormVal("estPartName", q.partName);
  setFormVal("estPartNo", q.partNo);
  setFormVal("estReference", q.reference);
  setFormVal("estOdLength", q.odLength);
  setFormVal("estOdWidth", q.odWidth);
  setFormVal("estOdHeight", q.odHeight);
  setFormVal("estIdLength", q.idLength);
  setFormVal("estIdWidth", q.idWidth);
  setFormVal("estIdHeight", q.idHeight);
  setFormVal("estMake", q.make);
  setFormVal("estQuantity", q.quantity);
  setFormVal("estColour", q.colour);
  setFormVal("estBottomType", q.bottomType);
  setFormVal("estHdpeThickness", q.hdpeThickness);
  setFormVal("estXlpeThickness", q.xlpeThickness);
  setFormVal("estNettedTape", q.nettedTape);
  setFormVal("estDustCover", q.dustCover);
  setFormVal("estRivetMaterial", q.rivetMaterial);
  setFormVal("estRivetCount", q.rivetCount);
  setFormVal("estPlasticLid", q.plasticLid);
  setFormVal("estScreenPrinting", q.screenPrinting);
  setFormVal("estCardHolderType", q.cardHolderType);
  setFormVal("estCardHolderColour", q.cardHolderColour);
  setFormVal("estCardHolderSize", q.cardHolderSize);
  setFormVal("estCardHolderPockets", q.cardHolderPockets);
  setFormVal("estWastagePercent", q.wastagePercent);
  setFormVal("estGstPercent", q.gstPercent);
  setFormVal("estNotes", q.notes);

  renderPartitionsTable(q);
  renderWorkOpsTable(q);
  renderMaterialsTable(q);
  recalculateEstimator(q);
}

function setFormVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val !== undefined && val !== null ? val : "";
}

// ==========================================================================
// PARTITIONS & SHEET SIZING FORMULA MATRIX (Cost Break Down Engine)
// Replaces static duplicate rows with reactive dynamic non-NaN calculations
// ==========================================================================

function renderPartitionsTable(q) {
  const tbody = document.getElementById("partitionsTbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!q.partitions || q.partitions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align: center; padding: 18px; color: var(--muted);">
          No custom partitions added yet. Click "+ Add Partition Piece" below to calculate sheet sizes and costs.
        </td>
      </tr>
    `;
    setText("partTotalArea", "0 mm²");
    setText("partHdpeCost", "₹0.00");
    setText("partXlpeCost", "₹0.00");
    setText("partGrandCost", "₹0.00");
    return;
  }

  let totalArea = 0;
  let totalHdpe = 0;
  let totalXlpe = 0;
  let grandPartitionCost = 0;

  q.partitions.forEach((p, idx) => {
    const matSpec = MASTER_COST_BREAKDOWN.find(m => m.material === p.material) || MASTER_COST_BREAKDOWN[0];
    const l = parseFloat(p.l) || 0;
    const h = parseFloat(p.h) || 0;
    const qty = parseFloat(p.qty) || 0;
    const totalSize = l * h * qty;
    totalArea += totalSize;

    // Cutting Yield (Pieces that can be made per standard raw sheet)
    let yieldPerSheet = 0;
    if (l > 0 && h > 0 && matSpec.stdLength > 0 && matSpec.stdWidth > 0) {
      const normal = Math.floor(matSpec.stdLength / l) * Math.floor(matSpec.stdWidth / h);
      const rotated = Math.floor(matSpec.stdLength / h) * Math.floor(matSpec.stdWidth / l);
      yieldPerSheet = Math.max(normal, rotated);
    }

    // Exact Industrial Sheet Cost / Bin formula with wastage
    let sheetCost = 0;
    if (matSpec.totalSize > 0) {
      const ratePerSqMm = (matSpec.price * matSpec.wastagePercent) / matSpec.totalSize;
      sheetCost = totalSize * ratePerSqMm;
    }

    const weldGlue = parseFloat(p.weldingCost) || 0;
    const rowTotal = sheetCost + weldGlue;

    if (p.material.startsWith("HDPE")) {
      totalHdpe += rowTotal;
    } else if (p.material.startsWith("XLPE")) {
      totalXlpe += rowTotal;
    }
    grandPartitionCost += rowTotal;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <select onchange="updatePartitionField(${idx}, 'material', this.value)" style="font-size: 11.5px; padding: 4px;">
          ${MASTER_COST_BREAKDOWN.filter(m => m.stdLength > 0).map(m => `
            <option value="${m.material}" ${m.material === p.material ? 'selected' : ''}>${m.material}</option>
          `).join('')}
        </select>
      </td>
      <td style="text-align: center; color: var(--muted); font-weight: 700;">${idx + 1}</td>
      <td style="text-align: center;">
        <input type="number" min="0" step="1" value="${p.l || 0}" 
               oninput="updatePartitionField(${idx}, 'l', this.value)" 
               class="col-input-num"
               style="width: 85px; text-align: center; font-size: 13px; font-weight: 700;">
      </td>
      <td style="text-align: center;">
        <input type="number" min="0" step="1" value="${p.h || 0}" 
               oninput="updatePartitionField(${idx}, 'h', this.value)" 
               class="col-input-num"
               style="width: 85px; text-align: center; font-size: 13px; font-weight: 700;">
      </td>
      <td style="text-align: center;">
        <input type="number" min="0" step="1" value="${p.qty || 0}" 
               oninput="updatePartitionField(${idx}, 'qty', this.value)" 
               class="col-input-num"
               style="width: 75px; text-align: center; font-size: 13px; font-weight: 700;">
      </td>
      <td style="text-align: right; font-variant-numeric: tabular-nums; font-weight: 700;">
        ${totalSize.toLocaleString('en-IN')}
      </td>
      <td style="text-align: center; color: var(--power-blue); font-weight: 800; font-size: 13px;">
        ${yieldPerSheet}
      </td>
      <td style="text-align: right; font-variant-numeric: tabular-nums; font-weight: 700;">
        ₹${formatINR(sheetCost)}
      </td>
      <td style="text-align: center;">
        <input type="number" min="0" step="1" value="${p.weldingCost || 0}" 
               oninput="updatePartitionField(${idx}, 'weldingCost', this.value)" 
               class="col-input-num"
               style="width: 75px; text-align: center; font-size: 13px; font-weight: 700;">
      </td>
      <td style="text-align: right; font-weight: 800; color: var(--power-blue); font-variant-numeric: tabular-nums;">
        ₹${formatINR(rowTotal)}
      </td>
      <td style="text-align: center;">
        <button type="button" class="btn-remove-row" onclick="removePartitionRow(${idx})" title="Remove partition piece">✕</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Update Summary UI
  setText("partTotalArea", `${totalArea.toLocaleString('en-IN')} mm²`);
  setText("partHdpeCost", `₹${formatINR(totalHdpe)}`);
  setText("partXlpeCost", `₹${formatINR(totalXlpe)}`);
  setText("partGrandCost", `₹${formatINR(grandPartitionCost)}`);

  // Direct Synchronization into Form 4 Material BOM
  const hdpeMat = q.materials.find(m => m.id === "hdpeSheet");
  if (hdpeMat) {
    hdpeMat.qty = totalHdpe > 0 ? 1 : 0;
    hdpeMat.rate = Math.round(totalHdpe * 100) / 100;
    hdpeMat.amount = hdpeMat.rate;
  }
  const xlpeMat = q.materials.find(m => m.id === "xlpeSheet");
  if (xlpeMat) {
    xlpeMat.qty = totalXlpe > 0 ? 1 : 0;
    xlpeMat.rate = Math.round(totalXlpe * 100) / 100;
    xlpeMat.amount = xlpeMat.rate;
  }
}

// Add New Partition Piece
window.addNewPartitionRow = function() {
  const q = teiQuotes.find(item => item.id === activeQuoteId);
  if (!q) return;
  if (!q.partitions) q.partitions = [];
  q.partitions.push({
    material: "HDPE 3 MM",
    l: 0,
    h: 0,
    qty: 1,
    weldingCost: 0
  });
  renderPartitionsTable(q);
  renderMaterialsTable(q);
  recalculateEstimator(q);
};

// Remove Partition Piece
window.removePartitionRow = function(idx) {
  const q = teiQuotes.find(item => item.id === activeQuoteId);
  if (!q || !q.partitions || !q.partitions[idx]) return;
  q.partitions.splice(idx, 1);
  renderPartitionsTable(q);
  renderMaterialsTable(q);
  recalculateEstimator(q);
};

// Update Partition Field
window.updatePartitionField = function(idx, field, val) {
  const q = teiQuotes.find(item => item.id === activeQuoteId);
  if (!q || !q.partitions || !q.partitions[idx]) return;
  if (field === "material") {
    q.partitions[idx].material = val;
  } else {
    q.partitions[idx][field] = parseFloat(val) || 0;
  }
  renderPartitionsTable(q);
  renderMaterialsTable(q);
  recalculateEstimator(q);
};

// Master Raw Material Standards ("Cost Break Down") Modal
function renderMasterRatesTable() {
  const tbody = document.getElementById("masterRatesTbody");
  if (!tbody) return;
  tbody.innerHTML = MASTER_COST_BREAKDOWN.map(m => `
    <tr>
      <td><strong>${m.material}</strong></td>
      <td style="text-align: right;">${m.stdLength ? m.stdLength.toLocaleString('en-IN') : '-'}</td>
      <td style="text-align: right;">${m.stdWidth ? m.stdWidth.toLocaleString('en-IN') : '-'}</td>
      <td style="text-align: right; font-weight: 700; color: var(--purple-primary);">₹${m.price.toLocaleString('en-IN')}</td>
      <td style="text-align: right;">${m.totalSize ? m.totalSize.toLocaleString('en-IN') : '-'}</td>
      <td style="text-align: right;">${m.wastagePercent} (${Math.round((m.wastagePercent - 1) * 100)}%)</td>
    </tr>
  `).join('');
}

window.toggleMasterRatesModal = function() {
  const modal = document.getElementById("masterRatesModal");
  if (!modal) return;
  modal.classList.toggle("active");
  if (modal.classList.contains("active")) {
    renderMasterRatesTable();
  }
};

// ==========================================================================
// LABOUR / WORK OPERATIONS & MATERIAL BOM
// ==========================================================================

// Render Labour / Work Matrix
function renderWorkOpsTable(q) {
  const tbody = document.getElementById("workOpsTbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  q.workOps.forEach((op, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${op.name}</strong></td>
      <td style="text-align: center;">
        <input type="number" min="0" step="1" value="${op.min || 0}" 
               oninput="updateWorkField(${idx}, 'min', this.value)" 
               class="col-input-num"
               style="width: 80px; text-align: center; font-size: 13px; font-weight: 700;">
      </td>
      <td style="text-align: right; font-weight: 700; font-variant-numeric: tabular-nums;" id="op-hrs-${idx}">${op.hrs.toFixed(2)}</td>
      <td style="text-align: center;">
        <input type="number" min="0" step="0.01" value="${op.manHrs !== undefined ? op.manHrs : op.hrs.toFixed(2)}" 
               oninput="updateWorkField(${idx}, 'manHrs', this.value)" 
               class="col-input-num"
               style="width: 85px; text-align: center; font-size: 13px; font-weight: 700;">
      </td>
      <td style="text-align: center;">
        <input type="number" min="0" step="1" value="${op.rate || 0}" 
               oninput="updateWorkField(${idx}, 'rate', this.value)" 
               class="col-input-num"
               style="width: 85px; text-align: center; font-size: 13px; font-weight: 700;">
      </td>
      <td style="text-align: right; font-weight: 800; color: var(--ink); font-variant-numeric: tabular-nums;" id="op-amount-${idx}">
        ₹${formatINR(op.amount)}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Render Bill of Materials
function renderMaterialsTable(q) {
  const tbody = document.getElementById("materialsTbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  q.materials.forEach((mat, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${mat.name}</strong></td>
      <td style="text-align: center;">
        <input type="number" min="0" step="1" value="${mat.qty || 0}" 
               oninput="updateMaterialField(${idx}, 'qty', this.value)" 
               class="col-input-num"
               style="width: 75px; text-align: center; font-size: 13px; font-weight: 700;">
      </td>
      <td style="text-align: center;">
        <input type="number" min="0" step="0.5" value="${mat.rate || 0}" 
               oninput="updateMaterialField(${idx}, 'rate', this.value)" 
               class="col-input-num"
               style="width: 85px; text-align: center; font-size: 13px; font-weight: 700;">
      </td>
      <td style="text-align: right; font-weight: 700; color: var(--ink);" id="mat-amount-${idx}">
        ₹${formatINR(mat.amount)}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Live Update for Technical Specs
window.updateSpecField = function(field, value) {
  const q = teiQuotes.find(item => item.id === activeQuoteId);
  if (!q) return;

  if (field === "quantity" || field === "rivetCount" || field === "wastagePercent" || field === "gstPercent") {
    q[field] = parseFloat(value) || 0;
  } else {
    q[field] = value;
  }

  // Update tab title if quotation number changes
  if (field === "quotationNo") {
    renderQuoteTabs();
  }

  recalculateEstimator(q);
};

// Live Update for Work Operations
window.updateWorkField = function(idx, field, value) {
  const q = teiQuotes.find(item => item.id === activeQuoteId);
  if (!q || !q.workOps[idx]) return;

  const op = q.workOps[idx];
  const numVal = parseFloat(value) || 0;

  if (field === "min") {
    op.min = numVal;
    op.hrs = numVal / 60;
    op.manHrs = op.hrs;
    const hrsEl = document.getElementById(`op-hrs-${idx}`);
    if (hrsEl) hrsEl.textContent = op.hrs.toFixed(2);
  } else if (field === "manHrs") {
    op.manHrs = numVal;
  } else if (field === "rate") {
    op.rate = numVal;
  }

  op.amount = op.manHrs * op.rate;
  const amtEl = document.getElementById(`op-amount-${idx}`);
  if (amtEl) amtEl.textContent = `₹${formatINR(op.amount)}`;

  recalculateEstimator(q);
};

// Live Update for Materials
window.updateMaterialField = function(idx, field, value) {
  const q = teiQuotes.find(item => item.id === activeQuoteId);
  if (!q || !q.materials[idx]) return;

  const mat = q.materials[idx];
  const numVal = parseFloat(value) || 0;

  if (field === "qty") {
    mat.qty = numVal;
  } else if (field === "rate") {
    mat.rate = numVal;
  }

  mat.amount = mat.qty * mat.rate;
  const amtEl = document.getElementById(`mat-amount-${idx}`);
  if (amtEl) amtEl.textContent = `₹${formatINR(mat.amount)}`;

  recalculateEstimator(q);
};

// Generate Product Description string
function generateProductDescription(q) {
  let parts = [];

  const make = q.make || "Plastic";
  let baseDesc = `${make} plastic crate`;
  if (q.odLength && q.odWidth && q.odHeight) {
    baseDesc += ` (${q.odLength}x${q.odWidth}x${q.odHeight} mm)`;
  }
  parts.push(baseDesc);

  if (q.colour) {
    parts.push(`${q.colour} colour`);
  }
  if (q.bottomType) {
    parts.push(`${q.bottomType} bottom`);
  }

  // Include Partition specifications if present
  if (q.partitions && q.partitions.length > 0) {
    const partSummary = q.partitions
      .filter(p => p.l > 0 && p.h > 0 && p.qty > 0)
      .map(p => `${p.material} partition (${p.l}x${p.h} mm, ${p.qty} nos)`);
    if (partSummary.length > 0) {
      parts.push(partSummary.join(", "));
    }
  }

  if (q.nettedTape === "Yes") {
    parts.push("with netted tape");
  }
  if (q.dustCover === "Yes") {
    parts.push("with dust cover");
  }
  if (q.plasticLid === "Yes") {
    parts.push("with plastic lid");
  }
  if (q.screenPrinting === "Yes") {
    parts.push("with screen printing");
  }
  if (q.cardHolderType) {
    let chDesc = `${q.cardHolderType} card holder`;
    if (q.cardHolderPockets) chDesc += ` (${q.cardHolderPockets} pocket)`;
    parts.push(chDesc);
  }

  return parts.join(", ") + ".";
}

// Master Recalculation
function recalculateEstimator(q) {
  // Labour Total
  let labourTotal = 0;
  q.workOps.forEach(op => {
    labourTotal += op.amount || 0;
  });

  // Material Total
  let materialTotal = 0;
  q.materials.forEach(mat => {
    materialTotal += mat.amount || 0;
  });

  // Unit Cost
  const unitCost = materialTotal + labourTotal;
  const qty = parseFloat(q.quantity) || 1;
  const subtotal = unitCost * qty;

  // GST
  const gstRate = parseFloat(q.gstPercent) || 0;
  const gstAmount = subtotal * (gstRate / 100);
  const grandTotal = subtotal + gstAmount;

  // Description
  const description = generateProductDescription(q);

  // Update UI Elements
  setText("estLabourTotal", `₹${formatINR(labourTotal)}`);
  setText("estLabourTotalVal", `₹${formatINR(labourTotal)}`);
  setText("estMaterialTotal", `₹${formatINR(materialTotal)}`);
  setText("estMaterialTotalVal", `₹${formatINR(materialTotal)}`);
  setText("estUnitCost", `₹${formatINR(unitCost)}`);
  setText("estSubtotal", `₹${formatINR(subtotal)}`);
  setText("estGstAmount", `₹${formatINR(gstAmount)} (${gstRate}%)`);
  setText("estGrandTotal", `₹${formatINR(grandTotal)}`);
  setText("estGrandTotalHeader", `₹${formatINR(grandTotal)}`);

  const descEl = document.getElementById("estProductDesc");
  if (descEl) descEl.textContent = description;

  const descInput = document.getElementById("estProductDescInput");
  if (descInput) descInput.value = description;

  // Words
  const wordsEl = document.getElementById("estGrandTotalWords");
  if (wordsEl && typeof numberToWordsINR === "function") {
    wordsEl.textContent = numberToWordsINR(Math.round(grandTotal));
  }

  // Sync to printable sheet
  syncEstimatorToPrint(q, {
    materialTotal,
    labourTotal,
    unitCost,
    qty,
    subtotal,
    gstRate,
    gstAmount,
    grandTotal,
    description
  });
}

// Sync to Printable View
function syncEstimatorToPrint(q, calc) {
  setText("prQuoteNo", q.quotationNo);
  setText("prDate", q.date);
  setText("prCustomer", q.customer || "M/s Customer Name");
  setText("prContact", q.contact ? `Attn: ${q.contact}` : "");
  setText("prAddress", q.address || "Factory / Delivery Address");
  setText("prPartName", q.partName ? `Part: ${q.partName}` : "");
  setText("prPartNo", q.partNo ? `Part No: ${q.partNo}` : "");
  setText("prReference", q.reference ? `Ref: ${q.reference}` : "");

  setText("prDescription", calc.description);
  setText("prQty", `${calc.qty} Nos`);
  setText("prUnitRate", `₹${formatINR(calc.unitCost)}`);
  setText("prSubtotal", `₹${formatINR(calc.subtotal)}`);
  setText("prMaterialTotal", `₹${formatINR(calc.materialTotal)}`);
  setText("prLabourTotal", `₹${formatINR(calc.labourTotal)}`);
  setText("prGst", `₹${formatINR(calc.gstAmount)} (${calc.gstRate}%)`);
  setText("prGrandTotal", `₹${formatINR(calc.grandTotal)}`);

  // Dimensions & Specs summary
  let dimStr = `OD: ${q.odLength || '-'}x${q.odWidth || '-'}x${q.odHeight || '-'} mm | ID: ${q.idLength || '-'}x${q.idWidth || '-'}x${q.idHeight || '-'} mm | Colour: ${q.colour || '-'} | Make: ${q.make || '-'}`;
  if (q.partitions && q.partitions.length > 0) {
    const pStr = q.partitions
      .filter(p => p.l > 0 && p.h > 0 && p.qty > 0)
      .map(p => `${p.material.split(' ')[0]} ${p.l}x${p.h}x${p.qty}`)
      .join(', ');
    if (pStr) dimStr += ` | Partitions: ${pStr}`;
  }
  setText("prSpecsSummary", dimStr);
  setText("prNotes", q.notes || "Standard manufacturing tolerances apply.");
}

// ==========================================================================
// EXCEL / CSV EXPORT & IMPORT (Clean Deduplicated Format)
// ==========================================================================

window.exportEstimatorCSV = function() {
  const q = teiQuotes.find(item => item.id === activeQuoteId);
  if (!q) return;

  let labourTotal = 0;
  q.workOps.forEach(op => labourTotal += op.amount || 0);

  let materialTotal = 0;
  q.materials.forEach(mat => materialTotal += mat.amount || 0);

  const unitCost = materialTotal + labourTotal;
  const qty = parseFloat(q.quantity) || 1;
  const subtotal = unitCost * qty;
  const gstRate = parseFloat(q.gstPercent) || 0;
  const gstAmt = subtotal * (gstRate / 100);
  const grandTotal = subtotal + gstAmt;
  const description = generateProductDescription(q);

  let lines = [];
  lines.push("Cost Break Down Master Standards,,,,,,");
  lines.push("Material,Std Length (A),Std Breath (B),Price,Total Size MM,% of Wastage");
  MASTER_COST_BREAKDOWN.forEach(m => {
    lines.push(`"${m.material}",${m.stdLength},${m.stdWidth},${m.price},${m.totalSize},${m.wastagePercent}`);
  });
  lines.push("");

  lines.push("Crate Dimensions & Structure Partitions,,,,,,,,");
  lines.push("Material,Item,L,H,No of Sheet /Bin,Total Size,Yield/Sheet,Sheet Cost /Bin,Welding Rod /ADISAVE,Total Cost /Bin");
  if (q.partitions && q.partitions.length > 0) {
    q.partitions.forEach((p, idx) => {
      const matSpec = MASTER_COST_BREAKDOWN.find(m => m.material === p.material) || MASTER_COST_BREAKDOWN[0];
      const totalSize = (p.l || 0) * (p.h || 0) * (p.qty || 0);
      let yieldPerSheet = 0;
      if (p.l > 0 && p.h > 0 && matSpec.stdLength > 0 && matSpec.stdWidth > 0) {
        const normal = Math.floor(matSpec.stdLength / p.l) * Math.floor(matSpec.stdWidth / p.h);
        const rotated = Math.floor(matSpec.stdLength / p.h) * Math.floor(matSpec.stdWidth / p.l);
        yieldPerSheet = Math.max(normal, rotated);
      }
      let sheetCost = 0;
      if (matSpec.totalSize > 0) {
        const ratePerSqMm = (matSpec.price * matSpec.wastagePercent) / matSpec.totalSize;
        sheetCost = totalSize * ratePerSqMm;
      }
      const totalRow = sheetCost + (p.weldingCost || 0);
      lines.push(`"${p.material}",${idx + 1},${p.l || 0},${p.h || 0},${p.qty || 0},${totalSize},${yieldPerSheet},${sheetCost.toFixed(2)},${p.weldingCost || 0},${totalRow.toFixed(2)}`);
    });
  }
  lines.push("");

  lines.push("Field,Value");
  lines.push(`Quotation No,${q.quotationNo || ''}`);
  lines.push(`Date,${q.date || ''}`);
  lines.push(`Customer,"${(q.customer || '').replace(/"/g, '""')}"`);
  lines.push(`Contact,${q.contact || ''}`);
  lines.push(`Address,"${(q.address || '').replace(/"/g, '""')}"`);
  lines.push(`TEI Part Name,${q.partName || ''}`);
  lines.push(`TEI Part No,${q.partNo || ''}`);
  lines.push(`TEI Reference,${q.reference || ''}`);
  lines.push(`OD Length,${q.odLength || ''}`);
  lines.push(`OD Width,${q.odWidth || ''}`);
  lines.push(`OD Height,${q.odHeight || ''}`);
  lines.push(`ID Length,${q.idLength || ''}`);
  lines.push(`ID Width,${q.idWidth || ''}`);
  lines.push(`ID Height,${q.idHeight || ''}`);
  lines.push(`Make,${q.make || ''}`);
  lines.push(`Quantity,${q.quantity || ''}`);
  lines.push(`Colour,${q.colour || ''}`);
  lines.push(`Bottom Type,${q.bottomType || ''}`);
  lines.push(`HDPE Thickness (mm),${q.hdpeThickness || ''}`);
  lines.push(`XLPE Thickness (mm),${q.xlpeThickness || ''}`);
  lines.push(`Netted Tape,${q.nettedTape || 'No'}`);
  lines.push(`Dust Cover,${q.dustCover || 'No'}`);
  lines.push(`Rivet Material,${q.rivetMaterial || ''}`);
  lines.push(`Rivet Count,${q.rivetCount || 0}`);
  lines.push(`Plastic Lid,${q.plasticLid || 'No'}`);
  lines.push(`Screen Printing,${q.screenPrinting || 'No'}`);
  lines.push(`Card Holder Type,${q.cardHolderType || ''}`);
  lines.push(`Card Holder Colour,${q.cardHolderColour || ''}`);
  lines.push(`Card Holder Size,${q.cardHolderSize || ''}`);
  lines.push(`Card Holder Pockets,${q.cardHolderPockets || ''}`);

  // Work Operations
  q.workOps.forEach(op => {
    lines.push(`Work: ${op.name} (min / hrs / man-hrs / rate / amount),${op.min || ''} / ${op.hrs.toFixed(2)} / ${op.manHrs.toFixed(2)} / ${op.rate || ''} / ${op.amount.toFixed(2)}`);
  });

  // Materials
  q.materials.forEach(mat => {
    lines.push(`Cost: ${mat.name} (qty x rate),${mat.qty || ''} x ${mat.rate || ''} = ${mat.amount.toFixed(2)}`);
  });

  lines.push(`"Wastage % (internal indicator)",${q.wastagePercent || ''}`);
  lines.push(`Material Total,${materialTotal}`);
  lines.push(`Labour Total,${labourTotal}`);
  lines.push(`Subtotal,${subtotal}`);
  lines.push(`GST (${gstRate}%),${gstAmt}`);
  lines.push(`Grand Total,${grandTotal}`);
  lines.push(`Product Description,"${description.replace(/"/g, '""')}"`);
  lines.push(`Notes,"${(q.notes || '').replace(/"/g, '""')}"`);

  const csvContent = lines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(q.quotationNo || 'TEI-Quotation').replace(/[\/\\?%*:|"<>]/g, '_')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showEstimatorToast(`Exported ${q.quotationNo}.csv successfully!`);
};

// Import from CSV
window.importEstimatorCSV = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      parseAndApplyCSV(e.target.result);
      showEstimatorToast("CSV quotation imported successfully!");
    } catch (err) {
      alert("Error parsing CSV: " + err.message);
    }
  };
  reader.readAsText(file);
};

function parseAndApplyCSV(csvText) {
  const lines = csvText.split(/\r?\n/);
  const q = teiQuotes.find(item => item.id === activeQuoteId);
  if (!q) return;

  let inPartitions = false;
  let parsedPartitions = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.startsWith("Crate Dimensions & Structure Partitions")) {
      inPartitions = true;
      return;
    }
    if (inPartitions) {
      if (trimmed.startsWith("Field,Value")) {
        inPartitions = false;
      } else if (!trimmed.startsWith("Material,Item")) {
        const parts = trimmed.split(",").map(p => p.replace(/"/g, '').trim());
        if (parts.length >= 5 && parts[0] && parts[0] !== "Total" && !isNaN(parseFloat(parts[2]))) {
          parsedPartitions.push({
            material: parts[0],
            l: parseFloat(parts[2]) || 0,
            h: parseFloat(parts[3]) || 0,
            qty: parseFloat(parts[4]) || 0,
            weldingCost: parseFloat(parts[8]) || 0
          });
        }
      }
      return;
    }

    const match = line.match(/^"?(.*?)"?,\s*"?(.*?)"?$/);
    if (!match) return;

    const key = match[1].trim();
    const val = match[2].trim();

    if (key === "Quotation No") q.quotationNo = val;
    else if (key === "Date") q.date = val;
    else if (key === "Customer") q.customer = val;
    else if (key === "Contact") q.contact = val;
    else if (key === "Address") q.address = val;
    else if (key === "TEI Part Name") q.partName = val;
    else if (key === "TEI Part No") q.partNo = val;
    else if (key === "TEI Reference") q.reference = val;
    else if (key === "OD Length") q.odLength = val;
    else if (key === "OD Width") q.odWidth = val;
    else if (key === "OD Height") q.odHeight = val;
    else if (key === "ID Length") q.idLength = val;
    else if (key === "ID Width") q.idWidth = val;
    else if (key === "ID Height") q.idHeight = val;
    else if (key === "Make") q.make = val;
    else if (key === "Quantity") q.quantity = parseFloat(val) || 1;
    else if (key === "Colour") q.colour = val;
    else if (key === "Bottom Type") q.bottomType = val;
    else if (key === "HDPE Thickness (mm)") q.hdpeThickness = val;
    else if (key === "XLPE Thickness (mm)") q.xlpeThickness = val;
    else if (key === "Netted Tape") q.nettedTape = val;
    else if (key === "Dust Cover") q.dustCover = val;
    else if (key === "Rivet Material") q.rivetMaterial = val;
    else if (key === "Rivet Count") q.rivetCount = parseFloat(val) || 0;
    else if (key === "Plastic Lid") q.plasticLid = val;
    else if (key === "Screen Printing") q.screenPrinting = val;
    else if (key === "Card Holder Type") q.cardHolderType = val;
    else if (key === "Card Holder Colour") q.cardHolderColour = val;
    else if (key === "Card Holder Size") q.cardHolderSize = val;
    else if (key === "Card Holder Pockets") q.cardHolderPockets = val;
    else if (key.startsWith("Work:")) {
      const opName = key.replace("Work:", "").split("(")[0].trim();
      const op = q.workOps.find(o => o.name.toLowerCase() === opName.toLowerCase());
      if (op && val) {
        const parts = val.split("/").map(p => p.trim());
        op.min = parseFloat(parts[0]) || 0;
        op.hrs = parseFloat(parts[1]) || (op.min / 60);
        op.manHrs = parseFloat(parts[2]) || op.hrs;
        op.rate = parseFloat(parts[3]) || 0;
        op.amount = parseFloat(parts[4]) || (op.manHrs * op.rate);
      }
    } else if (key.startsWith("Cost:")) {
      const matName = key.replace("Cost:", "").split("(")[0].trim();
      const mat = q.materials.find(m => m.name.toLowerCase().startsWith(matName.toLowerCase()));
      if (mat && val) {
        const parts = val.split(/x|=/).map(p => p.trim());
        mat.qty = parseFloat(parts[0]) || 0;
        mat.rate = parseFloat(parts[1]) || 0;
        mat.amount = parseFloat(parts[2]) || (mat.qty * mat.rate);
      }
    } else if (key.includes("Wastage %")) {
      q.wastagePercent = parseFloat(val) || 0;
    } else if (key.startsWith("GST")) {
      const matchGst = key.match(/\((\d+)%\)/);
      if (matchGst) q.gstPercent = parseFloat(matchGst[1]) || 0;
    } else if (key === "Notes") {
      q.notes = val;
    }
  });

  if (parsedPartitions.length > 0) {
    q.partitions = parsedPartitions;
  }

  loadQuoteData(activeQuoteId);
}

// Share via WhatsApp
window.shareEstimatorWhatsApp = function() {
  const q = teiQuotes.find(item => item.id === activeQuoteId);
  if (!q) return;

  const desc = generateProductDescription(q);
  const total = document.getElementById("estGrandTotal") ? document.getElementById("estGrandTotal").textContent : "";

  let msg = `*TEI PACKAGE - ESTIMATED QUOTATION*\n`;
  msg += `------------------------------------\n`;
  msg += `*Quote No:* ${q.quotationNo}\n`;
  msg += `*Date:* ${q.date}\n`;
  if (q.customer) msg += `*Customer:* ${q.customer}\n`;
  msg += `*Product:* ${desc}\n`;
  if (q.odLength) msg += `*OD Size:* ${q.odLength}x${q.odWidth}x${q.odHeight} mm\n`;
  msg += `*Quantity:* ${q.quantity} Nos\n`;
  msg += `*Grand Total:* ${total}\n`;
  msg += `------------------------------------\n`;
  msg += `*TEI PACKAGE* | Hosur, Tamil Nadu\n`;
  msg += `Web: https://teipackage.com\n`;

  const phone = (q.contact || "").replace(/[^0-9]/g, "");
  const waUrl = phone.length >= 10
    ? `https://wa.me/${phone.startsWith('91') ? phone : '91' + phone}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;

  window.open(waUrl, "_blank");
};

// Print
window.triggerEstimatorPrint = function() {
  window.print();
};

function showEstimatorToast(msg) {
  if (typeof showToast === "function") {
    showToast(msg);
  } else {
    alert(msg);
  }
}
