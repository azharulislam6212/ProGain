export function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

export function qsa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

export const requestIdleCallback =
  typeof window.requestIdleCallback == "function"
    ? window.requestIdleCallback
    : setTimeout;

export const requestYieldCallback = (callback) => {
  requestAnimationFrame(() => {
    setTimeout(callback, 0);
  });
};

export const mediaBreakpointMobile = "(width <= 767px)";
export const mediaBreakpointTablet =
  "(width >= 768px) and (width <= 1199px)";
export const mediaBreakpointDesktop = "(width >= 1200px)";
export const mediaBreakpointLarge = "(min-width: 768px)";
export const mediaQueryMobile = matchMedia(mediaBreakpointMobile),
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
    return Math.abs(curr - target) < Math.abs(prev - target)
      ? curr
      : prev;
  });
}

export function preventDefault(event) {
  event.preventDefault();
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




let isStorageSupported = !1;
try {
  const key = "pebble:test";
  window.localStorage.setItem(key, "test"), window.localStorage.removeItem(key), (isStorageSupported = !0);
} catch { }
export function hasLocalStorage() {
  return isStorageSupported;
}
export function setLocalStorage(key, value, expiryInDays = null) {
  if (!hasLocalStorage()) return;
  const item = { value };
  if (expiryInDays !== null) {
    const now = new Date();
    item.expiry = now.getTime() + expiryInDays * 864e5;
  }
  window.localStorage.setItem(key, JSON.stringify(item));
}
export function getLocalStorage(key) {
  if (!hasLocalStorage()) return null;
  const itemStr = window.localStorage.getItem(key);
  if (!itemStr) return null;
  const item = JSON.parse(itemStr);
  return item.expiry && new Date().getTime() > item.expiry ? (window.localStorage.removeItem(key), null) : item.value;
}
export const requestIdleCallback =
  typeof window.requestIdleCallback == "function" ? window.requestIdleCallback : setTimeout,
  requestYieldCallback = (callback) => {
    requestAnimationFrame(() => {
      setTimeout(callback, 0);
    });
  };
export function supportsViewTransitions() {
  return typeof document.startViewTransition == "function";
}
export const viewTransition = { current: void 0 };
export function fetchConfig(type = "json", config = {}) {
  const headers = { "Content-Type": "application/json", Accept: `application/${type}`, ...config.headers };
  return (
    type === "javascript" && ((headers["X-Requested-With"] = "XMLHttpRequest"), delete headers["Content-Type"]),
    { method: "POST", headers, body: config.body }
  );
}
export function getSectionId(element) {
  return element.hasAttribute("data-section-id")
    ? element.dataset.sectionId
    : (element.classList.contains("shopify-section") || (element = element.closest(".shopify-section")),
      element.id.replace("shopify-section-", ""));
}
export function debounce(fn, wait) {
  let timeout;
  function debounced(...args) {
    clearTimeout(timeout), (timeout = setTimeout(() => fn.apply(this, args), wait));
  }
  return (
    (debounced.cancel = () => {
      clearTimeout(timeout);
    }),
    debounced
  );
}
export function throttle(fn, delay) {
  let lastCall = 0;
  function throttled(...args) {
    const now = performance.now();
    now - lastCall >= delay && ((lastCall = now), fn.apply(this, args));
  }
  return (
    (throttled.cancel = () => {
      lastCall = performance.now();
    }),
    throttled
  );
}
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
export function prefersReducedMotion() {
  return reducedMotion.matches;
}
const hoverFine = matchMedia("(hover: hover)");
export function mediaHoverFine() {
  return hoverFine.matches;
}
export function normalizeString(str) {
  return str
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}
export function formatMoney(value) {
  let valueWithNoSpaces = value.replace(" ", "");
  return valueWithNoSpaces.indexOf(",") === -1
    ? valueWithNoSpaces
    : valueWithNoSpaces.indexOf(",") < valueWithNoSpaces.indexOf(".")
      ? valueWithNoSpaces.replace(",", "")
      : valueWithNoSpaces.indexOf(".") < valueWithNoSpaces.indexOf(",")
        ? valueWithNoSpaces.replace(".", "").replace(",", ".")
        : valueWithNoSpaces.indexOf(",") !== -1
          ? valueWithNoSpaces.replace(",", ".")
          : valueWithNoSpaces;
}
export function formatCurrency(cents, format) {
  return window.Shopify?.formatMoney ? window.Shopify.formatMoney(cents, format) : formatShopifyMoney(cents, format);
}
export function formatShopifyMoney(cents, format) {
  let moneyFormat = "${{amount}}";
  window.FoxTheme?.moneyFormat
    ? (moneyFormat = window.FoxTheme.moneyFormat)
    : window.Shopify?.currency?.money_format && (moneyFormat = window.Shopify.currency.money_format),
    typeof cents == "string" && (cents = cents.replace(".", ""));
  let value = "";
  const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/,
    formatString = format || moneyFormat;
  function formatWithDelimiters(number, precision, thousands, decimal) {
    if (((thousands = thousands || ","), (decimal = decimal || "."), isNaN(number) || number === null)) return 0;
    number = (number / 100).toFixed(precision);
    const parts = number.split("."),
      dollarsAmount = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1" + thousands),
      centsAmount = parts[1] ? decimal + parts[1] : "";
    return dollarsAmount + centsAmount;
  }
  const match = formatString.match(placeholderRegex);
  if (!match) return formatString;
  switch (match[1]) {
    case "amount":
      value = formatWithDelimiters(cents, 2);
      break;
    case "amount_no_decimals":
      value = formatWithDelimiters(cents, 0);
      break;
    case "amount_with_comma_separator":
      value = formatWithDelimiters(cents, 2, ".", ",");
      break;
    case "amount_no_decimals_with_comma_separator":
      value = formatWithDelimiters(cents, 0, ".", ",");
      break;
    case "amount_no_decimals_with_space_separator":
      value = formatWithDelimiters(cents, 0, " ");
      break;
    case "amount_with_apostrophe_separator":
      value = formatWithDelimiters(cents, 2, "'");
      break;
    default:
      value = formatWithDelimiters(cents, 2);
  }
  return formatString.replace(placeholderRegex, value);
}
export function onDocumentReady(callback) {
  document.readyState === "complete" ? callback() : window.addEventListener("load", callback);
}
export function onAnimationEnd(elements, callback, options = { subtree: !0 }) {
  const animationPromises = (
    Array.isArray(elements)
      ? elements.flatMap((element) => element.getAnimations(options))
      : elements.getAnimations(options)
  ).reduce(
    (acc, animation) => (animation.timeline instanceof DocumentTimeline && acc.push(animation.finished), acc),
    []
  );
  return Promise.allSettled(animationPromises).then(callback);
}
export async function waitForMediaReady(elements) {
  const tasks = (Array.isArray(elements) ? elements : elements ? Array.from(elements) : []).map((el) => {
    if (el instanceof HTMLImageElement) {
      if (el.getAttribute("is") === "responsive-image") {
        if (el.ready instanceof Promise) return el.ready;
        if (typeof el.isReady == "boolean" && el.isReady) return Promise.resolve();
        if (!el.complete || el.naturalWidth === 0)
          return new Promise((resolve) => {
            const timeout = setTimeout(resolve, 5e3);
            el.addEventListener(
              "image:ready",
              () => {
                clearTimeout(timeout), resolve();
              },
              { once: !0 }
            );
          });
      }
      return el.complete && el.naturalWidth > 0
        ? Promise.resolve()
        : new Promise((res) => {
          el.addEventListener("load", res, { once: !0 }), el.addEventListener("error", res, { once: !0 });
        });
    }
    return Promise.resolve();
  });
  await Promise.allSettled(tasks);
}
export function waitForEvent(element, eventName) {
  return new Promise((resolve) => {
    const eventHandler = (event) => {
      event.target === element && (element.removeEventListener(eventName, eventHandler), resolve(event));
    };
    element.addEventListener(eventName, eventHandler);
  });
}
export function isClickedOutside(event, element) {
  return event.target instanceof HTMLDialogElement || !(event.target instanceof Element)
    ? !isPointWithinElement(event.clientX, event.clientY, element)
    : !element.contains(event.target);
}
export function isPointWithinElement(x, y, element) {
  const { left, right, top, bottom } = element.getBoundingClientRect();
  return x >= left && x <= right && y >= top && y <= bottom;
}
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
export function getVisibleElements(root, elements, ratio = 1, axis) {
  if (!elements?.length) return [];
  const rootRect = root.getBoundingClientRect();
  return elements.filter((element) => {
    const { width, height, top, right, left, bottom } = element.getBoundingClientRect();
    if (ratio < 1) {
      const intersectionLeft = Math.max(rootRect.left, left),
        intersectionRight = Math.min(rootRect.right, right),
        intersectionWidth = Math.max(0, intersectionRight - intersectionLeft);
      if (axis === "x") return width > 0 && intersectionWidth / width >= ratio;
      const intersectionTop = Math.max(rootRect.top, top),
        intersectionBottom = Math.min(rootRect.bottom, bottom),
        intersectionHeight = Math.max(0, intersectionBottom - intersectionTop);
      if (axis === "y") return height > 0 && intersectionHeight / height >= ratio;
      const intersectionArea = intersectionWidth * intersectionHeight,
        elementArea = width * height;
      return elementArea > 0 && intersectionArea / elementArea >= ratio;
    }
    const isWithinX = left >= rootRect.left && right <= rootRect.right;
    if (axis === "x") return isWithinX;
    const isWithinY = top >= rootRect.top && bottom <= rootRect.bottom;
    return (axis === "y" || isWithinX) && isWithinY;
  });
}
const trapFocusHandlers = {};
export function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  );
}
export function trapFocus(container) {
  removeTrapFocus();
  const focusable = getFocusableElements(container);
  if (!focusable.length) return;
  const first = focusable[0],
    last = focusable[focusable.length - 1];
  (trapFocusHandlers.keydown = (event) => {
    if (event.key !== "Tab") return;
    const activeEl = document.activeElement;
    !event.shiftKey && activeEl === last
      ? (event.preventDefault(), first?.focus())
      : event.shiftKey &&
      (activeEl === first || activeEl === container) &&
      (event.preventDefault(), last?.focus());
  }),
    (trapFocusHandlers.focusin = (event) => {
      event.target instanceof Node &&
        !container.contains(event.target) &&
        (event.stopPropagation(), first?.focus());
    }),
    document.addEventListener("keydown", trapFocusHandlers.keydown, !0),
    document.addEventListener("focusin", trapFocusHandlers.focusin, !0),
    container.focus();
}
export function removeTrapFocus() {
  trapFocusHandlers.keydown && document.removeEventListener("keydown", trapFocusHandlers.keydown, !0),
    trapFocusHandlers.focusin && document.removeEventListener("focusin", trapFocusHandlers.focusin, !0);
}
export function isTouch() {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
}
export function getIOSVersion() {
  const { userAgent } = navigator;
  if (!/(iPhone|iPad)/i.test(userAgent)) return null;
  const version = userAgent.match(/OS ([\d_]+)/)?.[1],
    [major, minor] = version?.split("_") || [];
  return !version || !major
    ? null
    : { fullString: version.replace("_", "."), major: parseInt(major, 10), minor: minor ? parseInt(minor, 10) : 0 };
}
export function cycleFocus(items, increment) {
  let targetIndex = items.findIndex((item) => item.matches(":focus")) + increment;
  targetIndex >= items.length ? (targetIndex = 0) : targetIndex < 0 && (targetIndex = items.length - 1);
  const targetItem = items[targetIndex];
  targetItem && targetItem.focus();
}
class Scheduler {
  #queue = new Set();
  #scheduled = !1;
  schedule = async (task) => {
    this.#queue.add(task),
      this.#scheduled ||
      ((this.#scheduled = !0),
        viewTransition.current && (await viewTransition.current),
        requestAnimationFrame(this.flush));
  };
  flush = () => {
    for (const task of this.#queue) task();
    this.#queue.clear(), (this.#scheduled = !1);
  };
}
export const scheduler = new Scheduler();
class TooltipManager {
  constructor() {
    (this.portal = null),
      (this.activeTooltips = new Map()),
      (this.initialized = !1),
      (this.observer = null),
      (this.tooltipIdCounter = 0),
      (this.defaults = {
        position: "auto",
        trigger: "hover",
        delay: 50,
        hideDelay: 50,
        offset: 12,
        arrow: !0,
        interactive: !1,
        maxWidth: 250,
        zIndex: 9999,
      }),
      (this.handleMouseEnter = this.handleMouseEnter.bind(this)),
      (this.handleMouseLeave = this.handleMouseLeave.bind(this)),
      (this.handleClick = this.handleClick.bind(this)),
      (this.handleFocus = this.handleFocus.bind(this)),
      (this.handleBlur = this.handleBlur.bind(this)),
      (this.handleKeydown = this.handleKeydown.bind(this)),
      (this.handleDocumentClick = this.handleDocumentClick.bind(this)),
      (this.handleResize = throttle(this.updatePositions.bind(this), 100)),
      (this.handleScroll = throttle(this.updatePositions.bind(this), 100));
  }
  init() {
    this.initialized ||
      isTouch() ||
      (this.createPortal(),
        this.bindGlobalEvents(),
        this.scanAndBind(),
        (this.initialized = !0),
        this.observeDOM());
  }
  createPortal() {
    this.portal ||
      ((this.portal = document.createElement("div")),
        (this.portal.id = "tooltip-portal"),
        this.portal.setAttribute("aria-hidden", "true"),
        (this.portal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: ${this.defaults.zIndex};
      pointer-events: none;
    `),
        document.body.appendChild(this.portal));
  }
  scanAndBind(container = document) {
    if (isTouch()) return;
    container.querySelectorAll("[data-tooltip], [data-tooltip-html]").forEach((el) => {
      this.activeTooltips.has(el) || this.bindElement(el);
    });
  }
  bindElement(element) {
    if (!document.contains(element)) return;
    const options = this.getOptionsFromElement(element),
      handlers = {};
    this.activeTooltips.set(element, { options, tooltip: null, showTimeout: null, hideTimeout: null, handlers }),
      options.trigger === "hover"
        ? isMobileBreakpoint()
          ? ((handlers.click = this.handleClick.bind(this)),
            element.addEventListener("click", handlers.click))
          : ((handlers.mouseenter = this.handleMouseEnter.bind(this)),
            (handlers.mouseleave = this.handleMouseLeave.bind(this)),
            element.addEventListener("mouseenter", handlers.mouseenter),
            element.addEventListener("mouseleave", handlers.mouseleave))
        : options.trigger === "click"
          ? ((handlers.click = this.handleClick.bind(this)), element.addEventListener("click", handlers.click))
          : options.trigger === "focus" &&
          ((handlers.focus = this.handleFocus.bind(this)),
            (handlers.blur = this.handleBlur.bind(this)),
            element.addEventListener("focus", handlers.focus),
            element.addEventListener("blur", handlers.blur));
  }
  unbindElement(element) {
    const data = this.activeTooltips.get(element);
    if (data) {
      if (data.handlers && document.contains(element))
        try {
          Object.entries(data.handlers).forEach(([event, handler]) => {
            element.removeEventListener(event, handler);
          });
        } catch { }
      this.clearTimeouts(element),
        data.tooltip && this.destroyTooltip(element),
        this.activeTooltips.delete(element);
    }
  }
  #buildTooltipClasses(options) {
    const classes = ["tooltip"];
    return options.interactive && classes.push("tooltip--interactive"), classes.join(" ");
  }
  getOptionsFromElement(element) {
    const dataset = element.dataset;
    return {
      ...this.defaults,
      content: dataset.tooltip || dataset.tooltipHtml || "",
      isHtml: !!dataset.tooltipHtml,
      position: dataset.tooltipPosition || this.defaults.position,
      trigger: dataset.tooltipTrigger || this.defaults.trigger,
      delay: parseInt(dataset.tooltipDelay) || this.defaults.delay,
      hideDelay: parseInt(dataset.tooltipHideDelay) || this.defaults.hideDelay,
      offset: parseInt(dataset.tooltipOffset) || this.defaults.offset,
      arrow: dataset.tooltipArrow !== "false",
      interactive: dataset.tooltipInteractive === "true",
      maxWidth: parseInt(dataset.tooltipMaxWidth) || this.defaults.maxWidth,
    };
  }
  handleMouseEnter(event) {
    this.show(event.currentTarget);
  }
  handleMouseLeave(event) {
    this.hide(event.currentTarget);
  }
  handleClick(event) {
    const element = event.currentTarget;
    this.activeTooltips.get(element)?.tooltip ? this.hide(element) : this.show(element, { delay: 0 });
  }
  handleFocus(event) {
    this.show(event.currentTarget, { delay: 0 });
  }
  handleBlur(event) {
    this.hide(event.currentTarget);
  }
  handleKeydown(event) {
    event.key === "Escape" && this.hideAll();
  }
  handleDocumentClick(event) {
    this.activeTooltips.forEach((data, element) => {
      if (data.tooltip && data.options.trigger === "click") {
        const isClickOnTrigger = element.contains(event.target),
          isClickOnTooltip = data.tooltip.contains(event.target);
        !isClickOnTrigger && !isClickOnTooltip && this.hide(element);
      }
    });
  }
  show(element, options = {}) {
    const data = this.activeTooltips.get(element);
    if (!data) return;
    const mergedOptions = { ...data.options, ...options };
    this.clearTimeouts(element),
      (data.showTimeout = setTimeout(() => {
        this.createTooltip(element, mergedOptions);
      }, mergedOptions.delay));
  }
  hide(element) {
    const data = this.activeTooltips.get(element);
    data &&
      (this.clearTimeouts(element),
        (data.hideTimeout = setTimeout(() => {
          this.destroyTooltip(element);
        }, data.options.hideDelay)));
  }
  hideAll() {
    this.activeTooltips.forEach((data, element) => {
      this.destroyTooltip(element);
    });
  }
  clearTimeouts(element) {
    const data = this.activeTooltips.get(element);
    data &&
      (data.showTimeout && (clearTimeout(data.showTimeout), (data.showTimeout = null)),
        data.hideTimeout && (clearTimeout(data.hideTimeout), (data.hideTimeout = null)),
        data.cleanupTimeout && (clearTimeout(data.cleanupTimeout), (data.cleanupTimeout = null)));
  }
  createTooltip(element, options) {
    if (!this.#isElementValid(element) || !this.portal) return;
    const data = this.activeTooltips.get(element);
    if (!data || data.tooltip || !this.#isElementInViewport(element)) return;
    let content = options.content;
    if (options.isHtml) {
      const template = document.querySelector(content);
      content = template ? template.innerHTML : content;
    }
    if (!content) return;
    const tooltip = document.createElement("div"),
      tooltipId = `tooltip-${++this.tooltipIdCounter}`;
    if (
      ((tooltip.id = tooltipId),
        (tooltip.className = this.#buildTooltipClasses(options)),
        tooltip.setAttribute("role", "tooltip"),
        element.id)
    )
      element.setAttribute("aria-describedby", tooltipId);
    else {
      const triggerId = `tooltip-trigger-${this.tooltipIdCounter}`;
      (element.id = triggerId), element.setAttribute("aria-describedby", tooltipId);
    }
    if (
      (options.maxWidth !== this.defaults.maxWidth && (tooltip.style.maxWidth = `${options.maxWidth}px`),
        options.isHtml ? (tooltip.innerHTML = content) : (tooltip.textContent = content),
        options.arrow)
    ) {
      const arrow = document.createElement("div");
      (arrow.className = "tooltip__arrow"),
        (arrow.style.cssText = `
        position: absolute;
        width: 0;
        height: 0;
        border-style: solid;
      `),
        tooltip.appendChild(arrow);
    }
    const dialog = element.closest("dialog");
    dialog && dialog.open
      ? ((tooltip.style.position = "fixed"), (tooltip.style.zIndex = "2147483647"), dialog.appendChild(tooltip))
      : this.portal.appendChild(tooltip),
      (data.tooltip = tooltip),
      requestAnimationFrame(() => {
        const position = this.positionTooltip(element, tooltip, options);
        tooltip.classList.add(`tooltip--${position}`),
          requestAnimationFrame(() => {
            tooltip.classList.add("tooltip--visible");
          });
      }),
      options.interactive &&
      (tooltip.addEventListener("mouseenter", () => {
        this.clearTimeouts(element);
      }),
        tooltip.addEventListener("mouseleave", () => {
          this.hide(element);
        }));
  }
  positionTooltip(element, tooltip, options) {
    if (!this.#isElementValid(element) || !tooltip) return "bottom";
    let triggerRect, tooltipRect;
    try {
      (triggerRect = element.getBoundingClientRect()), (tooltipRect = tooltip.getBoundingClientRect());
    } catch {
      return "bottom";
    }
    const viewportWidth = window.innerWidth,
      viewportHeight = window.innerHeight;
    let position = options.position,
      x,
      y;
    if (position === "auto") {
      const spaceTop = triggerRect.top,
        spaceBottom = viewportHeight - triggerRect.bottom,
        spaceLeft = triggerRect.left,
        spaceRight = viewportWidth - triggerRect.right;
      spaceBottom >= tooltipRect.height + options.offset
        ? (position = "bottom")
        : spaceTop >= tooltipRect.height + options.offset
          ? (position = "top")
          : spaceRight >= tooltipRect.width + options.offset
            ? (position = "right")
            : spaceLeft >= tooltipRect.width + options.offset
              ? (position = "left")
              : (position = "bottom");
    }
    switch (position) {
      case "top":
        (x = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2),
          (y = triggerRect.top - tooltipRect.height - options.offset);
        break;
      case "bottom":
        (x = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2),
          (y = triggerRect.bottom + options.offset);
        break;
      case "left":
        (x = triggerRect.left - tooltipRect.width - options.offset),
          (y = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2);
        break;
      case "right":
        (x = triggerRect.right + options.offset),
          (y = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2);
        break;
      default:
        (x = triggerRect.left), (y = triggerRect.bottom + options.offset);
    }
    const originalX = x,
      originalY = y;
    if (
      ((x = Math.max(8, Math.min(x, viewportWidth - tooltipRect.width - 8))),
        (y = Math.max(8, Math.min(y, viewportHeight - tooltipRect.height - 8))),
        (tooltip.style.left = `${x}px`),
        (tooltip.style.top = `${y}px`),
        options.arrow)
    ) {
      const arrow = tooltip.querySelector(".tooltip__arrow") || this.#createArrow();
      tooltip.contains(arrow) || tooltip.appendChild(arrow),
        this.#positionArrow(arrow, position, triggerRect, { x, y, originalX, originalY }, tooltipRect);
    }
    return position;
  }
  #createArrow() {
    const arrow = document.createElement("div");
    return (arrow.className = "tooltip__arrow"), arrow;
  }
  #positionArrow(arrow, position, triggerRect, coords, tooltipRect) {
    const { x, y, originalX, originalY } = coords,
      offsetX = x - originalX,
      offsetY = y - originalY;
    let arrowOffset = 0;
    switch (position) {
      case "top":
      case "bottom":
        const triggerCenterX = triggerRect.left + triggerRect.width / 2,
          tooltipLeft = coords.x;
        arrowOffset = triggerCenterX - tooltipLeft;
        const minOffset = 12,
          maxOffset = tooltipRect.width - 12;
        (arrowOffset = Math.max(minOffset, Math.min(arrowOffset, maxOffset))),
          (arrow.style.left = `${arrowOffset}px`),
          (arrow.style.right = ""),
          (arrow.style.top = ""),
          (arrow.style.bottom = ""),
          (arrow.style.transform = "translateX(-50%)");
        break;
      case "left":
      case "right":
        const triggerCenterY = triggerRect.top + triggerRect.height / 2,
          tooltipTop = coords.y;
        arrowOffset = triggerCenterY - tooltipTop;
        const minOffsetY = 12,
          maxOffsetY = tooltipRect.height - 12;
        (arrowOffset = Math.max(minOffsetY, Math.min(arrowOffset, maxOffsetY))),
          (arrow.style.top = `${arrowOffset}px`),
          (arrow.style.bottom = ""),
          (arrow.style.left = ""),
          (arrow.style.right = ""),
          (arrow.style.transform = "translateY(-50%)");
        break;
    }
  }
  destroyTooltip(element) {
    const data = this.activeTooltips.get(element);
    if (!data || !data.tooltip) return;
    const tooltip = data.tooltip;
    if (this.#isElementValid(element)) {
      const tooltipId = tooltip.id;
      element.getAttribute("aria-describedby") === tooltipId &&
        (element.removeAttribute("aria-describedby"),
          element.id && element.id.startsWith("tooltip-trigger-") && element.removeAttribute("id"));
    }
    tooltip.classList.remove("tooltip--visible");
    const cleanupTimeout = setTimeout(() => {
      try {
        tooltip.parentNode && tooltip.parentNode.removeChild(tooltip);
      } catch { }
    }, 200);
    (data.cleanupTimeout = cleanupTimeout), (data.tooltip = null);
  }
  #isElementValid(element) {
    return element && document.contains(element);
  }
  #isElementInViewport(element) {
    if (!this.#isElementValid(element)) return !1;
    try {
      const rect = element.getBoundingClientRect(),
        viewportHeight = window.innerHeight || document.documentElement.clientHeight,
        viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      return rect.bottom >= 0 && rect.right >= 0 && rect.top <= viewportHeight && rect.left <= viewportWidth;
    } catch {
      return !1;
    }
  }
  updatePositions() {
    const invalidElements = [];
    this.activeTooltips.forEach((data, element) => {
      if (!this.#isElementValid(element)) {
        invalidElements.push(element);
        return;
      }
      if (data.tooltip)
        if (this.#isElementInViewport(element))
          try {
            this.positionTooltip(element, data.tooltip, data.options);
          } catch {
            invalidElements.push(element);
          }
        else this.destroyTooltip(element);
    }),
      invalidElements.forEach((element) => {
        this.unbindElement(element);
      });
  }
  bindGlobalEvents() {
    window.addEventListener("resize", this.handleResize),
      window.addEventListener("scroll", this.handleScroll, { passive: !0 }),
      document.addEventListener("keydown", this.handleKeydown),
      document.addEventListener("click", this.handleDocumentClick);
  }
  observeDOM() {
    window.MutationObserver &&
      ((this.observer = new MutationObserver((mutations) => {
        let shouldScan = !1;
        const removedElements = new Set();
        mutations.forEach((mutation) => {
          mutation.type === "childList" &&
            (mutation.addedNodes.forEach((node) => {
              node.nodeType === 1 &&
                (node.hasAttribute?.("data-tooltip") ||
                  node.hasAttribute?.("data-tooltip-html") ||
                  node.querySelector?.("[data-tooltip], [data-tooltip-html]")) &&
                (shouldScan = !0);
            }),
              mutation.removedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                  this.activeTooltips.has(node) && removedElements.add(node);
                  const boundElements = node.querySelectorAll?.("[data-tooltip], [data-tooltip-html]");
                  boundElements &&
                    boundElements.forEach((el) => {
                      this.activeTooltips.has(el) && removedElements.add(el);
                    });
                }
              }));
        }),
          removedElements.forEach((element) => {
            this.unbindElement(element);
          }),
          shouldScan && !isTouch() && requestIdleCallback(() => this.scanAndBind());
      })),
        this.observer.observe(document.body, { childList: !0, subtree: !0 }));
  }
  showTooltip(element, content, options = {}) {
    this.activeTooltips.has(element) ||
      this.activeTooltips.set(element, {
        options: { ...this.defaults, ...options, content },
        tooltip: null,
        showTimeout: null,
        hideTimeout: null,
      }),
      this.show(element, { content, ...options });
  }
  hideTooltip(element) {
    this.hide(element);
  }
  destroy() {
    this.hideAll(),
      this.observer && (this.observer.disconnect(), (this.observer = null)),
      this.activeTooltips.forEach((data, element) => {
        this.unbindElement(element);
      }),
      this.portal && (this.portal.remove(), (this.portal = null)),
      window.removeEventListener("resize", this.handleResize),
      window.removeEventListener("scroll", this.handleScroll),
      document.removeEventListener("keydown", this.handleKeydown),
      document.removeEventListener("click", this.handleDocumentClick),
      this.activeTooltips.clear(),
      (this.initialized = !1);
  }
}
export const Tooltip = new TooltipManager();
isTouch() ||
  (document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", () => Tooltip.init())
    : requestIdleCallback(() => Tooltip.init())),
  document.addEventListener("dialog:open", (event) => {
    Tooltip.initialized &&
      setTimeout(() => {
        const dialogComponent = event.target,
          dialog =
            dialogComponent?.querySelector?.("dialog[ref='dialog']") ||
            dialogComponent?.querySelector?.("dialog");
        dialog ? Tooltip.scanAndBind(dialog) : Tooltip.scanAndBind();
      }, 0);
  });



// import { motionCoordinator } from "./motion-coordinator.js";
// export function coordinatedInView(element, callback) {
//   return motionCoordinator.registerElement(element, { onActivate: callback, type: element.dataset?.motion });
// }
// export function resetLoading(container = document.body) {
//   container.querySelectorAll(".btn--loading").forEach((item) => item.classList.remove("btn--loading"));
// }
