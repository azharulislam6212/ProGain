// assets/animations.js

let initialized = false;
let gsapInstance = null;
let ScrollTrigger = null;
let SplitText = null;
let TextPlugin = null;

export async function initAnimations(scope = document) {

  // Prevent duplicate init (full page only)
  if (initialized && scope === document) return;

  // ------------------------
  // Load GSAP stack only once
  // ------------------------

  if (!gsapInstance) {

    const [
      gsapModule,
      scrollModule,
      splitModule,
      textModule
    ] = await Promise.all([
      import("@theme/gsap"),
      import("@theme/ScrollTrigger"),
      import("@theme/SplitText"),
      import("@theme/TextPlugin")
    ]);

    const gsap = gsapModule.default || gsapModule;
    ScrollTrigger = scrollModule.default || scrollModule;

    // ------------------------
    // SAFE SplitText FIX
    // ------------------------
    const SplitRaw =
      splitModule.default?.SplitText ||
      splitModule.default ||
      splitModule.SplitText ||
      splitModule;

    SplitText =
      typeof SplitRaw === "function"
        ? SplitRaw
        : SplitRaw?.SplitText;

    // ------------------------
    // SAFE TextPlugin
    // ------------------------
    TextPlugin =
      textModule.default || textModule;

    gsap.registerPlugin(
      ScrollTrigger,
      SplitText,
      TextPlugin
    );

    gsapInstance = gsap;
  }

  const gsap = gsapInstance;

  // ------------------------
  // FADE UP
  // ------------------------

  scope.querySelectorAll(".animate-fade-up").forEach((el) => {

    gsap.from(el, {
      y: 60,
      opacity: 0,
      duration: 1,
      ease: "power3.out",

      scrollTrigger: {
        trigger: el,
        start: "top 85%",
        once: true
      }
    });

  });

  // ------------------------
  // SCALE
  // ------------------------

  scope.querySelectorAll(".animate-scale").forEach((el) => {

    gsap.from(el, {
      scale: 0.8,
      opacity: 0,
      duration: 1,
      ease: "power2.out",

      scrollTrigger: {
        trigger: el,
        start: "top 85%",
        once: true
      }
    });

  });

  // ------------------------
  // SPLIT TEXT (FIXED)
  // ------------------------

  if (SplitText) {

    scope.querySelectorAll(".animate-split").forEach((el) => {

      const split = new SplitText(el, {
        type: "chars, words"
      });

      gsap.from(split.chars, {
        opacity: 0,
        y: 20,
        duration: 1,
        stagger: 0.04,
        ease: "power2.out",

        scrollTrigger: {
          trigger: el,
          start: "top 90%",
          once: true
        }
      });

    });

  }

  // ------------------------
  // TEXT PLUGIN
  // ------------------------

  if (TextPlugin) {

    scope.querySelectorAll(".animate-text").forEach((el) => {

      const text = el.dataset.text || el.textContent;

      gsap.to(el, {
        duration: 2,
        text: text,
        ease: "none",

        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          once: true
        }
      });

    });

  }

  initialized = true;
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  initAnimations();
});