

export const ThemeEvents = {
    listeners: {},

    // ----------------------------
    // Predefined theme events
    // ----------------------------
    events: {
        CART_ADD: 'theme:cart:add',
        CART_ERROR: 'theme:cart:error',
        VARIANT_CHANGE: 'theme:variant:change',
        LINE_ITEM_CHANGE: 'theme:line-item:change',
        CART_CHANGE: 'theme:cart:change',
        CART_UPDATE: 'theme:cart:update',
        CART_DRAWER_OPENING: 'theme:cart-drawer:opening',
        CART_DRAWER_OPEN: 'theme:cart-drawer:open',
        CART_DRAWER_CLOSING: 'theme:cart-drawer:closing',

        // Menu drawer events
        MENU_DRAWER_OPENING: 'theme:menu-drawer:opening',
        MENU_DRAWER_OPEN: 'theme:menu-drawer:open',
        MENU_DRAWER_CLOSING: 'theme:menu-drawer:closing',
        MENU_DRAWER_CLOSED: 'theme:menu-drawer:closed',

        // dialog events

        DIALOG_OPENING: 'theme:dialog:opening',
        DIALOG_OPEN: 'theme:dialog:open',
        DIALOG_CLOSING: 'theme:dialog:closing',
        DIALOG_CLOSED: 'theme:dialog:closed',

        // Predictive search events
        PREDICTIVE_SEARCH_OPEN: 'theme:predictive-search:open',
        PREDICTIVE_SEARCH_CLOSE: 'theme:predictive-search:close',
        PREDICTIVE_SEARCH_INPUT: 'theme:predictive-search:input',
        PREDICTIVE_SEARCH_RESULTS_UPDATE: 'theme:predictive-search:results-update',
        PREDICTIVE_SEARCH_RESULT_SELECT: 'theme:predictive-search:result-select',
        PREDICTIVE_SEARCH_NO_RESULTS: 'theme:predictive-search:no-results',
        PREDICTIVE_SEARCH_ERROR: 'theme:predictive-search:error',


        // ACCORDION events
        ACCORDION_OPEN: 'theme:accordion:open',
        ACCORDION_CLOSE: 'theme:accordion:close',
        ACCORDION_TOGGLE: 'theme:accordion:toggle',

        // Deferred Media (your DeferredMedia JS)
        MEDIA_PLAY: 'theme:media:play',
        MEDIA_PAUSE: 'theme:media:pause',
        MEDIA_END: 'theme:media:end',
        MEDIA_LOADED: 'theme:media:loaded',
        MEDIA_ERROR: 'theme:media:error',

    },

    // Subscribe to a custom event
    on(eventName, callback) {
        if (!this.listeners[eventName]) this.listeners[eventName] = [];
        this.listeners[eventName].push(callback);
        document.addEventListener(eventName, callback);
    },

    // Trigger an event with optional data
    trigger(eventName, detail = {}) {
        document.dispatchEvent(new CustomEvent(eventName, { detail }));
    },

    // Remove listener
    off(eventName, callback) {
        document.removeEventListener(eventName, callback);
        if (this.listeners[eventName]) {
            this.listeners[eventName] = this.listeners[eventName].filter(fn => fn !== callback);
        }
    }
};



// export class ThemeEvents {
//   static variantSelected="variant:selected";
//   static variantUpdate="variant:update";
//   static cartUpdate="cart:update";
//   static cartError="cart:error";
//   static cartGroupedSections="cart:grouped-sections";
//   static mediaStartedPlaying="media:started-playing";
//   static modelInteraction="model:interaction";
//   static quantitySelectorUpdate="quantity-selector:update";
//   static discountUpdate="discount:update";
//   static FilterUpdate="filter:update";
//   static pageTransitionStart="page:transition:start";
//   static pageTransitionEnd="page:transition:end";
//   static pageLoaded="page:loaded"
// }

// export class VariantSelectedEvent extends Event {
//   constructor(resource) {
//     super(ThemeEvents.variantSelected, {
//       bubbles:  !0
//     }
//     ),
//     this.detail= {
//       resource
//     }
//   }
// }

// export class VariantUpdateEvent extends Event {
//   constructor(resource, sourceId, data) {
//     super(ThemeEvents.variantUpdate, {
//       bubbles:  !0
//     }
//     ),
//     this.detail= {
//       resource:resource||null,
//       sourceId,
//       data: {
//         html: data.html, productId:data.productId, newProduct:data.newProduct, fromCache:data.fromCache, isBackgroundSync:data.isBackgroundSync
//       }
//     }
//   }
// }

// export class CartAddEvent extends Event {
//   constructor(resource, sourceId, data) {
//     super(CartAddEvent.eventName, {
//       bubbles:  !0
//     }
//     ),
//     this.detail= {
//       resource,
//       sourceId,
//       data: {
//         ...data,
//         isIncremental:  !0
//       }
//     }
//   }
//   static eventName=ThemeEvents.cartUpdate
// }

// export class CartUpdateEvent extends Event {
//   constructor(resource, sourceId, data) {
//     super(ThemeEvents.cartUpdate, {
//       bubbles:  !0
//     }
//     ),
//     this.detail= {
//       resource,
//       sourceId,
//       data: {
//         ...data,
//         isIncremental:  !1
//       }
//     }
//   }
// }

// export class CartErrorEvent extends Event {
//   constructor(sourceId, message) {
//     super(ThemeEvents.cartError, {
//       bubbles:  !0
//     }
//     ),
//     this.detail= {
//       sourceId,
//       data: {
//         message
//       }
//     }
//   }
// }

// export class CartGroupedSections extends Event {
//   constructor(sections) {
//     super(CartGroupedSections.eventName, {
//       bubbles:  !0
//     }
//     ),
//     this.detail= {
//       sections
//     }
//   }
//   static eventName=ThemeEvents.cartGroupedSections
// }

// export class QuantitySelectorUpdateEvent extends Event {
//   constructor(quantity, cartLine) {
//     super(ThemeEvents.quantitySelectorUpdate, {
//       bubbles:  !0
//     }
//     ),
//     this.detail= {
//       quantity,
//       cartLine
//     }
//   }
// }

// export class DiscountUpdateEvent extends Event {
//   constructor(resource, sourceId) {
//     super(ThemeEvents.discountUpdate, {
//       bubbles:  !0
//     }
//     ),
//     this.detail= {
//       resource,
//       sourceId
//     }
//   }
// }

// export class MediaStartedPlayingEvent extends Event {
//   constructor(resource) {
//     super(ThemeEvents.mediaStartedPlaying, {
//       bubbles:  !0
//     }
//     ),
//     this.detail= {
//       resource
//     }
//   }
// }

// export class ModelInteractionEvent extends Event {
//   constructor(resource, isInteracting) {
//     super(ThemeEvents.modelInteraction, {
//       bubbles:  !0
//     }
//     ),
//     this.detail= {
//       resource,
//       isInteracting
//     }
//   }
// }

// export class FilterUpdateEvent extends Event {
//   constructor(queryParams) {
//     super(ThemeEvents.FilterUpdate, {
//       bubbles:  !0
//     }
//     ),
//     this.detail= {
//       queryParams
//     }
//   }
//   shouldShowClearAll() {
//     return[...this.detail.queryParams.entries()].filter(([key])=>key.startsWith("filter.")).length>0
//   }
// }
 