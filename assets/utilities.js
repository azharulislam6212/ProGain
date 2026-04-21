/**
 * --------------------------------------------------------
 * DOM & Utility Helpers
 * --------------------------------------------------------
 * Lightweight helper functions for:
 * - DOM selection
 * - Idle & yield scheduling
 * - Responsive breakpoints
 * - Value calculations
 */


/**
 * Shorthand for querySelector.
 *
 * @param {string} selector - CSS selector
 * @param {Document|Element} [scope=document] - Search context
 * @returns {Element|null}
 */
export function qs(selector, scope = document) {
  return scope.querySelector(selector);
}


/**
 * Shorthand for querySelectorAll (returns array).
 *
 * @param {string} selector - CSS selector
 * @param {Document|Element} [scope=document] - Search context
 * @returns {Element[]}
 */
export function qsa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}


/**
 * Cross-browser requestIdleCallback fallback.
 *
 * Uses native requestIdleCallback if available,
 * otherwise falls back to setTimeout.
 */
export const requestIdleCallback =
  typeof window.requestIdleCallback == "function"
    ? window.requestIdleCallback
    : setTimeout;


/**
 * Yields execution to the browser, then runs callback.
 *
 * Useful for breaking up heavy tasks and avoiding UI jank.
 *
 * @param {Function} callback
 */
export const requestYieldCallback = (callback) => {
  requestAnimationFrame(() => {
    setTimeout(callback, 0);
  });
};


/**
 * --------------------------------------------------------
 * Responsive Breakpoints (CSS Media Queries)
 * --------------------------------------------------------
 */

/**
 * Mobile breakpoint (<= 767px)
 */
export const mediaBreakpointMobile = "(width <= 767px)";

/**
 * Tablet breakpoint (768px - 1199px)
 */
export const mediaBreakpointTablet =
  "(width >= 768px) and (width <= 1199px)";

/**
 * Desktop breakpoint (>= 1200px)
 */
export const mediaBreakpointDesktop = "(width >= 1200px)";

/**
 * Large screens (>= 768px)
 */
export const mediaBreakpointLarge = "(min-width: 768px)";


/**
 * MatchMedia instances for real-time breakpoint detection.
 */
export const mediaQueryMobile = matchMedia(mediaBreakpointMobile),
  mediaQueryTablet = matchMedia(mediaBreakpointTablet),
  mediaQueryDesktop = matchMedia(mediaBreakpointDesktop),
  mediaQueryLarge = matchMedia(mediaBreakpointLarge);


/**
 * Checks if current viewport is mobile.
 *
 * @returns {boolean}
 */
export function isMobileBreakpoint() {
  return mediaQueryMobile.matches;
}


/**
 * Checks if current viewport is desktop.
 *
 * @returns {boolean}
 */
export function isDesktopBreakpoint() {
  return mediaQueryDesktop.matches;
}


/**
 * Checks if current viewport is tablet.
 *
 * @returns {boolean}
 */
export function isTabletBreakpoint() {
  return mediaQueryTablet.matches;
}


/**
 * Finds the closest number to a target value from an array.
 *
 * @param {number[]} values - Array of numbers
 * @param {number} target - Target value
 * @returns {number}
 */
export function closest(values, target) {
  return values.reduce(function (prev, curr) {
    return Math.abs(curr - target) < Math.abs(prev - target)
      ? curr
      : prev;
  });
}

/**
 * Prevents the default action of an event.
 * @param {Event} event - The event to prevent the default action of.
 */

export function preventDefault(event) {
  event.preventDefault();
}



/**
 * A custom ResizeObserver that only calls the callback when the element is resized.
 * By default the ResizeObserver callback is called when the element is first observed.
 */
export class ResizeNotifier extends ResizeObserver {
  #initialized = false;

  /**
   * @param {ResizeObserverCallback} callback
   */
  constructor(callback) {
    super((entries) => {
      if (this.#initialized) return callback(entries, this);
      this.#initialized = true;
    });
  }

  disconnect() {
    this.#initialized = false;
    super.disconnect();
  }
}

/**
 * --------------------------------------------------------
 * Lenis Smooth Scroll Manager
 * --------------------------------------------------------
 * Handles global smooth scrolling using Lenis with:
 * - Lazy initialization
 * - Safari & mobile fallback handling
 * - Scroll lock integration (modals, drawers, menus)
 * - Global enable/disable controls
 * - Performance-friendly initialization
 */


/**
 * Cached Lenis instance and initialization state.
 */
let lenisInstance = null,
  lenisInitPromise = null;


/**
 * Cached Safari detection values for performance optimization.
 */
let _isSafariCached = null,
  _safariVersionCached;


/**
 * Scroll lock manager state and cleanup reference.
 */
let scrollLockManagerInitialized = !1,
  scrollLockManagerCleanup = null;


/**
 * Elements that should prevent Lenis smooth scrolling
 * (e.g. modals, drawers, dialogs, scrollable containers).
 */
const LENIS_PREVENT_SELECTOR =
  'dialog, [data-scrollable], .drawer, .modal, [role="dialog"], .search__form';


/**
 * Detects if the current browser is Safari.
 * Result is cached after first execution.
 *
 * @returns {boolean}
 */
export function isSafari() {
  if (_isSafariCached !== null) return _isSafariCached;
  if (typeof window > "u") return !1;

  const ua = window.navigator.userAgent.toLowerCase();

  return (
    (_isSafariCached =
      ua.indexOf("safari") >= 0 &&
      ua.indexOf("chrome") < 0 &&
      ua.indexOf("android") < 0),
    _isSafariCached
  );
}


/**
 * Extracts Safari version (major & minor).
 * Returns null if not Safari or version cannot be determined.
 *
 * @returns {{major: number, minor: number, full: string} | null}
 */
export function getSafariVersion() {
  if (_safariVersionCached !== void 0) return _safariVersionCached;
  if (!isSafari()) return (_safariVersionCached = null), null;

  const match = navigator.userAgent.match(/Version\/([\d.]+)/);
  if (!match) return (_safariVersionCached = null), null;

  const [major, minor] = match[1].split(".").map(Number);

  return (
    (_safariVersionCached = {
      major,
      minor,
      full: match[1],
    }),
    _safariVersionCached
  );
}


/**
 * Determines whether smooth scrolling should be enabled.
 *
 * Disabled when:
 * - Safari (performance/compatibility issues)
 * - Mobile breakpoint
 * - Explicitly disabled in theme settings
 *
 * @returns {boolean}
 */
export function isSmoothScrollEnabled() {
  return isSafari() || isMobileBreakpoint()
    ? !1
    : typeof window.__THEME__?.settings?.smoothScroll < "u"
    ? window.__THEME__.settings.smoothScroll === !0
    : !0;
}


/**
 * Initializes Lenis globally (lazy-loaded).
 * Ensures single instance and avoids duplicate imports.
 *
 * @returns {Promise<Lenis|null>}
 */
function initLenisGlobal() {
  return lenisInitPromise || lenisInstance
    ? lenisInitPromise || Promise.resolve(lenisInstance)
    : isSmoothScrollEnabled()
    ? ((lenisInitPromise = import("@theme/lenis")
        .then(({ Lenis }) =>
          isSmoothScrollEnabled()
            ? (Lenis &&
              !lenisInstance &&
              ((lenisInstance = new Lenis({
                autoRaf: !0,
                smoothWheel: !0,
                wheelMultiplier: 1,
                lerp: 0.25,
                duration: 0.6,

                /**
                 * Prevent smooth scroll inside specific elements
                 */
                prevent: (node) =>
                  !!node.closest(LENIS_PREVENT_SELECTOR),
              })),
              document.documentElement.classList.add("lenis-enabled")),
              lenisInstance)
            : ((lenisInstance = null),
              (lenisInitPromise = null),
              null)
        )
        .catch(() => ((lenisInstance = null),
          (lenisInitPromise = null),
          null))),
      lenisInitPromise)
    : Promise.resolve(null);
}


/**
 * Returns current Lenis instance if available.
 * Triggers initialization if needed.
 *
 * @returns {Lenis|null}
 */
export function getLenis() {
  return isSmoothScrollEnabled()
    ? lenisInstance || (lenisInitPromise || initLenisGlobal(), null)
    : null;
}


/**
 * Enables smooth scrolling globally.
 * Initializes Lenis if not already created.
 *
 * @returns {Promise<Lenis|null>}
 */
export async function enableSmoothScroll() {
  if (typeof window.__THEME__ > "u") window.__THEME__ = {};
  if (typeof window.__THEME__.settings > "u")
    window.__THEME__.settings = {};

  window.__THEME__.settings.smoothScroll = !0;

  if (lenisInstance) {
    lenisInstance.start();
    return lenisInstance;
  }

  const instance = await initLenisGlobal();
  instance && initScrollLockManager();

  return instance;
}


/**
 * Disables smooth scrolling and destroys Lenis instance.
 * Also removes scroll lock observers.
 */
export function disableSmoothScroll() {
  if (typeof window.__THEME__ > "u") window.__THEME__ = {};
  if (typeof window.__THEME__.settings > "u")
    window.__THEME__.settings = {};

  window.__THEME__.settings.smoothScroll = !1;

  if (scrollLockManagerCleanup) {
    scrollLockManagerCleanup();
    scrollLockManagerCleanup = null;
    scrollLockManagerInitialized = !1;
  }

  if (lenisInstance) {
    try {
      lenisInstance.destroy();
    } catch {}

    lenisInstance = null;
    lenisInitPromise = null;

    document.documentElement.classList.remove("lenis-enabled");
  }
}


/**
 * Safely removes a scroll-lock related class.
 * Ensures Lenis is resumed before removing the class.
 *
 * @param {HTMLElement} element
 * @param {string} className
 * @param {Function} [shouldRemove]
 */
export function removeScrollLockClass(
  element,
  className,
  shouldRemove
) {
  const lenis = getLenis();

  lenis
    ? (lenis.start(),
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          (!shouldRemove || shouldRemove()) &&
            element.classList.remove(className);
        });
      }))
    : (!shouldRemove || shouldRemove()) &&
      element.classList.remove(className);
}


/**
 * Initializes scroll lock manager.
 *
 * Watches DOM class changes to:
 * - Pause Lenis when UI overlays are open
 * - Resume Lenis when overlays are closed
 */
function initScrollLockManager() {
  if (scrollLockManagerInitialized || !isSmoothScrollEnabled())
    return;

  scrollLockManagerInitialized = !0;

  let lenis = null,
    isLocked = !1;

  const updateLenis = () => {
    if (!lenis) lenis = getLenis();
  };

  const checkScrollLock = () => {
    const shouldLock =
      document.documentElement.classList.contains("scroll-locked") ||
      document.body.classList.contains("has-dropdown-menu") ||
      document.body.classList.contains("has-mega-menu") ||
      document.body.classList.contains("search-open");

    if (shouldLock !== isLocked) {
      isLocked = shouldLock;
      updateLenis();

      lenis && (shouldLock ? lenis.stop() : lenis.start());
    }
  };

  const htmlObs = new MutationObserver(checkScrollLock);
  const bodyObs = new MutationObserver(checkScrollLock);

  htmlObs.observe(document.documentElement, {
    attributes: !0,
    attributeFilter: ["class"],
  });

  bodyObs.observe(document.body, {
    attributes: !0,
    attributeFilter: ["class"],
  });

  checkScrollLock();

  lenisInitPromise &&
    lenisInitPromise.then(() => {
      updateLenis();
      checkScrollLock();
    });

  scrollLockManagerCleanup = () => {
    htmlObs.disconnect();
    bodyObs.disconnect();
  };
}


/**
 * Initializes Lenis when browser is ready.
 * Uses requestIdleCallback for better performance.
 */
const initializeOnReady = () => {
  if (!isSmoothScrollEnabled()) return;

  if (window.requestIdleCallback) {
    requestIdleCallback(() => initLenisGlobal(), {
      timeout: 2000,
    });
  } else {
    setTimeout(() => initLenisGlobal(), 100);
  }

  initScrollLockManager();
};


/**
 * Bootstraps initialization on DOM ready.
 */
document.readyState === "loading"
  ? document.addEventListener(
      "DOMContentLoaded",
      initializeOnReady
    )
  : initializeOnReady();


/**
 * Expose utilities to global theme object.
 */
if (typeof window.__THEME__ > "u") window.__THEME__ = {};
if (typeof window.__THEME__.utilities > "u")
  window.__THEME__.utilities = {};

__THEME__.utilities = {
  ...__THEME__.utilities,
  getLenis,
  isSmoothScrollEnabled,
  enableSmoothScroll,
  disableSmoothScroll,
  removeScrollLockClass,
};