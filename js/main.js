/**
 * TEI PACKAGE - Website Interactions & Product Showcase
 */

document.addEventListener("DOMContentLoaded", () => {
  initMobileMenu();
  initCategoryFilter();
  initLiquidMetalNav();
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

function initLiquidMetalNav() {
  const navMenu = document.getElementById("navMenu");
  const glider = document.getElementById("navLiquidGlider");
  if (!navMenu || !glider) return;

  const navLinks = navMenu.querySelectorAll("a");
  let currentLeft = 0;
  let stretchTimer = null;

  function getGeometry(link) {
    const menuRect = navMenu.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    return {
      left: linkRect.left - menuRect.left,
      width: linkRect.width,
      height: linkRect.height
    };
  }

  function moveGlider(targetLink, animate = true) {
    if (!targetLink || window.innerWidth <= 992) return;
    const geom = getGeometry(targetLink);
    if (!geom.width) return;

    if (animate && currentLeft !== 0) {
      glider.classList.remove("gliding-right", "gliding-left");
      if (geom.left > currentLeft + 4) {
        glider.classList.add("gliding-right");
      } else if (geom.left < currentLeft - 4) {
        glider.classList.add("gliding-left");
      }

      clearTimeout(stretchTimer);
      stretchTimer = setTimeout(() => {
        glider.classList.remove("gliding-right", "gliding-left");
      }, 360);
    }

    currentLeft = geom.left;

    // Thematic tinting
    glider.classList.remove("theme-portal", "theme-db");
    const href = targetLink.getAttribute("href") || "";
    if (targetLink.classList.contains("nav-link-portal") || href.includes("quotation.html")) {
      glider.classList.add("theme-portal");
    } else if (targetLink.classList.contains("nav-link-db") || href.includes("database-hub")) {
      glider.classList.add("theme-db");
    }

    glider.style.transform = `translate3d(${geom.left}px, 0, 0)`;
    glider.style.width = `${geom.width}px`;
  }

  window.updateLiquidNavGlider = moveGlider;

  // Initialize glider position on active link
  const initialActive = navMenu.querySelector("a.active") || navLinks[0];
  if (initialActive) {
    setTimeout(() => {
      navMenu.classList.add("glider-ready");
      moveGlider(initialActive, false);
    }, 60);
  }

  // Click handler with liquid metal movement and tactile ripple
  navLinks.forEach(link => {
    link.addEventListener("click", function() {
      // Tactile liquid droplet ripple on text
      this.classList.remove("clicked-ripple");
      void this.offsetWidth; // trigger reflow
      this.classList.add("clicked-ripple");

      // Update active classes
      navLinks.forEach(l => l.classList.remove("active"));
      this.classList.add("active");

      // Animate liquid metal glider to clicked link
      moveGlider(this, true);
    });
  });

  // Re-align on resize
  window.addEventListener("resize", () => {
    if (window.innerWidth > 992) {
      const active = navMenu.querySelector("a.active");
      if (active) moveGlider(active, false);
    }
  }, { passive: true });
}

function initSmoothScroll() {
  const navbar = document.querySelector(".navbar");
  const navLinks = document.querySelectorAll("#navMenu a");

  // Sticky navbar shadow & liquid depth on scroll
  window.addEventListener("scroll", () => {
    if (navbar) {
      if (window.scrollY > 20) {
        navbar.classList.add("scrolled");
      } else {
        navbar.classList.remove("scrolled");
      }
    }
  }, { passive: true });

  // Smooth scroll & instant active indicator switch
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

        // Set active tab if clicked link is inside navMenu
        if (this.closest("#navMenu")) {
          navLinks.forEach(link => link.classList.remove("active"));
          this.classList.add("active");
          if (typeof window.updateLiquidNavGlider === "function") {
            window.updateLiquidNavGlider(this, true);
          }
        }
      }
    });
  });

  // ScrollSpy: Automatically update active nav link as sections scroll into view
  const sections = ["home", "products", "quotation-tool", "database-hub", "about", "contact"]
    .map(id => document.getElementById(id))
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const currentId = "#" + entry.target.id;
          navLinks.forEach(link => {
            if (link.getAttribute("href") === currentId) {
              link.classList.add("active");
              if (typeof window.updateLiquidNavGlider === "function") {
                window.updateLiquidNavGlider(link, true);
              }
            } else if (link.getAttribute("href").startsWith("#")) {
              link.classList.remove("active");
            }
          });
        }
      });
    }, {
      rootMargin: "-20% 0px -60% 0px"
    });

    sections.forEach(sec => observer.observe(sec));
  }
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
