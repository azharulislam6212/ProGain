// ------------------------
// Core modules (always needed) 
// ------------------------
import  PageTransition  from "@theme/page-transition";
import Modules from '@theme/modules';
import { ThemeEvents } from '@theme/events';
import { requestIdleCallback } from "@theme/utilities";
import { initScrollbarWidth } from '@theme/scrollbar';
import { initButtons } from '@theme/component';
import { initMotionEngine } from "@theme/motion-engine";

  

// ------------------------
// Theme loader
// ------------------------
class Theme {
  constructor() {
    this.config = window.__THEME__ || {};
    this.template = this.config?.template?.name || null;
    this.cartType = this.config?.cartType || 'page';
    this.enablePageTransitions = this.config?.enablePageTransitions ||  false ;
    this.modules = new Modules(); 
    
    this.isDesignMode = window.Shopify && Shopify.designMode === true;

  
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
    
    if(this.enablePageTransitions){
      new PageTransition();
    }
 
    initScrollbarWidth();     
    initButtons(); 

     //  Motion Engine (GLOBAL UI BEHAVIOR)
       requestIdleCallback(() => {
        initMotionEngine(document);
      });
 
  }
 
  // ------------------------
  // Section modules
  // ------------------------

  initSection(section) {
    if (!section) return;

    const id = section.dataset.sectionId? section.dataset.sectionId: null;

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
       initMotionEngine(e.target);
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
window.__DESIGN_MODE__ = theme.isDesignMode;
window.ThemeEvents = ThemeEvents;