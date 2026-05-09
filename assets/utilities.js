// ========================
// DOM UTILITIES
// ========================

export function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

export function qsa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

export class ResizeNotifier extends ResizeObserver {
  #initialized = false;

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

// ========================
// MEDIA / BREAKPOINTS
// ========================

export const mediaBreakpointMobile = "(width <= 767px)";
export const mediaBreakpointTablet =  "(width >= 768px) and (width <= 1199px)";
export const mediaBreakpointDesktop = "(width >= 1200px)";
export const mediaBreakpointLarge ="(min-width: 768px)";

export const mediaQueryMobile =
  matchMedia(mediaBreakpointMobile);

export const mediaQueryTablet =
  matchMedia(mediaBreakpointTablet);

export const mediaQueryDesktop =
  matchMedia(mediaBreakpointDesktop);

export const mediaQueryLarge =
  matchMedia(mediaBreakpointLarge);

export function isMobileBreakpoint() {
  return mediaQueryMobile.matches;
}

export function isDesktopBreakpoint() {
  return mediaQueryDesktop.matches;
}

export function isTabletBreakpoint() {
  return mediaQueryTablet.matches;
}

// ========================
// GENERAL HELPERS
// ========================

export function closest(values, target) {
  return values.reduce((prev, curr) =>
    Math.abs(curr - target) <
      Math.abs(prev - target)
      ? curr
      : prev
  );
}

export function preventDefault(event) {
  event.preventDefault();
}

// ========================
// STORAGE UTILITIES
// ========================

let isStorageSupported = false;

try {
  const key = "theme:test";

  window.localStorage.setItem(key, "test");
  window.localStorage.removeItem(key);

  isStorageSupported = true;
} catch { }

export function hasLocalStorage() {
  return isStorageSupported;
}

export function setLocalStorage(
  key,
  value,
  expiryInDays = null
) {
  if (!hasLocalStorage()) return;

  const item = { value };

  if (expiryInDays !== null) {
    const now = new Date();

    item.expiry =
      now.getTime() +
      expiryInDays * 864e5;
  }

  window.localStorage.setItem(
    key,
    JSON.stringify(item)
  );
}

export function getLocalStorage(key) {
  if (!hasLocalStorage()) return null;

  const itemStr =
    window.localStorage.getItem(key);

  if (!itemStr) return null;

  const item = JSON.parse(itemStr);

  if (
    item.expiry &&
    new Date().getTime() > item.expiry
  ) {
    window.localStorage.removeItem(key);
    return null;
  }

  return item.value;
}

// ========================
// PERFORMANCE UTILITIES
// ========================

export const requestIdleCallback =
  typeof window.requestIdleCallback ===
    "function"
    ? window.requestIdleCallback
    : setTimeout;

export const requestYieldCallback = (
  callback
) => {
  requestAnimationFrame(() => {
    setTimeout(callback, 0);
  });
};

export function debounce(fn, wait) {
  let timeout;

  function debounced(...args) {
    clearTimeout(timeout);

    timeout = setTimeout(
      () => fn.apply(this, args),
      wait
    );
  }

  debounced.cancel = () => {
    clearTimeout(timeout);
  };

  return debounced;
}

export function throttle(fn, delay) {
  let lastCall = 0;

  function throttled(...args) {
    const now = performance.now();

    if (now - lastCall >= delay) {
      lastCall = now;
      fn.apply(this, args);
    }
  }

  throttled.cancel = () => {
    lastCall = performance.now();
  };

  return throttled;
}

// ========================
// MOTION / ANIMATION
// ========================

const reducedMotion = matchMedia(
  "(prefers-reduced-motion: reduce)"
);

export function prefersReducedMotion() {
  return reducedMotion.matches;
}

const hoverFine = matchMedia("(hover: hover)");

export function mediaHoverFine() {
  return hoverFine.matches;
}

export function coordinatedInView(
  element,
  callback,
  options = {}
) {
  if (typeof window === "undefined") {
    return () => { };
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {

        if (!entry.isIntersecting) return;

        callback(entry.target);

        if (options.once !== false) {
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold:
        options.threshold ?? 0.15,

      rootMargin:
        options.rootMargin ?? "50px",
    }
  );

  observer.observe(element);

  return () => observer.disconnect();
}

export function onAnimationEnd(
  elements,
  callback,
  options = { subtree: true }
) {
  const animationPromises = (
    Array.isArray(elements)
      ? elements.flatMap((element) =>
        element.getAnimations(options)
      )
      : elements.getAnimations(options)
  ).reduce((acc, animation) => {

    if (
      animation.timeline instanceof
      DocumentTimeline
    ) {
      acc.push(animation.finished);
    }

    return acc;

  }, []);

  return Promise.allSettled(
    animationPromises
  ).then(callback);
}

// ========================
// VIEW TRANSITIONS
// ========================

export function supportsViewTransitions() {
  return (
    typeof document.startViewTransition ===
    "function"
  );
}

export const viewTransition = {
  current: undefined,
};

class Scheduler {
  #queue = new Set();
  #scheduled = false;

  schedule = async (task) => {
    this.#queue.add(task);

    if (!this.#scheduled) {
      this.#scheduled = true;

      if (viewTransition.current) {
        await viewTransition.current;
      }

      requestAnimationFrame(this.flush);
    }
  };

  flush = () => {
    for (const task of this.#queue) {
      task();
    }

    this.#queue.clear();
    this.#scheduled = false;
  };
}

export const scheduler = new Scheduler();

// ========================
// STRING / FORMATTERS
// ========================

export function normalizeString(str) {
  return str
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function formatMoney(value) {
  let valueWithNoSpaces =
    value.replace(" ", "");

  return valueWithNoSpaces.indexOf(",") === -1
    ? valueWithNoSpaces
    : valueWithNoSpaces.indexOf(",") <
      valueWithNoSpaces.indexOf(".")
      ? valueWithNoSpaces.replace(",", "")
      : valueWithNoSpaces.indexOf(".") <
        valueWithNoSpaces.indexOf(",")
        ? valueWithNoSpaces
          .replace(".", "")
          .replace(",", ".")
        : valueWithNoSpaces.replace(",", ".");
}

// ========================
// DOM HELPERS
// ========================

export function waitForEvent(
  element,
  eventName
) {
  return new Promise((resolve) => {

    const eventHandler = (event) => {

      if (event.target === element) {

        element.removeEventListener(
          eventName,
          eventHandler
        );

        resolve(event);
      }
    };

    element.addEventListener(
      eventName,
      eventHandler
    );
  });
}

export function isPointWithinElement(
  x,
  y,
  element
) {
  const {
    left,
    right,
    top,
    bottom,
  } = element.getBoundingClientRect();

  return (
    x >= left &&
    x <= right &&
    y >= top &&
    y <= bottom
  );
}

// ========================
// FOCUS / ACCESSIBILITY
// ========================

const trapFocusHandlers = {};

export function getFocusableElements(
  container
) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), input:not([type=hidden]):enabled, select:enabled, textarea:enabled"
    )
  );
}

export function removeTrapFocus() {
  trapFocusHandlers.keydown &&
    document.removeEventListener(
      "keydown",
      trapFocusHandlers.keydown,
      true
    );

  trapFocusHandlers.focusin &&
    document.removeEventListener(
      "focusin",
      trapFocusHandlers.focusin,
      true
    );
}

// ========================
// DEVICE / PLATFORM
// ========================

export function isTouch() {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0
  );
}

export function getIOSVersion() {
  const { userAgent } = navigator;

  if (!/(iPhone|iPad)/i.test(userAgent)) {
    return null;
  }

  const version =
    userAgent.match(/OS ([\d_]+)/)?.[1];

  const [major, minor] =
    version?.split("_") || [];

  if (!version || !major) {
    return null;
  }

  return {
    fullString: version.replace("_", "."),
    major: parseInt(major, 10),
    minor: minor
      ? parseInt(minor, 10)
      : 0,
  };
}

// ========================
// LOADING HELPERS
// ========================

export function resetLoading(
  container = document.body
) {
  container
    .querySelectorAll(".btn--loading")
    .forEach((item) => {
      item.classList.remove(
        "btn--loading"
      );
    });
}


// ========================
// LENIS SMOOTH SCROLL
// ========================

 

let lenisInstance = null,
  lenisInitPromise = null;

let _isSafariCached = null,
  _safariVersionCached;

let scrollLockManagerInitialized = !1,
  scrollLockManagerCleanup = null;

const LENIS_PREVENT_SELECTOR =
  'dialog, [data-scrollable], .drawer, .modal, [role="dialog"], .search__form';

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

export function isSmoothScrollEnabled() {
  return isSafari() || isMobileBreakpoint()
    ? !1
    : typeof window.__THEME__?.settings?.smoothScroll < "u"
      ? window.__THEME__.settings.smoothScroll === !0
      : !0;
}

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

export function getLenis() {
  return isSmoothScrollEnabled()
    ? lenisInstance || (lenisInitPromise || initLenisGlobal(), null)
    : null;
}

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
    } catch { }

    lenisInstance = null;
    lenisInitPromise = null;

    document.documentElement.classList.remove("lenis-enabled");
  }
}

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

document.readyState === "loading"
  ? document.addEventListener(
    "DOMContentLoaded",
    initializeOnReady
  )
  : initializeOnReady();

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
