/**
 * TEI PACKAGE - Quotation & Billing Engine
 * Supports industrial plastic crates, bins, FLCs, pallets, GST calculations,
 * Indian Currency In Words, LocalStorage history, Excel CSV export, and Print/PDF.
 */

// Pre-defined Product Catalog
const TEI_CATALOG = [
  {
    name: "TEI Standard Crate (600x400x325 mm) - HDPE Heavy Duty Stackable",
    hsn: "39231090",
    unit: "Nos",
    rate: 650,
    taxRate: 18,
    category: "crates"
  },
  {
    name: "TEI Medium Crate (540x360x280 mm) - Solid Base & Ribbed Walls",
    hsn: "39231090",
    unit: "Nos",
    rate: 520,
    taxRate: 18,
    category: "crates"
  },
  {
    name: "TEI Compact Component Crate (400x300x220 mm) - Nestable",
    hsn: "39231090",
    unit: "Nos",
    rate: 380,
    taxRate: 18,
    category: "crates"
  },
  {
    name: "TEI Industrial Part Bin #25 (250x150x120 mm) - Shelf Storage",
    hsn: "39231090",
    unit: "Nos",
    rate: 140,
    taxRate: 18,
    category: "bins"
  },
  {
    name: "TEI Industrial Part Bin #35 (350x210x150 mm) - Heavy Duty",
    hsn: "39231090",
    unit: "Nos",
    rate: 220,
    taxRate: 18,
    category: "bins"
  },
  {
    name: "TEI FLC Foldable Large Container (1200x1000x975 mm) - Collapsible",
    hsn: "39231090",
    unit: "Nos",
    rate: 12500,
    taxRate: 18,
    category: "flc"
  },
  {
    name: "TEI Heavy Duty Plastic Pallet (1200x1000 mm) - 4-Way Entry",
    hsn: "39239090",
    unit: "Nos",
    rate: 2450,
    taxRate: 18,
    category: "pallets"
  },
  {
    name: "TEI ESD Safe Anti-Static Bin / Tray (Conductive 10^4 - 10^6 ohm)",
    hsn: "39231090",
    unit: "Nos",
    rate: 460,
    taxRate: 18,
    category: "esd"
  },
  {
    name: "TEI PP Corrugated Box with Internal Custom EPE Foam Partition",
    hsn: "39231090",
    unit: "Nos",
    rate: 320,
    taxRate: 18,
    category: "custom"
  },
  {
    name: "TEI Thermoformed Blister Packaging Tray (Custom Molded)",
    hsn: "39239090",
    unit: "Pcs",
    rate: 95,
    taxRate: 18,
    category: "custom"
  }
];

// App State
let quoteData = {
  quoteNo: "",
  quoteDate: "",
  validUntil: "",
  paymentTerms: "100% Against Proforma / 30 Days Credit",
  deliveryTimeline: "3 to 5 Days from PO",
  company: {
    name: "TEI PACKAGE",
    tagline: "Industrial Packaging & Material Handling Solutions",
    address: "Plot No. 42, Sipcot Industrial Complex, Phase-II, Hosur, Tamil Nadu - 635126, India",
    gstin: "33AABCT9988A1Z2",
    phone: "+91 98427 12345 / +91 94432 67890",
    email: "sales@teipackage.com",
    website: "www.teipackage.com"
  },
  customer: {
    name: "TVS Motor Company Ltd",
    contactPerson: "Mr. Suresh Kumar (Purchase Dept)",
    phone: "+91 98940 55443",
    email: "procurement@tvsmotor.com",
    gstin: "33AAACT1234A1Z1",
    billingAddress: "Post Box No. 4, Harita, Hosur, Tamil Nadu - 635109",
    shippingAddress: "Gate No. 2, Stores Inward, TVS Motor Plant, Harita, Hosur, TN - 635109"
  },
  taxType: "intra", // 'intra' (CGST+SGST) or 'inter' (IGST)
  freightCharges: 0,
  overallDiscount: 0,
  items: [
    {
      desc: "TEI Standard Crate (600x400x325 mm) - HDPE Heavy Duty Stackable, Dark Green",
      hsn: "39231090",
      qty: 150,
      unit: "Nos",
      rate: 650,
      disc: 5,
      taxRate: 18
    },
    {
      desc: "TEI Industrial Part Bin #35 (350x210x150 mm) - Blue, with label holder",
      hsn: "39231090",
      qty: 300,
      unit: "Nos",
      rate: 220,
      disc: 5,
      taxRate: 18
    },
    {
      desc: "TEI Heavy Duty Plastic Pallet (1200x1000 mm) - 4-Way Entry, Steel Reinforced",
      hsn: "39239090",
      qty: 25,
      unit: "Nos",
      rate: 2450,
      disc: 0,
      taxRate: 18
    }
  ],
  bankDetails: {
    bankName: "HDFC Bank Ltd",
    acName: "TEI PACKAGE",
    acNo: "50200088991122",
    ifsc: "HDFC0001234",
    branch: "Hosur Sipcot Branch"
  },
  terms: "1. Prices quoted are Ex-Works Hosur, Tamil Nadu.\n2. GST 18% as applicable.\n3. Freight & transit insurance at buyer's scope unless specified.\n4. Quotation valid for 30 days from date of issuance.\n5. Standard warranty against manufacturing defects for 12 months."
};

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  initDefaults();
  populatePresets();
  renderItemsTable();
  bindEvents();
  recalculateAll();
  loadSavedHistoryCount();
});

// Set auto quotation number and dates
function initDefaults() {
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];

  const expiry = new Date();
  expiry.setDate(today.getDate() + 30);
  const expiryStr = expiry.toISOString().split("T")[0];

  if (!quoteData.quoteNo) {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const yr = today.getFullYear();
    quoteData.quoteNo = `TEI/QT/${yr}/${randomSuffix}`;
  }
  quoteData.quoteDate = dateStr;
  quoteData.validUntil = expiryStr;

  // Sync with form inputs
  const elQuoteNo = document.getElementById("quoteNo");
  const elQuoteDate = document.getElementById("quoteDate");
  const elValidUntil = document.getElementById("validUntil");
  const elPayTerms = document.getElementById("paymentTerms");
  const elDelTerms = document.getElementById("deliveryTimeline");

  if (elQuoteNo) elQuoteNo.value = quoteData.quoteNo;
  if (elQuoteDate) elQuoteDate.value = quoteData.quoteDate;
  if (elValidUntil) elValidUntil.value = quoteData.validUntil;
  if (elPayTerms) elPayTerms.value = quoteData.paymentTerms;
  if (elDelTerms) elDelTerms.value = quoteData.deliveryTimeline;

  // Customer inputs
  setInputValue("custName", quoteData.customer.name);
  setInputValue("custContact", quoteData.customer.contactPerson);
  setInputValue("custPhone", quoteData.customer.phone);
  setInputValue("custEmail", quoteData.customer.email);
  setInputValue("custGstin", quoteData.customer.gstin);
  setInputValue("custBillAddress", quoteData.customer.billingAddress);
  setInputValue("custShipAddress", quoteData.customer.shippingAddress);

  // Freight & discount
  setInputValue("freightCharges", quoteData.freightCharges);
  setInputValue("overallDiscount", quoteData.overallDiscount);

  // Tax mode
  const taxRadios = document.getElementsByName("taxType");
  taxRadios.forEach(radio => {
    if (radio.value === quoteData.taxType) radio.checked = true;
  });

  // Terms & Notes
  const termsInput = document.getElementById("quoteTerms");
  if (termsInput) termsInput.value = quoteData.terms;
}

function setInputValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val !== undefined ? val : "";
}

// Populate product catalog dropdown
function populatePresets() {
  const presetSelect = document.getElementById("presetProductSelect");
  if (!presetSelect) return;
  presetSelect.innerHTML = '<option value="">-- Choose a standard product to add --</option>';

  TEI_CATALOG.forEach((prod, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = `${prod.name} (₹${prod.rate}/${prod.unit})`;
    presetSelect.appendChild(opt);
  });
}

// Render dynamic rows in Edit Form
function renderItemsTable() {
  const tbody = document.getElementById("itemsTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  quoteData.items.forEach((item, index) => {
    const tr = document.createElement("tr");

    const taxable = calculateRowTaxable(item);
    const taxAmt = taxable * (item.taxRate / 100);
    const rowTotal = taxable + taxAmt;

    tr.innerHTML = `
      <td class="col-num">${index + 1}</td>
      <td class="col-desc">
        <input type="text" value="${escapeHtml(item.desc)}" onchange="updateItemField(${index}, 'desc', this.value)" placeholder="Product name & specification">
      </td>
      <td class="col-hsn">
        <input type="text" value="${escapeHtml(item.hsn)}" onchange="updateItemField(${index}, 'hsn', this.value)" placeholder="HSN">
      </td>
      <td class="col-qty">
        <input type="number" min="1" step="1" value="${item.qty}" oninput="updateItemField(${index}, 'qty', this.value)" style="text-align: right;">
      </td>
      <td class="col-unit">
        <select onchange="updateItemField(${index}, 'unit', this.value)">
          <option value="Nos" ${item.unit === 'Nos' ? 'selected' : ''}>Nos</option>
          <option value="Pcs" ${item.unit === 'Pcs' ? 'selected' : ''}>Pcs</option>
          <option value="Sets" ${item.unit === 'Sets' ? 'selected' : ''}>Sets</option>
          <option value="Boxes" ${item.unit === 'Boxes' ? 'selected' : ''}>Boxes</option>
          <option value="Mtr" ${item.unit === 'Mtr' ? 'selected' : ''}>Mtr</option>
        </select>
      </td>
      <td class="col-rate">
        <input type="number" min="0" step="0.5" value="${item.rate}" oninput="updateItemField(${index}, 'rate', this.value)" style="text-align: right;">
      </td>
      <td class="col-disc">
        <input type="number" min="0" max="100" step="0.5" value="${item.disc || 0}" oninput="updateItemField(${index}, 'disc', this.value)" style="text-align: right;">
      </td>
      <td class="col-tax">
        <select onchange="updateItemField(${index}, 'taxRate', this.value)">
          <option value="18" ${item.taxRate === 18 ? 'selected' : ''}>18%</option>
          <option value="12" ${item.taxRate === 12 ? 'selected' : ''}>12%</option>
          <option value="5" ${item.taxRate === 5 ? 'selected' : ''}>5%</option>
          <option value="0" ${item.taxRate === 0 ? 'selected' : ''}>0%</option>
        </select>
      </td>
      <td class="col-amount" id="row-total-${index}">₹${formatINR(rowTotal)}</td>
      <td class="col-action">
        <button class="btn-remove-row" onclick="removeItem(${index})" title="Delete row">✕</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function calculateRowTaxable(item) {
  const qty = parseFloat(item.qty) || 0;
  const rate = parseFloat(item.rate) || 0;
  const disc = parseFloat(item.disc) || 0;
  const base = qty * rate;
  return base - (base * (disc / 100));
}

// Update specific field in item
window.updateItemField = function(index, field, value) {
  if (!quoteData.items[index]) return;

  if (field === 'qty' || field === 'rate' || field === 'disc' || field === 'taxRate') {
    quoteData.items[index][field] = parseFloat(value) || 0;
  } else {
    quoteData.items[index][field] = value;
  }

  // Update line total element immediately
  const item = quoteData.items[index];
  const taxable = calculateRowTaxable(item);
  const taxAmt = taxable * ((item.taxRate || 0) / 100);
  const total = taxable + taxAmt;

  const totalEl = document.getElementById(`row-total-${index}`);
  if (totalEl) totalEl.textContent = `₹${formatINR(total)}`;

  recalculateAll();
};

// Add blank item
window.addNewItem = function() {
  quoteData.items.push({
    desc: "",
    hsn: "39231090",
    qty: 1,
    unit: "Nos",
    rate: 0,
    disc: 0,
    taxRate: 18
  });
  renderItemsTable();
  recalculateAll();
};

// Add item from preset dropdown
window.addPresetItem = function() {
  const sel = document.getElementById("presetProductSelect");
  if (!sel || sel.value === "") return;
  const prod = TEI_CATALOG[parseInt(sel.value, 10)];
  if (!prod) return;

  quoteData.items.push({
    desc: prod.name,
    hsn: prod.hsn,
    qty: 50,
    unit: prod.unit,
    rate: prod.rate,
    disc: 0,
    taxRate: prod.taxRate
  });

  sel.value = "";
  renderItemsTable();
  recalculateAll();
  showToast("Added " + prod.name.split('(')[0].trim());
};

// Remove single row
window.removeItem = function(index) {
  if (quoteData.items.length <= 1) {
    showToast("Quotation must have at least one line item!");
    return;
  }
  quoteData.items.splice(index, 1);
  renderItemsTable();
  recalculateAll();
};

// Clear all rows
window.clearAllItems = function() {
  if (!confirm("Are you sure you want to remove all line items?")) return;
  quoteData.items = [];
  addNewItem();
};

// Auto GST detection from customer GSTIN
function detectGstType(gstin) {
  if (!gstin || gstin.trim().length < 2) return;
  const stateCode = gstin.trim().substring(0, 2);
  // 33 is Tamil Nadu
  if (stateCode === "33") {
    quoteData.taxType = "intra";
  } else if (/^\d{2}$/.test(stateCode)) {
    quoteData.taxType = "inter";
  }
  const taxRadios = document.getElementsByName("taxType");
  taxRadios.forEach(r => {
    if (r.value === quoteData.taxType) r.checked = true;
  });
}

// Full Recalculation Engine
function recalculateAll() {
  let subtotal = 0;
  let totalTax = 0;
  let totalQty = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  quoteData.items.forEach(item => {
    const qty = parseFloat(item.qty) || 0;
    totalQty += qty;
    const taxable = calculateRowTaxable(item);
    subtotal += taxable;

    const rate = parseFloat(item.taxRate) || 0;
    const tax = taxable * (rate / 100);
    totalTax += tax;

    if (quoteData.taxType === "intra") {
      totalCgst += tax / 2;
      totalSgst += tax / 2;
    } else {
      totalIgst += tax;
    }
  });

  const freight = parseFloat(quoteData.freightCharges) || 0;
  const disc = parseFloat(quoteData.overallDiscount) || 0;
  const netBeforeRound = subtotal - disc + totalTax + freight;
  const roundedTotal = Math.round(netBeforeRound);
  const roundOff = roundedTotal - netBeforeRound;

  // Update Summary Card elements
  setText("sumSubtotal", `₹${formatINR(subtotal)}`);
  setText("sumItemCount", `${quoteData.items.length} items (${totalQty} units)`);
  setText("sumFreight", `₹${formatINR(freight)}`);
  setText("sumDiscount", disc > 0 ? `- ₹${formatINR(disc)}` : `₹0.00`);

  const cgstRow = document.getElementById("cgstRow");
  const sgstRow = document.getElementById("sgstRow");
  const igstRow = document.getElementById("igstRow");

  if (quoteData.taxType === "intra") {
    if (cgstRow) cgstRow.style.display = "flex";
    if (sgstRow) sgstRow.style.display = "flex";
    if (igstRow) igstRow.style.display = "none";
    setText("sumCgst", `₹${formatINR(totalCgst)}`);
    setText("sumSgst", `₹${formatINR(totalSgst)}`);
  } else {
    if (cgstRow) cgstRow.style.display = "none";
    if (sgstRow) sgstRow.style.display = "none";
    if (igstRow) igstRow.style.display = "flex";
    setText("sumIgst", `₹${formatINR(totalIgst)}`);
  }

  setText("sumRoundOff", (roundOff >= 0 ? "+ " : "- ") + `₹${Math.abs(roundOff).toFixed(2)}`);
  setText("sumGrandTotal", `₹${formatINR(roundedTotal)}`);

  const words = numberToWordsINR(roundedTotal);
  setText("sumAmountWords", words);

  // Sync to Official Printable Sheet
  syncToPrintableSheet({
    subtotal,
    totalTax,
    totalCgst,
    totalSgst,
    totalIgst,
    freight,
    disc,
    roundOff,
    roundedTotal,
    words
  });
}

// Sync to the A4 Printable Bill / Invoice View
function syncToPrintableSheet(calc) {
  setText("invQuoteNo", quoteData.quoteNo);
  setText("invDate", formatDate(quoteData.quoteDate));
  setText("invValidUntil", formatDate(quoteData.validUntil));
  setText("invPaymentTerms", quoteData.paymentTerms);
  setText("invDeliveryTerms", quoteData.deliveryTimeline);

  // Customer block
  setText("invCustName", quoteData.customer.name || "Customer Name");
  setText("invCustContact", quoteData.customer.contactPerson ? `Attn: ${quoteData.customer.contactPerson}` : "");
  setText("invCustGstin", quoteData.customer.gstin ? `GSTIN: ${quoteData.customer.gstin}` : "");
  setText("invCustPhone", quoteData.customer.phone ? `Phone: ${quoteData.customer.phone}` : "");
  setText("invCustEmail", quoteData.customer.email ? `Email: ${quoteData.customer.email}` : "");
  setText("invCustBilling", quoteData.customer.billingAddress || "-");
  setText("invCustShipping", quoteData.customer.shippingAddress || quoteData.customer.billingAddress || "-");

  // Printable Table Rows
  const invTbody = document.getElementById("invItemsTbody");
  if (invTbody) {
    invTbody.innerHTML = "";
    quoteData.items.forEach((item, idx) => {
      const taxable = calculateRowTaxable(item);
      const taxAmt = taxable * ((item.taxRate || 0) / 100);
      const total = taxable + taxAmt;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="text-center">${idx + 1}</td>
        <td>
          <strong>${escapeHtml(item.desc || 'Custom Item')}</strong>
        </td>
        <td class="text-center">${escapeHtml(item.hsn || '-')}</td>
        <td class="text-center">${item.qty} ${item.unit}</td>
        <td class="text-right">₹${formatINR(item.rate)}</td>
        <td class="text-center">${item.disc ? item.disc + '%' : '-'}</td>
        <td class="text-right">₹${formatINR(taxable)}</td>
        <td class="text-center">${item.taxRate}%</td>
        <td class="text-right">₹${formatINR(total)}</td>
      `;
      invTbody.appendChild(tr);
    });
  }

  // Summary Table in Printable Sheet
  const invSubtotal = document.getElementById("invSubtotal");
  if (invSubtotal) invSubtotal.textContent = `₹${formatINR(calc.subtotal)}`;

  const invTaxRow = document.getElementById("invTaxBreakdownRows");
  if (invTaxRow) {
    if (quoteData.taxType === "intra") {
      invTaxRow.innerHTML = `
        <tr><td>CGST (9%):</td><td>₹${formatINR(calc.totalCgst)}</td></tr>
        <tr><td>SGST (9%):</td><td>₹${formatINR(calc.totalSgst)}</td></tr>
      `;
    } else {
      invTaxRow.innerHTML = `
        <tr><td>IGST (18%):</td><td>₹${formatINR(calc.totalIgst)}</td></tr>
      `;
    }
  }

  const invFreight = document.getElementById("invFreightRow");
  if (invFreight) {
    if (calc.freight > 0) {
      invFreight.style.display = "table-row";
      document.getElementById("invFreight").textContent = `₹${formatINR(calc.freight)}`;
    } else {
      invFreight.style.display = "none";
    }
  }

  const invDiscount = document.getElementById("invDiscountRow");
  if (invDiscount) {
    if (calc.disc > 0) {
      invDiscount.style.display = "table-row";
      document.getElementById("invDiscount").textContent = `- ₹${formatINR(calc.disc)}`;
    } else {
      invDiscount.style.display = "none";
    }
  }

  const invGrand = document.getElementById("invGrandTotal");
  if (invGrand) invGrand.textContent = `₹${formatINR(calc.roundedTotal)}`;

  const invWords = document.getElementById("invAmountInWords");
  if (invWords) invWords.textContent = calc.words;

  // Terms in Printable Sheet
  const invTerms = document.getElementById("invTermsText");
  if (invTerms) {
    invTerms.innerHTML = (quoteData.terms || "")
      .split("\n")
      .map(line => line.trim() ? `<div>${escapeHtml(line)}</div>` : "")
      .join("");
  }
}

// Bind User Input Events
function bindEvents() {
  bindInput("quoteNo", val => quoteData.quoteNo = val);
  bindInput("quoteDate", val => quoteData.quoteDate = val);
  bindInput("validUntil", val => quoteData.validUntil = val);
  bindInput("paymentTerms", val => quoteData.paymentTerms = val);
  bindInput("deliveryTimeline", val => quoteData.deliveryTimeline = val);

  bindInput("custName", val => quoteData.customer.name = val);
  bindInput("custContact", val => quoteData.customer.contactPerson = val);
  bindInput("custPhone", val => quoteData.customer.phone = val);
  bindInput("custEmail", val => quoteData.customer.email = val);
  bindInput("custGstin", val => {
    quoteData.customer.gstin = val;
    detectGstType(val);
  });
  bindInput("custBillAddress", val => quoteData.customer.billingAddress = val);
  bindInput("custShipAddress", val => quoteData.customer.shippingAddress = val);

  bindInput("freightCharges", val => quoteData.freightCharges = parseFloat(val) || 0);
  bindInput("overallDiscount", val => quoteData.overallDiscount = parseFloat(val) || 0);

  const taxRadios = document.getElementsByName("taxType");
  taxRadios.forEach(radio => {
    radio.addEventListener("change", e => {
      quoteData.taxType = e.target.value;
      recalculateAll();
    });
  });

  const termsInput = document.getElementById("quoteTerms");
  if (termsInput) {
    termsInput.addEventListener("input", e => {
      quoteData.terms = e.target.value;
      recalculateAll();
    });
  }
}

function bindInput(id, callback) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("input", e => {
    callback(e.target.value);
    recalculateAll();
  });
}

// View Mode Toggle (Editor Form <-> Printable Bill)
window.switchViewMode = function(mode) {
  const editor = document.getElementById("quoteEditorView");
  const preview = document.getElementById("quotePreviewView");
  const btnEdit = document.getElementById("modeBtnEdit");
  const btnPrev = document.getElementById("modeBtnPreview");

  if (mode === "preview") {
    recalculateAll();
    if (editor) editor.style.display = "none";
    if (preview) preview.style.display = "block";
    if (btnPrev) btnPrev.classList.add("active");
    if (btnEdit) btnEdit.classList.remove("active");
  } else {
    if (editor) editor.style.display = "block";
    if (preview) preview.style.display = "none";
    if (btnEdit) btnEdit.classList.add("active");
    if (btnPrev) btnPrev.classList.remove("active");
  }
};

// Print / PDF Trigger
window.triggerPrint = function() {
  switchViewMode("preview");
  setTimeout(() => {
    window.print();
  }, 200);
};

// Export to CSV / Excel
window.exportExcelCSV = function() {
  recalculateAll();

  let csv = [];
  csv.push(`"TEI PACKAGE - QUOTATION / BILL"`);
  csv.push(`"Website: www.teipackage.com | Hosur, Tamil Nadu"`);
  csv.push("");
  csv.push(`"Quotation No:","${quoteData.quoteNo}","Date:","${quoteData.quoteDate}"`);
  csv.push(`"Valid Until:","${quoteData.validUntil}","Payment Terms:","${quoteData.paymentTerms}"`);
  csv.push("");
  csv.push(`"Customer Name:","${quoteData.customer.name}"`);
  csv.push(`"Contact Person:","${quoteData.customer.contactPerson}","Phone:","${quoteData.customer.phone}"`);
  csv.push(`"Customer GSTIN:","${quoteData.customer.gstin}","Email:","${quoteData.customer.email}"`);
  csv.push(`"Billing Address:","${(quoteData.customer.billingAddress || '').replace(/"/g, '""')}"`);
  csv.push("");
  csv.push(`"S.No","Item Description","HSN/SAC","Quantity","Unit","Unit Rate (INR)","Discount %","Taxable Value","GST %","Total Amount"`);

  let subtotal = 0;
  quoteData.items.forEach((item, i) => {
    const taxable = calculateRowTaxable(item);
    const tax = taxable * ((item.taxRate || 0) / 100);
    const total = taxable + tax;
    subtotal += taxable;

    csv.push(`"${i + 1}","${(item.desc || '').replace(/"/g, '""')}","${item.hsn}","${item.qty}","${item.unit}","${item.rate}","${item.disc || 0}","${taxable.toFixed(2)}","${item.taxRate}%","${total.toFixed(2)}"`);
  });

  csv.push("");
  csv.push(`"","","","","","","Subtotal:","${subtotal.toFixed(2)}"`);
  if (quoteData.freightCharges > 0) {
    csv.push(`"","","","","","","Freight Charges:","${quoteData.freightCharges}"`);
  }
  if (quoteData.overallDiscount > 0) {
    csv.push(`"","","","","","","Overall Discount:","-${quoteData.overallDiscount}"`);
  }

  const roundedTotal = document.getElementById("invGrandTotal") ? document.getElementById("invGrandTotal").textContent.replace('₹', '') : '';
  csv.push(`"","","","","","","Grand Total (INR):","${roundedTotal}"`);

  const blob = new Blob([csv.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${quoteData.quoteNo.replace(/[\/\\?%*:|"<>]/g, '_')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast("Quotation exported to Excel CSV!");
};

// Share to WhatsApp
window.shareViaWhatsApp = function() {
  recalculateAll();
  const grandTotal = document.getElementById("invGrandTotal") ? document.getElementById("invGrandTotal").textContent : "";
  const phone = (quoteData.customer.phone || "").replace(/[^0-9]/g, "");

  let text = `*QUOTATION FROM TEI PACKAGE*\n`;
  text += `--------------------------------\n`;
  text += `*Quotation No:* ${quoteData.quoteNo}\n`;
  text += `*Date:* ${quoteData.quoteDate}\n`;
  text += `*Customer:* ${quoteData.customer.name}\n`;
  text += `*Total Items:* ${quoteData.items.length}\n`;
  text += `*Grand Total:* ${grandTotal}\n`;
  text += `*Delivery:* ${quoteData.deliveryTimeline}\n`;
  text += `*Validity:* 30 Days\n`;
  text += `--------------------------------\n`;
  text += `Thank you for your business inquiry!\n`;
  text += `*TEI PACKAGE* | Hosur, Tamil Nadu\n`;
  text += `Web: https://teipackage.com\n`;

  const waUrl = phone.length >= 10
    ? `https://wa.me/${phone.startsWith('91') ? phone : '91' + phone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;

  window.open(waUrl, "_blank");
};

// Save Draft to LocalStorage and Sync with Backend SQLite Database
window.saveQuotationDraft = async function() {
  try {
    const drafts = JSON.parse(localStorage.getItem("tei_quote_history") || "[]");
    const existingIndex = drafts.findIndex(d => d.quoteNo === quoteData.quoteNo);

    const record = {
      ...quoteData,
      savedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      drafts[existingIndex] = record;
    } else {
      drafts.unshift(record);
    }

    localStorage.setItem("tei_quote_history", JSON.stringify(drafts));
    showToast(`Saved quotation ${quoteData.quoteNo} to local history!`);
    loadSavedHistoryCount();

    // Sync to SQLite Database if API available
    if (window.TEI_API && typeof window.TEI_API.saveQuotation === 'function') {
      const calc = calculateAllFinancials(quoteData);
      const apiPayload = {
        quote_no: quoteData.quoteNo,
        customer_name: quoteData.customer.name || 'Walk-in Customer',
        company_name: quoteData.customer.company || '',
        gstin: quoteData.customer.gstin || '',
        phone: quoteData.customer.phone || '',
        email: quoteData.customer.email || '',
        billing_address: quoteData.customer.billingAddress || '',
        shipping_address: quoteData.customer.shippingAddress || '',
        tax_type: quoteData.taxType || 'intra',
        items: quoteData.items || [],
        subtotal: calc.subtotal || 0,
        freight: calc.freight || 0,
        discount: calc.discount || 0,
        cgst: calc.cgst || 0,
        sgst: calc.sgst || 0,
        igst: calc.igst || 0,
        round_off: calc.roundOff || 0,
        grand_total: calc.grandTotal || 0,
        amount_in_words: numberToIndianWords(calc.grandTotal || 0),
        status: 'Draft',
        notes: quoteData.terms || ''
      };
      await window.TEI_API.saveQuotation(apiPayload);
    }
  } catch (err) {
    showToast("Error saving quotation: " + err.message);
  }
};

// Load Saved History List in Modal
window.openHistoryModal = function() {
  const modal = document.getElementById("historyModal");
  const listEl = document.getElementById("historyListContainer");
  if (!modal || !listEl) return;

  const drafts = JSON.parse(localStorage.getItem("tei_quote_history") || "[]");
  if (drafts.length === 0) {
    listEl.innerHTML = `<p style="text-align: center; color: var(--muted); padding: 30px 0;">No saved quotations yet. Create and click "Save Draft" to store quotations here!</p>`;
  } else {
    listEl.innerHTML = drafts.map((d, idx) => `
      <div class="saved-quote-item">
        <div>
          <strong style="color: var(--ink); font-size: 14px;">${escapeHtml(d.quoteNo)}</strong>
          <span style="display: block; font-size: 12px; color: var(--muted);">${escapeHtml(d.customer?.name || 'Unnamed Client')} • ${d.quoteDate || '-'}</span>
          <small style="color: #8fa099; font-size: 11px;">Saved: ${new Date(d.savedAt).toLocaleString()}</small>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-sm btn-primary" onclick="loadSavedQuotation(${idx})">Load</button>
          <button class="btn btn-sm btn-danger" onclick="deleteSavedQuotation(${idx})">✕</button>
        </div>
      </div>
    `).join("");
  }

  modal.classList.add("active");
};

window.closeHistoryModal = function() {
  const modal = document.getElementById("historyModal");
  if (modal) modal.classList.remove("active");
};

window.loadSavedQuotation = function(idx) {
  const drafts = JSON.parse(localStorage.getItem("tei_quote_history") || "[]");
  if (!drafts[idx]) return;
  quoteData = drafts[idx];
  initDefaults();
  renderItemsTable();
  recalculateAll();
  closeHistoryModal();
  showToast(`Loaded quotation ${quoteData.quoteNo}`);
};

window.deleteSavedQuotation = function(idx) {
  if (!confirm("Are you sure you want to delete this saved quote?")) return;
  const drafts = JSON.parse(localStorage.getItem("tei_quote_history") || "[]");
  drafts.splice(idx, 1);
  localStorage.setItem("tei_quote_history", JSON.stringify(drafts));
  openHistoryModal();
  loadSavedHistoryCount();
};

function loadSavedHistoryCount() {
  const drafts = JSON.parse(localStorage.getItem("tei_quote_history") || "[]");
  const countBadge = document.getElementById("historyCountBadge");
  if (countBadge) {
    countBadge.textContent = drafts.length > 0 ? `(${drafts.length})` : "";
  }
}

// Reset / Start Brand New Quotation
window.startNewQuotation = function() {
  if (!confirm("Start a new quotation? Unsaved changes will be discarded.")) return;
  const today = new Date();
  const yr = today.getFullYear();
  const randomSuffix = Math.floor(100 + Math.random() * 900);

  quoteData.quoteNo = `TEI/QT/${yr}/${randomSuffix}`;
  quoteData.customer = {
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    gstin: "",
    billingAddress: "",
    shippingAddress: ""
  };
  quoteData.freightCharges = 0;
  quoteData.overallDiscount = 0;
  quoteData.items = [
    {
      desc: "TEI Standard Crate (600x400x325 mm) - HDPE Heavy Duty Stackable",
      hsn: "39231090",
      qty: 50,
      unit: "Nos",
      rate: 650,
      disc: 0,
      taxRate: 18
    }
  ];

  initDefaults();
  renderItemsTable();
  recalculateAll();
  switchViewMode("edit");
  showToast("Created new blank quotation " + quoteData.quoteNo);
};

// Indian Number to Words Converter
function numberToWordsINR(amount) {
  const single = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const double = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function formatHundreds(n) {
    let str = "";
    if (n >= 100) {
      str += single[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n >= 10 && n <= 19) {
      str += double[n - 10] + " ";
      n = 0;
    }
    if (n > 0) {
      str += single[n] + " ";
    }
    return str.trim();
  }

  amount = Math.floor(amount);
  if (amount === 0) return "Indian Rupees Zero Only";

  let crore = Math.floor(amount / 10000000);
  amount %= 10000000;
  let lakh = Math.floor(amount / 100000);
  amount %= 100000;
  let thousand = Math.floor(amount / 1000);
  amount %= 1000;
  let remaining = amount;

  let words = "Indian Rupees ";
  if (crore > 0) words += formatHundreds(crore) + " Crore ";
  if (lakh > 0) words += formatHundreds(lakh) + " Lakh ";
  if (thousand > 0) words += formatHundreds(thousand) + " Thousand ";
  if (remaining > 0) words += formatHundreds(remaining) + " ";

  return words.trim() + " Only";
}

// Helpers
function formatINR(num) {
  if (isNaN(num)) return "0.00";
  return Number(num).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(msg) {
  let toast = document.getElementById("appToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "appToast";
    toast.className = "toast-notice";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}
