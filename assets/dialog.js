import { Component } from "@theme/component";
import { isClickedOutside, onAnimationEnd, removeScrollLockClass } from "@theme/utilities";

let scrollLockCount = 0;

const FOCUSABLE_SELECTORS = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "a[href]",
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(", ");

export class DialogComponent extends Component {
  requiredRefs = ["dialog"];

  #shopifyAbortController;
  #previousActiveElement = null;
  #focusableElements = [];
  #focusTrapHandler = null;
  #keyboardNavigationHandlers = null;
  #isKeyboardNavigation = false;
  #isClosing = false;

  connectedCallback() {
    super.connectedCallback();
    this.#registerDesignModeEvents();
  }

  disconnectedCallback() {
    this.#shopifyAbortController?.abort();
    this.#shopifyAbortController = undefined;
    this.#restoreFocus();
    super.disconnectedCallback();
  }

  showDialog() {
    const { dialog } = this.refs;

    if (dialog.open || this.#isClosing) return;
    this.#previousActiveElement = document.activeElement;

    dialog.showModal();
    dialog.setAttribute("aria-modal", "true");

    this.dispatchEvent(new DialogOpenEvent());

    requestAnimationFrame(() => {
      this.#initializeFocusManagement();
      this.addEventListener("click", this.#handleClick);
      this.addEventListener("keydown", this.#handleKeyDown);
    });
  }

  closeDialog = async () => {
    const { dialog } = this.refs;

    if (!dialog.open || this.#isClosing) return;

    this.#isClosing = true;

    this.removeEventListener("click", this.#handleClick);
    this.removeEventListener("keydown", this.#handleKeyDown);
    dialog.classList.add("dialog-closing");

    await onAnimationEnd(dialog, undefined, { subtree: false });

    if (!dialog.open) {
      this.#isClosing = false;
      return;
    }

    dialog.close();
    dialog.classList.remove("dialog-closing");

    this.#restoreFocus();
    this.dispatchEvent(new DialogCloseEvent());
    this.#isClosing = false;
  };

  toggleDialog = () => {
    this.refs.dialog.open ? this.closeDialog() : this.showDialog();
  };

  #registerDesignModeEvents() {
    if (!this.hasAttribute("shopify-design-mode") || !(window.Shopify && Shopify.designMode)) {
      return;
    }

    const section = this.closest(".shopify-section");
    if (!section) return;

    this.#shopifyAbortController?.abort();
    this.#shopifyAbortController = new AbortController();

    const { signal } = this.#shopifyAbortController;
    section.addEventListener("shopify:section:select", () => { this.showDialog(); }, { signal } );
    section.addEventListener( "shopify:section:deselect", () => { this.closeDialog(); }, { signal });
  }

  #handleClick = (event) => {
    const { dialog } = this.refs;
    if (!isClickedOutside(event, dialog)) return;
    this.closeDialog();
    event.stopPropagation();
  };

  #handleKeyDown = (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    this.closeDialog();
  };

  #initializeFocusManagement() {
    const { dialog } = this.refs;

    this.#focusableElements = this.#getFocusableElements(dialog);
    this.#setupKeyboardNavigationDetection();
    this.#focusInitialElement();
    if (this.#isFocusTrapEnabled()) {
      this.#setupFocusTrap();
    }
  }

  #isFocusTrapEnabled() {
    return this.getAttribute("focus-trap") !== "false";
  }

  #focusInitialElement() {
    const { dialog } = this.refs;
    const focusTarget = this.getAttribute("focus-target");

    let targetElement = null;

    if (focusTarget) {
      const foundElement = dialog.querySelector(focusTarget);

      if (foundElement) {
        if (this.#isElementFocusable(foundElement)) {
          targetElement = foundElement;
        } else {
          targetElement = this.#getFocusableElements(foundElement)[0] ?? null;
        }
      }
    }

    if (!targetElement) {
      targetElement = this.#focusableElements[0] ?? null;
    }

    if (targetElement) {
      this.#focusWithoutOutline(targetElement);
    }
  }

  #setupFocusTrap() {
    const { dialog } = this.refs;

    const handleTabKey = (event) => {
      if (event.key !== "Tab") return;

      this.#focusableElements = this.#getFocusableElements(dialog);
      if (this.#focusableElements.length === 0) return;
      const firstElement = this.#focusableElements[0];
      const lastElement = this.#focusableElements[this.#focusableElements.length - 1];
      const activeElement = document.activeElement;

      const isFocusInsideDialog = dialog.contains(activeElement);
      const activeIndex = this.#focusableElements.indexOf(activeElement);
      const shouldWrap = !isFocusInsideDialog || activeIndex === -1;

      if (event.shiftKey) {
        if (activeElement === firstElement || shouldWrap) {
          event.preventDefault();
          event.stopPropagation();
          lastElement.focus();
        }

        return;
      }

      if (activeElement === lastElement || shouldWrap) {
        event.preventDefault();
        event.stopPropagation();
        firstElement.focus();
      }
    };

    this.addEventListener("keydown", handleTabKey, true);

    this.#focusTrapHandler = handleTabKey;
  }

  #setupKeyboardNavigationDetection() {
    const { dialog } = this.refs;

    const handleKeyDown = (event) => {
      if (event.key !== "Tab") return;
      this.#isKeyboardNavigation = true;
      dialog.classList.add("keyboard-navigation");
    };

    const handleMouseDown = () => {
      this.#isKeyboardNavigation = false;
      dialog.classList.remove("keyboard-navigation");
    };

    dialog.addEventListener("keydown", handleKeyDown);
    dialog.addEventListener("mousedown", handleMouseDown);

    this.#keyboardNavigationHandlers = {
      keydown: handleKeyDown,
      mousedown: handleMouseDown,
    };
  }

  #isElementFocusable(element) {
    let isFocusable = false;

    try {
      isFocusable = element.matches(FOCUSABLE_SELECTORS);
    } catch {
      return false;
    }

    if (!isFocusable) return false;
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && !element.hasAttribute("disabled");
  }

  #getFocusableElements(container) {
    return Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS)).filter((element) =>
      this.#isElementFocusable(element)
    );
  }

  #focusWithoutOutline(element) {
    element.classList.add("focus-no-outline");
    element.focus();
    setTimeout(() => {
      element.classList.remove("focus-no-outline");
    }, 100);

    if (this.#isInputOrTextarea(element)) {
      this.#scrollInputIntoView(element);
    }
  }

  #isInputOrTextarea(element) {
    return element.matches("input, textarea");
  }

  #scrollInputIntoView(element) {
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (!document.contains(element) || document.activeElement !== element) {
          return;
        }

        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });

        const { dialog } = this.refs;

        if (!dialog?.contains(element)) return;
        const scrollableParent = this.#findScrollableParent(element, dialog);

        if (!scrollableParent || scrollableParent === dialog) return;

        const elementRect = element.getBoundingClientRect();
        const parentRect = scrollableParent.getBoundingClientRect();
        const elementTop = elementRect.top - parentRect.top + scrollableParent.scrollTop;

        scrollableParent.scrollTo({
          top:
            elementTop -
            scrollableParent.clientHeight / 2 +
            elementRect.height / 2,
            behavior: "smooth",
        });
      }, 350);
    });
  }

  #findScrollableParent(element, container) {
    let parent = element.parentElement;

    while (parent && parent !== container) {
      const style = window.getComputedStyle(parent);

      const hasOverflow =
        style.overflow === "auto" ||
        style.overflow === "scroll" ||
        style.overflowY === "auto" ||
        style.overflowY === "scroll";

      const hasScrollableContent =
        parent.scrollHeight > parent.clientHeight;

      if (hasOverflow && hasScrollableContent) {
        return parent;
      }
      parent = parent.parentElement;
    }

    return null;
  }

  #restoreFocus() {
    if (
      this.#previousActiveElement &&
      this.#previousActiveElement !== document.body &&
      document.contains(this.#previousActiveElement)
    ) {
      this.#previousActiveElement.focus();
    }

    this.#previousActiveElement = null;

    if (this.#focusTrapHandler) {
      this.removeEventListener("keydown", this.#focusTrapHandler, true);
      this.#focusTrapHandler = null;
    }

    if (this.#keyboardNavigationHandlers) {
      const { dialog } = this.refs;

      dialog.removeEventListener("keydown", this.#keyboardNavigationHandlers.keydown);
      dialog.removeEventListener("mousedown", this.#keyboardNavigationHandlers.mousedown);

      this.#keyboardNavigationHandlers = null;
    }

    this.#focusableElements = [];
    this.#isKeyboardNavigation = false;
  }
}

if (!customElements.get("dialog-component")) {
  customElements.define("dialog-component", DialogComponent);
}

export class DialogOpenEvent extends CustomEvent {
  static eventName = "dialog:open";

  constructor() {
    super(DialogOpenEvent.eventName);
  }
}

export class DialogCloseEvent extends CustomEvent {
  static eventName = "dialog:close";

  constructor() {
    super(DialogCloseEvent.eventName);
  }
}

document.addEventListener(
  "toggle",
  (event) => {
    const target = event.target;

    if (!( target instanceof HTMLDialogElement || target instanceof HTMLDetailsElement ) || !target.hasAttribute("scroll-lock")) {
      return;
    }

    if (target.open) {
      scrollLockCount++;
      document.documentElement.setAttribute("scroll-lock", "");
      document.documentElement.classList.add("scroll-locked");
      return;
    }

    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount > 0) return;
    document.documentElement.removeAttribute("scroll-lock");
    removeScrollLockClass( document.documentElement, "scroll-locked");
  },
  { capture: true }
);