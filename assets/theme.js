// ------------------------ 
// Import all modules
// ------------------------
import '@theme/utilities.js';
import { ThemeEvents } from '@theme/events';

// ------------------------
// Theme Object
// ------------------------
const ThemeObj = {
  // Auto init all known init functions
  initModules() {
    const moduleNames = Object.keys(window);
    moduleNames.forEach(name => {
      if (typeof window[name] === 'function' && name.startsWith('init')) {
        try { window[name](); } catch (e) { console.error(e); }
      }
    });
  },

  // Shopify section hydration
  initSection(section) {
    if (!section) return;
    if (typeof window.initVariantPicker === 'function') window.initVariantPicker(section);
    if (typeof window.initProductForms === 'function') window.initProductForms(section);
  },

  init() {
    // DOM ready
    document.addEventListener('DOMContentLoaded', () => {
      this.initModules(); // ✅ arrow function + this = ThemeObj
    });

    // Shopify section load
    document.addEventListener('shopify:section:load', (event) => {
      this.initSection(event.target);
    });
  }
};

// ------------------------
// Init Theme
// ------------------------
ThemeObj.init();
window.Theme = ThemeObj;
window.ThemeEvents = ThemeEvents;