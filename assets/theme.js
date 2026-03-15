// theme.js

// ------------------------
// Core modules (always needed) 
// ------------------------

import { ThemeEvents } from '@theme/events';
import { requestIdleCallback } from "@theme/utilities";

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

  // ------------------------
  // Section-specific modules
  // ------------------------
  initSection(section) {
    if (!section) return;

    // Product form always
    if (typeof window.initProductForms === 'function') window.initProductForms(section);

    // Featured collection
    if (section.dataset.section === 'featured-collection') {
     
      import('@theme/product-form.js')
        .then(m => m.default && new m.default(section))
        .catch(err => console.error('Section Product Form Failed', err));
    }

  }

  // ------------------------
  // Initialize theme
  // ------------------------
  start() {
    // DOM ready
    if (document.readyState !== 'loading') {
      this.initTemplateModules();
    } else {
      document.addEventListener('DOMContentLoaded', () => this.initTemplateModules());
    }

    // Shopify section hydration
    document.addEventListener('shopify:section:load', (event) => this.initSection(event.target));
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



// const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

// if (scrollbarWidth > 0) {
//   document.documentElement.style.setProperty(
//     "--scrollbar-width",
//     scrollbarWidth + "px"
//   );
// }

export class DeclarativeShadowElement extends HTMLElement {
    connectedCallback() {
        if (!this.shadowRoot) {
            const template = this.querySelector(':scope > template[shadowrootmode="open"]');
            if (!(template instanceof HTMLTemplateElement)) return;
            this.attachShadow({ mode: "open" }).append(template.content.cloneNode(!0));
        }
    }
}
export class ResizeNotifier extends ResizeObserver {
    #initialized = !1;
    constructor(callback) {
        super((entries) => {
            if (this.#initialized) return callback(entries, this);
            this.#initialized = !0;
        });
    }
    disconnect() {
        (this.#initialized = !1), super.disconnect();
    }
}
(() => {
    function setScrollbarWidth() {
        requestIdleCallback(() => {
            const outer = document.createElement("div");
            (outer.style.cssText = "visibility:hidden;overflow:scroll;position:absolute;width:100px;height:100px;"),
                document.body.appendChild(outer);
            const inner = document.createElement("div");
            (inner.style.width = "100%"), outer.appendChild(inner);
            const scrollbarWidth = outer.offsetWidth - inner.offsetWidth,
                windowWidth = window.innerWidth,
                documentWidth = document.documentElement.clientWidth;
            document.body.removeChild(outer);
            const finalWidth = scrollbarWidth > 0 ? scrollbarWidth : Math.max(0, windowWidth - documentWidth);
            document.documentElement.style.setProperty("--scrollbar-width", `${finalWidth}px`);
        });
    }
    document.readyState === "complete"
        ? setScrollbarWidth()
        : window.addEventListener("load", setScrollbarWidth, { once: !0 });
    let resizeTimeout;
    const debouncedSetScrollbarWidth = () => {
        clearTimeout(resizeTimeout), (resizeTimeout = setTimeout(setScrollbarWidth, 100));
    };
    window.addEventListener("resize", debouncedSetScrollbarWidth),
        window.addEventListener("orientationchange", debouncedSetScrollbarWidth);
})();