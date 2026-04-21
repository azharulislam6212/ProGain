import { requestIdleCallback } from "@theme/utilities";

/**
 * --------------------------------------------------------
 * Scrollbar Width Initializer
 * --------------------------------------------------------
 * Calculates the browser's scrollbar width and exposes it
 * as a CSS variable: --scrollbar-width
 *
 * Useful for:
 * - Preventing layout shift when scrollbars appear/disappear
 * - Precise UI alignment (modals, drawers, fixed elements)
 * - Cross-browser consistency (especially Windows vs macOS)
 */


/**
 * Initializes scrollbar width detection.
 *
 * - Runs after full page load (ensures accurate measurements)
 * - Uses requestIdleCallback for performance optimization
 * - Updates on resize and orientation change (debounced)
 *
 * Sets:
 *   --scrollbar-width (on <html>)
 */
export function initScrollbarWidth() {

  /**
   * Measures and sets scrollbar width.
   */
  function setScrollbarWidth() {
    requestIdleCallback(() => {

      // Create a temporary scrollable container
      const outer = document.createElement("div");
      outer.style.cssText =
        "visibility:hidden;overflow:scroll;position:absolute;width:100px;height:100px;";
      document.body.appendChild(outer);

      // Inner element to calculate difference
      const inner = document.createElement("div");
      inner.style.width = "100%";
      outer.appendChild(inner);

      /**
       * Scrollbar width calculation:
       * offsetWidth includes scrollbar,
       * inner offset excludes it
       */
      const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;

      /**
       * Fallback for browsers where scrollbar width = 0
       * (e.g. overlay scrollbars like macOS)
       */
      const finalWidth =
        scrollbarWidth > 0
          ? scrollbarWidth
          : Math.max(
              0,
              window.innerWidth -
                document.documentElement.clientWidth
            );

      // Cleanup temporary elements
      document.body.removeChild(outer);

      // Set CSS variable on root
      document.documentElement.style.setProperty(
        "--scrollbar-width",
        `${finalWidth}px`
      );
    });
  }


  /**
   * Run after full page load to ensure layout is stable.
   */
  if (document.readyState === "complete") {
    setScrollbarWidth();
  } else {
    window.addEventListener("load", setScrollbarWidth, {
      once: true,
    });
  }


  /**
   * Debounced resize handler to avoid excessive recalculations.
   */
  let resizeTimeout;

  const debounce = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(setScrollbarWidth, 100);
  };


  /**
   * Recalculate on viewport changes.
   */
  window.addEventListener("resize", debounce);
  window.addEventListener("orientationchange", debounce);
}
