

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