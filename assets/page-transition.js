import gsap from "@theme/gsap";
import { ThemeEvents } from "@theme/events";
import { prefersReducedMotion } from "@theme/utilities";

class PageTransition extends HTMLElement {
  constructor() {
    super();

    this.content = document.querySelector(".page-content");

    // =========================
    // INITIAL STATE
    // =========================
    gsap.set(this, {
      opacity: 1,
      scale: 1,
      visibility: "visible",
      transformOrigin: "center center",
      force3D: true,
    });

    if (this.content) {
      gsap.set(this.content, {
        scale: 0.965,
        opacity: 0,
        force3D: true,
      });
    }

    // =========================
    // OUT TRANSITION
    // =========================
    window.addEventListener("beforeunload", () => {
      document.body.classList.add("page-loading");

      document.dispatchEvent(
        new CustomEvent(ThemeEvents.pageTransitionStart, {
          bubbles: true,
          detail: {
            direction: "out",
            timestamp: Date.now(),
          },
        })
      );

      gsap.set(this, {
        opacity: 1,
        scale: 1,
        visibility: "visible",
      });
    });

    // =========================
    // IN TRANSITION
    // =========================
    const initOnLoad = () => {
      document.dispatchEvent(
        new CustomEvent(ThemeEvents.pageLoaded, {
          bubbles: true,
          detail: {
            timestamp: Date.now(),
          },
        })
      );

      this.hide();
    };

    if (document.readyState === "loading") {
      window.addEventListener("DOMContentLoaded", initOnLoad, {
        once: true,
      });
    } else {
      initOnLoad();
    }

    // =========================
    // BFCACHE FIX
    // =========================
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) {
        document.body.classList.remove("page-loading");

        gsap.set(this, {
          opacity: 0,
          scale: 1.2,
          visibility: "hidden",
        });
      }
    });
  }

  // =========================
  // HIDE TRANSITION
  // =========================
  hide() {
    const duration = prefersReducedMotion() ? 0 : 0.65;

    const tl = gsap.timeline({
      defaults: {
        ease: "expo.out",
      },
    });

    // Overlay cinematic dissolve
    tl.to(
      this,
      {
        opacity: 0,
        scale: 1.18,
        duration,
      },
      0
    );

    // Content smooth reveal
    if (this.content) {
      tl.to(
        this.content,
        {
          opacity: 1,
          scale: 1,
          duration: 0.9,
        },
        0.02
      );
    }

    tl.eventCallback("onComplete", () => {
      this.hidden = true;

      gsap.set(this, {
        visibility: "hidden",
        scale: 1,
      });

      document.dispatchEvent(
        new CustomEvent(ThemeEvents.pageTransitionEnd, {
          bubbles: true,
          detail: {
            timestamp: Date.now(),
          },
        })
      );
    });
  }
}

if (!customElements.get("page-transition")) {
  customElements.define("page-transition", PageTransition);
}

export default PageTransition;