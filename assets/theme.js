// ------------------------
// Core modules (always needed) 
// ------------------------

import { ThemeEvents } from '@theme/events';
import { requestIdleCallback } from "@theme/utilities";
import { initScrollbarWidth } from '@theme/scrollbar';
import { initButtons } from '@theme/components';
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
      initButtons(); 
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

      initButtons(section);

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