// ------------------------
// Core modules (always needed) 
// ------------------------

import { ThemeEvents } from '@theme/events';
import { requestIdleCallback } from "@theme/utilities";
import { initScrollbarWidth } from '@theme/scrollbar';
// ------------------------
// Theme loader
// ------------------------
class Theme {
  constructor() {
    this.config = window.__THEME__ || {};
    this.template = this.config?.template?.name || null;
    this.cartType = this.config?.cartType || 'page';
  }

  // ------------------------
  // Load template-specific modules
  // ------------------------
  async initTemplateModules() {
    const loaders = [];

    // Product page modules
    if (this.template === 'product') {
      loaders.push(
        import('@theme/variant-picker')
          .then(m => m.default && new m.default())
          .catch(err => console.error('Variant Picker Failed', err))
      );
      loaders.push(
        import('@theme/product-form')
          .then(m => m.default && new m.default())
          .catch(err => console.error('Product Form Failed', err))
      );
    }

    // Cart drawer module
    if (this.cartType === 'drawer') {
      loaders.push(
        import('@theme/cart-drawer')
          .then(m => m.default && new m.default())
          .catch(err => console.error('Cart Drawer Failed', err))
      );
    }

    // Run all modules independently (non-blocking)
    await Promise.allSettled(loaders);
  }

   initGlobalModules() {      
    initScrollbarWidth();      
  }

  // ------------------------
  // Section-specific modules
  // ------------------------
  initSection(section) {
    if (!section) return;

    // Product form always
    if (typeof window.initProductForms === 'function') window.initProductForms(section);

    // Featured collection
    if (section.dataset.section === 'featured-collection') {
     
      import('@theme/product-form')
        .then(m => m.default && new m.default(section))
        .catch(err => console.error('Section Product Form Failed', err));
    }

  }

  // ------------------------
  // Initialize theme
  // ------------------------
  start() {

     const init = () => {
      this.initTemplateModules();
      this.initGlobalModules();
    };
    // DOM ready
    if (document.readyState !== 'loading') {
            init();
    } else {
      document.addEventListener('DOMContentLoaded', () => init());
    }

    // Shopify section hydration
    document.addEventListener('shopify:section:load', (event) =>{
       this.initSection(event.target);
    });
  }
}

// ------------------------
// Init theme
// ------------------------
const theme = new Theme();
theme.start();

// Expose globally
window.Theme = theme;
window.ThemeEvents = ThemeEvents;



 

document.addEventListener("DOMContentLoaded", () => {

  const init = (root = document) => {
    root.querySelectorAll(".button-custom").forEach(btn => {
      if (btn.classList.contains("is-ready")) return;

      const el = btn.querySelector(".button--element");
      const textEl = el?.querySelector(".button--text");
      if (!el  ) return;

      const iconEl = el.querySelector(".button--icon");
      const icon = iconEl?.querySelector("svg")?.outerHTML || "";

      // remove original icon
      // if (iconEl) iconEl.remove();

      btn.insertAdjacentHTML("beforeend", `
        <span class="button--hover__element">
          <span class="hover__element--circle">
            ${textEl ? `<span class="hover__element--text">${textEl.textContent}</span>` : ""}
            ${icon ? `<span class="hover__element--icon-wrap"> <span class="hover__element--icon">${icon}</span>
                      <span class="hover__element--icon">${icon}</span></span>` : ""}
          </span>
        </span>
      `);
      btn.classList.add("is-ready");
    });
  };

  init();

  new MutationObserver(m =>
    m.forEach(x =>
      x.addedNodes.forEach(n =>
        n.nodeType === 1 && init(n)
      )
    )
  ).observe(document.body, { childList: true, subtree: true });

});