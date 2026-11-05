/**
 * TEI PACKAGE - Website Interactions & Product Showcase
 */

document.addEventListener("DOMContentLoaded", () => {
  initMobileMenu();
  initCategoryFilter();
  initSmoothScroll();
});

function initMobileMenu() {
  const toggleBtn = document.getElementById("menuToggleBtn");
  const navMenu = document.getElementById("navMenu");
  if (!toggleBtn || !navMenu) return;

  toggleBtn.addEventListener("click", () => {
    navMenu.classList.toggle("open");
  });

  // Close menu on link click
  navMenu.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      navMenu.classList.remove("open");
    });
  });
}

function initCategoryFilter() {
  const pills = document.querySelectorAll(".category-pill");
  const cards = document.querySelectorAll(".product-card");

  pills.forEach(pill => {
    pill.addEventListener("click", () => {
      pills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");

      const filter = pill.getAttribute("data-category");

      cards.forEach(card => {
        const cat = card.getAttribute("data-category");
        if (filter === "all" || cat === filter) {
          card.style.display = "flex";
        } else {
          card.style.display = "none";
        }
      });
    });
  });
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function(e) {
      const targetId = this.getAttribute("href");
      if (targetId === "#") return;
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({
          behavior: "smooth"
        });
      }
    });
  });
}

// Function called when user clicks "Add to Quote" from website product cards
window.addCatalogItemToQuote = function(prodIndex) {
  if (typeof TEI_CATALOG === "undefined" || !TEI_CATALOG[prodIndex]) return;
  const prod = TEI_CATALOG[prodIndex];

  if (typeof quoteData !== "undefined" && typeof renderItemsTable === "function") {
    quoteData.items.push({
      desc: prod.name,
      hsn: prod.hsn,
      qty: 50,
      unit: prod.unit,
      rate: prod.rate,
      disc: 0,
      taxRate: prod.taxRate
    });
    renderItemsTable();
    if (typeof recalculateAll === "function") recalculateAll();

    // Scroll to the quotation section
    const quoteSection = document.getElementById("quotation-tool");
    if (quoteSection) {
      quoteSection.scrollIntoView({ behavior: "smooth" });
    }

    if (typeof showToast === "function") {
      showToast(`Added "${prod.name.split('(')[0].trim()}" to quotation!`);
    }
  }
};
