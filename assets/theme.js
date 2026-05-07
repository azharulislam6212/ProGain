// ------------------------
// Core modules (always needed) 
// ------------------------

import ModuleManager from '@theme/module-manager';
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
    this.modules = new ModuleManager(); 
  }

  // ------------------------
  // Template modules
  // ------------------------

    initTemplateModules() {
    if (this.template === 'product') {
      this.modules.load('variant-picker', () => import('@theme/variant-picker'));
      this.modules.load('product-form', () => import('@theme/product-form'));
    }

    if (this.cartType === 'drawer' && this.template !== 'cart') {
      this.modules.load('cart-drawer', () => import('@theme/cart-drawer'));
    }
  }


  // ------------------------
  // Global modules
  // ------------------------

   initGlobalModules() {      
    initScrollbarWidth();     
    initButtons(); 
  }

  // ------------------------
  // Section modules
  // ------------------------

  initSection(section) {
    if (!section) return;

    const id = section.dataset.sectionId;

    // Prevent duplicate init
    if (section.dataset.initialized) return;
    section.dataset.initialized = 'true';

    if (section.dataset.section === 'featured-collection') {
      this.modules.load( `product-form-${id}`, () => import('@theme/product-form'), section);
    }

    initButtons(section);
  }


    destroySection(section) {
    if (!section) return;
    const id = section.dataset.sectionId;
    this.modules.unload(`product-form-${id}`);
    delete section.dataset.initialized;
  }


  // ------------------------
  // Initialize theme
  // ------------------------
  start() {
    const init = () => {
      this.initTemplateModules();
      this.initGlobalModules();
    };

    if (document.readyState !== 'loading') {
      init();
    } else {
      document.addEventListener('DOMContentLoaded', init);
    }

    // Shopify lifecycle
    document.addEventListener('shopify:section:load', (e) => {
      this.initSection(e.target);
    });

    document.addEventListener('shopify:section:unload', (e) => {
      this.destroySection(e.target);
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