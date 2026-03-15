export function qs(selector, scope = document) {
  return scope.querySelector(selector);
}
export function qsa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}


export const requestIdleCallback =
  typeof window.requestIdleCallback == "function" ? window.requestIdleCallback : setTimeout,
  requestYieldCallback = (callback) => {
    requestAnimationFrame(() => {
      setTimeout(callback, 0);
    });
  };


export const mediaBreakpointMobile = "(width <= 767px)",
  mediaBreakpointTablet = "(width >= 768px) and (width <= 1199px)",
  mediaBreakpointDesktop = "(width >= 1200px)",
  mediaBreakpointLarge = "(min-width: 768px)",
  mediaQueryMobile = matchMedia(mediaBreakpointMobile),
  mediaQueryTablet = matchMedia(mediaBreakpointTablet),
  mediaQueryDesktop = matchMedia(mediaBreakpointDesktop),
  mediaQueryLarge = matchMedia(mediaBreakpointLarge);

export function isMobileBreakpoint() {
  return mediaQueryMobile.matches;
}
export function isDesktopBreakpoint() {
  return mediaQueryDesktop.matches;
}
export function isTabletBreakpoint() {
  return mediaQueryTablet.matches;
}
export function closest(values, target) {
  return values.reduce(function (prev, curr) {
    return Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev;
  });
}
export function preventDefault(event) {
  event.preventDefault();
}


let lenisInstance = null,
  lenisInitPromise = null,
  _isSafariCached = null,
  _safariVersionCached,
  scrollLockManagerInitialized = !1,
  scrollLockManagerCleanup = null;
const LENIS_PREVENT_SELECTOR = 'dialog, [data-scrollable], .drawer, .modal, [role="dialog"], .search__form';
export function isSafari() {
  if (_isSafariCached !== null) return _isSafariCached;
  if (typeof window > "u") return !1;
  const ua = window.navigator.userAgent.toLowerCase();
  return (
    (_isSafariCached = ua.indexOf("safari") >= 0 && ua.indexOf("chrome") < 0 && ua.indexOf("android") < 0),
    _isSafariCached
  );
}

export function getSafariVersion() {
  if (_safariVersionCached !== void 0) return _safariVersionCached;
  if (!isSafari()) return (_safariVersionCached = null), null;
  const match = navigator.userAgent.match(/Version\/([\d.]+)/);
  if (!match) return (_safariVersionCached = null), null;
  const [major, minor] = match[1].split(".").map(Number);
  return (_safariVersionCached = { major, minor, full: match[1] }), _safariVersionCached;
}


export function isSmoothScrollEnabled() {
  return isSafari() || isMobileBreakpoint() ? !1 : typeof window.__THEME__?.settings?.smoothScroll < "u" ? window.__THEME__.settings.smoothScroll === !0 : !0;
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
                prevent: (node) => !!node.closest(LENIS_PREVENT_SELECTOR),
              })),
                document.documentElement.classList.add("lenis-enabled")),
              lenisInstance)
            : ((lenisInstance = null), (lenisInitPromise = null), null)
        )
        .catch(() => ((lenisInstance = null), (lenisInitPromise = null), null))),
        lenisInitPromise)
      : Promise.resolve(null);
}
export function getLenis() {
  return isSmoothScrollEnabled() ? lenisInstance || (lenisInitPromise || initLenisGlobal(), null) : null;
}

export async function enableSmoothScroll() {
  if (
    (typeof window.__THEME__ > "u" && (window.__THEME__ = {}),
      typeof window.__THEME__.settings > "u" && (window.__THEME__.settings = {}),
      (window.__THEME__.settings.smoothScroll = !0),
      lenisInstance)
  )
    return lenisInstance.start(), lenisInstance;
  const instance = await initLenisGlobal();
  return instance && initScrollLockManager(), instance;
}
export function disableSmoothScroll() {
  if (
    (typeof window.__THEME__ > "u" && (window.__THEME__ = {}),
      typeof window.__THEME__.settings > "u" && (window.__THEME__.settings = {}),
      (window.__THEME__.settings.smoothScroll = !1),
      scrollLockManagerCleanup &&
      (scrollLockManagerCleanup(), (scrollLockManagerCleanup = null), (scrollLockManagerInitialized = !1)),
      lenisInstance)
  ) {
    try {
      lenisInstance.destroy();
    } catch { }
    (lenisInstance = null), (lenisInitPromise = null), document.documentElement.classList.remove("lenis-enabled");
  }
}
export function removeScrollLockClass(element, className, shouldRemove) {
  const lenis = getLenis();
  lenis
    ? (lenis.start(),
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          (!shouldRemove || shouldRemove()) && element.classList.remove(className);
        });
      }))
    : (!shouldRemove || shouldRemove()) && element.classList.remove(className);
}
function initScrollLockManager() {
  if (scrollLockManagerInitialized || !isSmoothScrollEnabled()) return;
  scrollLockManagerInitialized = !0;
  let lenis = null,
    isLocked = !1;
  const updateLenis = () => {
    lenis || (lenis = getLenis());
  },
    checkScrollLock = () => {
      const shouldLock =
        document.documentElement.classList.contains("scroll-locked") ||
        document.body.classList.contains("has-dropdown-menu") ||
        document.body.classList.contains("has-mega-menu") ||
        document.body.classList.contains("search-open");
      shouldLock !== isLocked &&
        ((isLocked = shouldLock), updateLenis(), lenis && (shouldLock ? lenis.stop() : lenis.start()));
    },
    htmlObs = new MutationObserver(checkScrollLock),
    bodyObs = new MutationObserver(checkScrollLock);
    htmlObs.observe(document.documentElement, { attributes: !0, attributeFilter: ["class"] }),
    bodyObs.observe(document.body, { attributes: !0, attributeFilter: ["class"] }),
    checkScrollLock(),
    lenisInitPromise &&
    lenisInitPromise.then(() => {
      updateLenis(), checkScrollLock();
    }),
    (scrollLockManagerCleanup = () => {
      htmlObs.disconnect(), bodyObs.disconnect();
    });
}
const initializeOnReady = () => {
  isSmoothScrollEnabled() &&
    (window.requestIdleCallback
      ? requestIdleCallback(() => initLenisGlobal(), { timeout: 2e3 })
      : setTimeout(() => initLenisGlobal(), 100),
      initScrollLockManager());
};
document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", initializeOnReady)
  : initializeOnReady(),
  typeof window.__THEME__ > "u" && (window.__THEME__ = {}),
  typeof window.__THEME__.utilities > "u" && (window.__THEME__.utilities = {}),
  (__THEME__.utilities = {
    ...__THEME__.utilities,
    getLenis,
    isSmoothScrollEnabled,
    enableSmoothScroll,
    disableSmoothScroll,
    removeScrollLockClass,
  });