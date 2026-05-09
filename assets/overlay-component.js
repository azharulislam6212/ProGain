import { Component } from "@theme/component";
import {
  isClickedOutside,
  onAnimationEnd,
  removeScrollLockClass
} from "@theme/utilities";

let scrollLockCount = 0;

export class OverlayComponent extends Component {
  requiredRefs = ["root"];

  #previousActiveElement = null;
  #focusable = [];
  #shopifyAbortController = null;

  connectedCallback() {
    super.connectedCallback();

    this.#bindEvents();
    this.#registerShopifyDesignMode();

  }

  disconnectedCallback() {
    this.#shopifyAbortController?.abort();
    this.#shopifyAbortController = null;

    this.#unbindEvents();
    super.disconnectedCallback();
  }

  /* =========================
   * OPEN / CLOSE
   * ========================= */

  open() {
    const { root } = this.refs;
    if (root.open) return;

    this.#previousActiveElement = document.activeElement;

    root.setAttribute("open", "");
    this.#applyScrollLock(true);

    requestAnimationFrame(() => {
      this.#setupFocus();
    });
  }

  close = async () => {
    const { root } = this.refs;
    if (!root.open) return;

    root.classList.add("overlay-closing");

    await onAnimationEnd(root);

    root.removeAttribute("open");
    root.classList.remove("overlay-closing");

    this.#applyScrollLock(false);
    this.#restoreFocus();
  };

  toggle = () => {
    const { root } = this.refs;
    root.open ? this.close() : this.open();
  };

  /* =========================
   * EVENTS
   * ========================= */

  #bindEvents() {
    this.addEventListener("click", this.#onClick);
    this.addEventListener("keydown", this.#onKeydown);
  }

  #unbindEvents() {
    this.removeEventListener("click", this.#onClick);
    this.removeEventListener("keydown", this.#onKeydown);
  }

  #onClick = (e) => {
    const allowBackdrop = this.dataset.backdrop !== "false";

    const backdrop = this.querySelector("[data-backdrop-layer]");

    // 🌑 BACKDROP CLICK CLOSE (OPTIONAL)
    if (
      allowBackdrop &&
      backdrop &&
      backdrop.contains(e.target)
    ) {
      this.close();
      return;
    }

    // fallback outside click safety
    const { root } = this.refs;
    if (allowBackdrop && isClickedOutside(e, root)) {
      this.close();
    }
  };

  #onKeydown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      this.close();
    }

    if (e.key === "Tab") {
      this.#trapFocus(e);
    }
  };

  /* =========================
   * FOCUS SYSTEM
   * ========================= */

  #setupFocus() {
    const { root } = this.refs;

    this.#focusable = this.#getFocusable(root);
    this.#focusable[0]?.focus?.();
  }

  #trapFocus(e) {
    const { root } = this.refs;

    this.#focusable = this.#getFocusable(root);

    if (!this.#focusable.length) return;

    const first = this.#focusable[0];
    const last = this.#focusable.at(-1);

    const active = document.activeElement;

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    }

    if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  #getFocusable(container) {
    return Array.from(
      container.querySelectorAll(
        "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])"
      )
    );
  }

  #restoreFocus() {
    this.#previousActiveElement?.focus?.();
    this.#previousActiveElement = null;
  }

  /* =========================
   * SCROLL LOCK SAFE STACK
   * ========================= */

  #applyScrollLock(lock) {
    const doc = document.documentElement;

    if (lock) {
      scrollLockCount++;
      doc.classList.add("scroll-locked");
    } else {
      scrollLockCount = Math.max(0, scrollLockCount - 1);

      if (scrollLockCount === 0) {
        doc.classList.remove("scroll-locked");
        removeScrollLockClass(doc, "scroll-locked");
      }
    }
  }

  /* =========================
   * SHOPIFY DESIGN MODE
   * ========================= */

  #isDesignMode() {
    return window.__DESIGN_MODE__ === true;
  }

  #registerShopifyDesignMode() {
    if (!this.#isDesignMode()) return;

    const section = this.closest(".shopify-section");
    if (!section) return;

    this.#shopifyAbortController?.abort();
    this.#shopifyAbortController = new AbortController();

    const { signal } = this.#shopifyAbortController;

    section.addEventListener(
      "shopify:section:select",
      () => this.open(),
      { signal }
    );

    section.addEventListener(
      "shopify:section:deselect",
      () => this.close(),
      { signal }
    );

    section.addEventListener(
      "shopify:section:unload",
      () => this.close(),
      { signal }
    );
  }
}

customElements.get("overlay-component") ||
customElements.define("overlay-component", OverlayComponent);


import { Component } from "@theme/component";

export class OverlayOpener extends Component {
  connectedCallback() {
    this.addEventListener("click", this.#onClick);
  }

  disconnectedCallback() {
    this.removeEventListener("click", this.#onClick);
  }

  #onClick = (e) => {
    e.preventDefault();

    const id = this.dataset.target;
    const action = this.dataset.action || "toggle";

    if (!id) return;

    const overlay = document.querySelector(
      `overlay-component[data-overlay-id="${id}"]`
    );

    if (!overlay) return;

    if (action === "open") overlay.open();
    else if (action === "close") overlay.close();
    else overlay.toggle();
  };
}

customElements.get("overlay-opener") ||
customElements.define("overlay-opener", OverlayOpener);