import { Component } from "@theme/component";
import {
    isMobileBreakpoint,
    mediaBreakpointMobile,
    mediaBreakpointTablet,
    getLenis,
    fetchConfig,
    mediaQueryMobile,
    debounce,
    throttle,
    prefersReducedMotion,
    isTouch,
    mediaHoverFine,
    waitForEvent,
    removeScrollLockClass,
    onDocumentReady,
    getFocusableElements,
} from "@theme/utilities";
import { inView, animate, scroll } from "@theme/animation";
import { ResizeNotifier } from "@theme/critical";
import { CarouselComponent } from "@theme/carousel";
import { AccordionComponent } from "@theme/modules";
import { morph } from "@theme/morph";
import { ThemeEvents, CartGroupedSections, CartUpdateEvent } from "@theme/events";
class BasicHeader extends HTMLElement {
    constructor() {
        super();
    }
    get headerSection() {
        return document.querySelector(".header-section");
    }
    get enableTransparent() {
        return this.dataset.enableTransparent === "true";
    }
    connectedCallback() {
        if ((this.#init(), new ResizeNotifier(this.#setHeight.bind(this)).observe(this), Shopify.designMode)) {
            const section = this.closest(".shopify-section");
            section.addEventListener("shopify:section:load", this.#init.bind(this)),
                section.addEventListener("shopify:section:unload", this.#init.bind(this)),
                section.addEventListener("shopify:section:reorder", this.#init.bind(this));
        }
    }
    #init() {
        this.#setHeight(), this.enableTransparent && this.headerSection.classList.add("header-transparent");
    }
    #setHeight() {
        requestAnimationFrame(() => {
            const offsetHeight = Math.round(this.offsetHeight);
            document.documentElement.style.setProperty("--header-height", `${offsetHeight}px`);
        });
    }
}
customElements.define("basic-header", BasicHeader, { extends: "header" });
class StickyHeader extends BasicHeader {
    #boundHandleScroll = null;
    #resizeObserver = null;
    constructor() {
        super(),
            (this.classes = {
                pinned: "header-pinned",
                headerScrolled: "header-scrolled",
                headerSticky: "header-sticky",
            }),
            (this.currentScrollTop = 0),
            (this.scrollThreshold = 200),
            (this.scrollDirection = "none"),
            (this.scrollDistance = 0),
            (this.lenis = null),
            (this.hasScrolledPastThreshold = !1);
    }
    get isAlwaysSticky() {
        return this.dataset.stickyType === "always";
    }
    connectedCallback() {
        super.connectedCallback(),
            this.#cacheInitialHeaderPosition(),
            this.#initStickyHeader(),
            this.#checkInitialScrollState(),
            this.#resizeObserver ||
                ((this.#resizeObserver = new ResizeObserver(() => {
                    this.#cacheInitialHeaderPosition();
                })),
                this.#resizeObserver.observe(this.headerSection));
    }
    disconnectedCallback() {
        super.disconnectedCallback?.(),
            this.#boundHandleScroll &&
                (this.lenis
                    ? this.lenis.off("scroll", this.#boundHandleScroll)
                    : window.removeEventListener("scroll", this.#boundHandleScroll),
                (this.#boundHandleScroll = null)),
            this.#resizeObserver && (this.#resizeObserver.disconnect(), (this.#resizeObserver = null));
    }
    #cacheInitialHeaderPosition() {
        requestAnimationFrame(() => {
            const headerBounds =
                    this.headerSection?.querySelector(".header")?.getBoundingClientRect() ||
                    this.headerSection.getBoundingClientRect(),
                scrollY = this.lenis ? this.lenis.scroll : window.scrollY;
            (this.initialHeaderTop = headerBounds.top + scrollY), (this.initialHeaderHeight = headerBounds.height);
            const headerOffsetFromTop = headerBounds.top;
            headerOffsetFromTop > 0
                ? (this.stickThreshold = headerOffsetFromTop)
                : (this.stickThreshold = this.initialHeaderTop + this.initialHeaderHeight),
                (this.stickThreshold <= 0 || !this.initialHeaderHeight) &&
                    (this.stickThreshold = Math.max(this.initialHeaderHeight || 0, 1));
        });
    }
    #initStickyHeader() {
        this.headerSection.classList.add(this.classes.headerSticky),
            (this.headerSection.dataset.stickyType = this.dataset.stickyType),
            (this.#boundHandleScroll = this.#handleScroll.bind(this)),
            (this.lenis = getLenis()),
            this.lenis
                ? this.lenis.on("scroll", this.#boundHandleScroll)
                : window.addEventListener("scroll", this.#boundHandleScroll, { passive: !0 });
    }
    #checkInitialScrollState() {
        requestAnimationFrame(() => {
            const scrollTop = this.lenis ? this.lenis.scroll : window.scrollY;
            (!this.stickThreshold || this.stickThreshold <= 0) && this.#cacheInitialHeaderPosition(),
                scrollTop >= this.stickThreshold
                    ? ((this.hasScrolledPastThreshold = !0),
                      this.headerSection.classList.add(this.classes.headerScrolled),
                      document.body.classList.add(this.classes.pinned))
                    : ((this.hasScrolledPastThreshold = !1),
                      this.headerSection.classList.remove(this.classes.headerScrolled),
                      document.body.classList.remove(this.classes.pinned)),
                (this.currentScrollTop = scrollTop);
        });
    }
    #handleScroll() {
        if (!this.lenis) {
            const retryLenis = getLenis();
            retryLenis &&
                ((this.lenis = retryLenis),
                window.removeEventListener("scroll", this.#boundHandleScroll),
                this.lenis.on("scroll", this.#boundHandleScroll));
        }
        const scrollTop = this.lenis ? this.lenis.scroll : window.scrollY;
        (!this.stickThreshold || this.stickThreshold <= 0) && this.#cacheInitialHeaderPosition();
        const shouldStick = scrollTop >= this.stickThreshold;
        requestAnimationFrame(() => {
            const currentBounds = this.headerSection.getBoundingClientRect(),
                headerBoundsBottom = this.initialHeaderTop + currentBounds.height;
            this.#updateScrollMetrics(scrollTop),
                shouldStick
                    ? this.#handleScrolledPastHeader(scrollTop, headerBoundsBottom)
                    : this.isAlwaysSticky && this.hasScrolledPastThreshold
                      ? scrollTop < 1 && this.#handleScrolledBeforeHeader()
                      : this.#handleScrolledBeforeHeader(),
                (this.currentScrollTop = scrollTop);
        });
    }
    #updateScrollMetrics(scrollTop) {
        const newDirection = scrollTop > this.currentScrollTop ? "down" : "up";
        newDirection !== this.scrollDirection
            ? ((this.scrollDistance = 0), (this.scrollDirection = newDirection))
            : (this.scrollDistance += Math.abs(scrollTop - this.currentScrollTop));
    }
    #handleScrolledPastHeader(scrollTop, headerBoundsBottom) {
        if (
            ((this.hasScrolledPastThreshold = !0),
            this.headerSection.classList.add(this.classes.headerScrolled),
            this.isAlwaysSticky)
        )
            document.body.classList.add(this.classes.pinned);
        else {
            const isScrollingUp = this.scrollDirection === "up",
                isNearHeader = scrollTop < headerBoundsBottom + 100,
                hasScrolledEnough = this.scrollDistance >= this.scrollThreshold;
            isScrollingUp || isNearHeader
                ? document.body.classList.add(this.classes.pinned)
                : hasScrolledEnough && document.body.classList.remove(this.classes.pinned);
        }
    }
    #handleScrolledBeforeHeader() {
        this.isAlwaysSticky && this.hasScrolledPastThreshold
            ? (this.lenis ? this.lenis.scroll : window.scrollY) < 1 &&
              ((this.hasScrolledPastThreshold = !1),
              this.headerSection.classList.remove(this.classes.headerScrolled),
              document.body.classList.remove(this.classes.pinned))
            : ((this.hasScrolledPastThreshold = !1),
              this.headerSection.classList.remove(this.classes.headerScrolled),
              document.body.classList.remove(this.classes.pinned));
    }
}
customElements.define("sticky-header", StickyHeader, { extends: "header" });
const lockDropdownCount = new WeakMap(),
    ANIMATION_TIMING = { hoverEnterDelay: 100, hoverLeaveDelay: 150, contentOpenDelay: 100 };
class DetailsDropdown extends HTMLDetailsElement {
    constructor() {
        super(),
            (this.classes = { bodyClass: "has-dropdown-menu" }),
            (this.events = { handleAfterHide: "menu:handleAfterHide", handleAfterShow: "menu:handleAfterShow" }),
            (this.summaryElement = this.firstElementChild),
            (this.contentElement = this.lastElementChild),
            (this._open = this.hasAttribute("open")),
            (this.hoverEnterTimer = null),
            (this.hoverLeaveTimer = null),
            (this.isHoveringItem = !1),
            (this.isHoveringContent = !1),
            (this._cachedTrigger = null),
            (this._cachedTranslateY = null),
            (this.handleSummaryClick = this.handleSummaryClick.bind(this)),
            (this.handleOutsideClick = this.handleOutsideClick.bind(this)),
            (this.handleEscKeyPress = this.handleEscKeyPress.bind(this)),
            (this.handleFocusOut = this.handleFocusOut.bind(this)),
            (this.handleMouseEnter = this.handleMouseEnter.bind(this)),
            (this.handleMouseLeave = this.handleMouseLeave.bind(this)),
            (this.handleContentMouseEnter = this.handleContentMouseEnter.bind(this)),
            (this.handleContentMouseLeave = this.handleContentMouseLeave.bind(this));
    }
    connectedCallback() {
        this.summaryElement.addEventListener("click", this.handleSummaryClick),
            this.trigger === "hover" &&
                (this.summaryElement.addEventListener("focusin", this.#handleFocusIn),
                this.summaryElement.addEventListener("focusout", this.#handleFocusOutInternal),
                this.contentElement.addEventListener("mouseenter", this.handleContentMouseEnter),
                this.contentElement.addEventListener("mouseleave", this.handleContentMouseLeave)),
            this.addEventListener("mouseenter", this.handleMouseEnter),
            this.addEventListener("mouseleave", this.handleMouseLeave);
    }
    disconnectedCallback() {
        this.#clearHoverTimers(),
            this.summaryElement.removeEventListener("click", this.handleSummaryClick),
            this.trigger === "hover" &&
                (this.summaryElement.removeEventListener("focusin", this.#handleFocusIn),
                this.summaryElement.removeEventListener("focusout", this.#handleFocusOutInternal),
                this.contentElement.removeEventListener("mouseenter", this.handleContentMouseEnter),
                this.contentElement.removeEventListener("mouseleave", this.handleContentMouseLeave)),
            this.removeEventListener("mouseenter", this.handleMouseEnter),
            this.removeEventListener("mouseleave", this.handleMouseLeave),
            document.removeEventListener("click", this.handleOutsideClick),
            document.removeEventListener("keydown", this.handleEscKeyPress),
            document.removeEventListener("focusout", this.handleFocusOut),
            (this._cachedTrigger = null),
            (this._cachedTranslateY = null),
            (this._cachedChildEl = null);
    }
    #handleFocusIn = (event) => {
        event.target === this.summaryElement && (this.open = !0);
    };
    #handleFocusOutInternal = (event) => {
        this.contentElement.contains(event.relatedTarget) || (this.open = !1);
    };
    handleMouseEnter() {
        (this.isHoveringItem = !0),
            this.#clearHoverTimer("leave"),
            (this.hoverEnterTimer = setTimeout(() => {
                this.detectHover({ type: "mouseenter" });
            }, ANIMATION_TIMING.hoverEnterDelay));
    }
    handleMouseLeave(event) {
        (this.isHoveringItem = !1),
            this.#clearHoverTimer("enter"),
            this.open &&
                !this.isHoveringContent &&
                (this.hoverLeaveTimer = setTimeout(() => {
                    this.open && this.detectHover({ type: "mouseleave" });
                }, ANIMATION_TIMING.hoverLeaveDelay));
    }
    handleContentMouseEnter() {
        (this.isHoveringContent = !0), this.#clearHoverTimer("leave");
    }
    handleContentMouseLeave() {
        (this.isHoveringContent = !1),
            this.open &&
                !this.isHoveringItem &&
                (this.hoverLeaveTimer = setTimeout(() => {
                    this.open && this.detectHover({ type: "mouseleave" });
                }, ANIMATION_TIMING.hoverLeaveDelay));
    }
    #clearHoverTimer(type) {
        const timer = type === "enter" ? this.hoverEnterTimer : this.hoverLeaveTimer;
        timer &&
            (clearTimeout(timer), type === "enter" ? (this.hoverEnterTimer = null) : (this.hoverLeaveTimer = null));
    }
    #clearHoverTimers() {
        this.hoverEnterTimer && (clearTimeout(this.hoverEnterTimer), (this.hoverEnterTimer = null)),
            this.hoverLeaveTimer && (clearTimeout(this.hoverLeaveTimer), (this.hoverLeaveTimer = null));
    }
    set open(value) {
        value !== this._open &&
            ((this._open = value),
            this.isConnected
                ? this.transition(value)
                : value
                  ? this.setAttribute("open", "")
                  : this.removeAttribute("open"));
    }
    get open() {
        return this._open;
    }
    get trigger() {
        return (
            this._cachedTrigger === null &&
                (mediaHoverFine()
                    ? (this._cachedTrigger = this.getAttribute("trigger") || "click")
                    : (this._cachedTrigger = "click")),
            this._cachedTrigger
        );
    }
    handleSummaryClick(event) {
        event.preventDefault(),
            mediaHoverFine() && this.trigger === "hover" && this.summaryElement.hasAttribute("data-link")
                ? (window.location.href = this.summaryElement.getAttribute("data-link"))
                : (this.open = !this.open);
    }
    beforeOpen() {}
    beforeClose() {}
    get level() {
        return this.hasAttribute("level") ? this.getAttribute("level") : "top";
    }
    async transition(value) {
        return value
            ? (this.beforeOpen(),
              this.#incrementDropdownCount(),
              this.#setupOpenState(),
              await this.showWithTransition(),
              this.needsReverse(),
              waitForEvent(this, this.events.handleAfterShow))
            : (this.beforeClose(),
              this.#decrementDropdownCount(),
              this.#cleanupOpenState(),
              await this.hideWithTransition(),
              this.open || this.removeAttribute("open"),
              waitForEvent(this, this.events.handleAfterHide));
    }
    #incrementDropdownCount() {
        lockDropdownCount.set(DetailsDropdown, (lockDropdownCount.get(DetailsDropdown) || 0) + 1);
    }
    #decrementDropdownCount() {
        const count = (lockDropdownCount.get(DetailsDropdown) || 0) - 1;
        lockDropdownCount.set(DetailsDropdown, count),
            count > 0
                ? document.body.classList.add(this.classes.bodyClass)
                : removeScrollLockClass(
                      document.body,
                      this.classes.bodyClass,
                      () => (lockDropdownCount.get(DetailsDropdown) || 0) === 0
                  );
    }
    #setupOpenState() {
        document.body.classList.add(this.classes.bodyClass),
            document.body.classList.contains("search-open") && document.body.classList.remove("search-open"),
            this.setAttribute("open", ""),
            this.summaryElement.setAttribute("open", ""),
            setTimeout(() => {
                this.contentElement.setAttribute("open", "");
            }, ANIMATION_TIMING.contentOpenDelay),
            document.addEventListener("click", this.handleOutsideClick),
            document.addEventListener("keydown", this.handleEscKeyPress),
            document.addEventListener("focusout", this.handleFocusOut);
    }
    #cleanupOpenState() {
        this.summaryElement.removeAttribute("open"),
            this.contentElement.removeAttribute("open"),
            this.#clearHoverTimers(),
            document.removeEventListener("click", this.handleOutsideClick),
            document.removeEventListener("keydown", this.handleEscKeyPress),
            document.removeEventListener("focusout", this.handleFocusOut);
    }
    get parentEl() {
        return this.contentElement;
    }
    get childEl() {
        return this._cachedChildEl || (this._cachedChildEl = this.parentEl.firstElementChild), this._cachedChildEl;
    }
    #getTranslateY() {
        return (
            this._cachedTranslateY === null && (this._cachedTranslateY = this.level === "top" ? "-3rem" : "2rem"),
            this._cachedTranslateY
        );
    }
    async showWithTransition() {
        const reducedMotion = prefersReducedMotion();
        animate(
            this.parentEl,
            { opacity: [0, 1], visibility: "visible" },
            { duration: reducedMotion ? 0 : 0.3, easing: "ease-in-out" },
            { delay: reducedMotion ? 0 : 0.2 }
        );
        const translateY = this.#getTranslateY();
        return animate(
            this.childEl,
            { transform: [`translateY(${translateY})`, "translateY(0)"] },
            { duration: reducedMotion ? 0 : 0.6, easing: [0.3, 1, 0.3, 1] }
        ).finished;
    }
    async hideWithTransition() {
        const reducedMotion = prefersReducedMotion();
        animate(
            this.parentEl,
            { opacity: 0, visibility: "hidden" },
            { duration: reducedMotion ? 0 : 0.2, easing: "ease-in-out" }
        );
        const translateY = this.#getTranslateY();
        return animate(
            this.childEl,
            { transform: `translateY(${translateY})` },
            { duration: reducedMotion ? 0 : 0.6, easing: [0.3, 1, 0.3, 1] }
        ).finished;
    }
    handleOutsideClick(event) {
        const isClickInside = this.contains(event.target),
            isClickOnDetailsDropdown = event.target.closest("details") instanceof DetailsDropdown;
        !isClickInside && !isClickOnDetailsDropdown && (this.open = !1);
    }
    handleEscKeyPress(event) {
        if (event.code === "Escape") {
            const targetMenu = event.target.closest("details[open]");
            targetMenu ? (targetMenu.open = !1) : this.open && (this.open = !1);
        }
    }
    handleFocusOut(event) {
        event.relatedTarget && !this.contains(event.relatedTarget) && (this.open = !1);
    }
    detectHover(event) {
        if (this.trigger === "hover" && this.isConnected) {
            const shouldOpen = event.type === "mouseenter";
            this.open !== shouldOpen && (this.open = shouldOpen);
        }
    }
    needsReverse() {
        if (!this.contentElement || this.contentElement.clientWidth === 0) return;
        const clientWidth = this.contentElement.clientWidth,
            offsetLeft = this.contentElement.offsetLeft,
            windowWidth = window.innerWidth;
        offsetLeft + clientWidth * 2 > windowWidth
            ? this.contentElement.classList.add("needs-reverse")
            : this.contentElement.classList.remove("needs-reverse");
    }
}
customElements.define("details-dropdown", DetailsDropdown, { extends: "details" }),
    lockDropdownCount.set(DetailsDropdown, 0);
const lockMegaCount = new WeakMap();
let megaMenuZIndexCounter = 1;
class DetailsMega extends DetailsDropdown {
    constructor() {
        super(),
            Shopify.designMode &&
                (this.addEventListener("shopify:block:select", () => {
                    this.open = !0;
                }),
                this.addEventListener("shopify:block:deselect", () => {
                    this.open = !1;
                }));
    }
    get additionalBodyClass() {
        return "has-mega-menu";
    }
    #incrementMegaCount() {
        lockMegaCount.set(DetailsMega, (lockMegaCount.get(DetailsMega) || 0) + 1);
    }
    #decrementMegaCount() {
        const count = Math.max((lockMegaCount.get(DetailsMega) || 0) - 1, 0);
        return lockMegaCount.set(DetailsMega, count), count;
    }
    async showWithTransition() {
        this.#incrementMegaCount(),
            document.body.classList.remove("mega-menu-closing"),
            document.body.classList.add(this.additionalBodyClass),
            (megaMenuZIndexCounter += 1),
            (this.contentElement.style.zIndex = megaMenuZIndexCounter.toString());
        const reducedMotion = prefersReducedMotion();
        return animate(
            this.childEl,
            { visibility: "visible", transform: ["translateY(-100%)", "translateY(0)"] },
            { duration: reducedMotion ? 0 : 0.6, easing: [0.7, 0, 0.2, 1] }
        ).finished;
    }
    async hideWithTransition() {
        const reducedMotion = prefersReducedMotion(),
            animationDuration = reducedMotion ? 0 : 0.6;
        document.documentElement.style.setProperty("--mega-menu-close-delay", reducedMotion ? "0s" : "0.6s"),
            await new Promise((resolve) => {
                requestAnimationFrame(() => {
                    document.body.classList.add("mega-menu-closing"), resolve();
                });
            }),
            (this.contentElement.style.zIndex = "0"),
            this.#decrementMegaCount(),
            removeScrollLockClass(document.body, this.additionalBodyClass, () => lockMegaCount.get(DetailsMega) === 0),
            await animate(
                this.childEl,
                { visibility: "hidden", transform: "translateY(-100%)" },
                { duration: animationDuration, easing: [0.7, 0, 0.2, 1] }
            ).finished,
            document.body.classList.remove("mega-menu-closing");
    }
}
customElements.define("details-mega", DetailsMega, { extends: "details" }), lockMegaCount.set(DetailsMega, 0);
class MenuSidebar extends HTMLElement {
    #intersectionObserver = null;
    constructor() {
        super(),
            (this.classes = { visible: "is-visible" }),
            (this.handleSidenavMenuToggle = this.handleSidenavMenuToggle.bind(this)),
            (this.handleKeyDown = this.handleKeyDown.bind(this)),
            (this.updateHeight = this.updateHeight.bind(this));
    }
    get summarys() {
        return this.querySelectorAll("summary");
    }
    get containerEl() {
        return (this._containerEl = this._containerEl || this.closest(".mega-menu__wrapper"));
    }
    connectedCallback() {
        this.#setupAriaAttributes(),
            onDocumentReady(this.setInitialMinHeight.bind(this)),
            this.summarys.forEach((summary) => {
                summary.addEventListener("mouseenter", this.handleSidenavMenuToggle),
                    summary.addEventListener("keydown", this.handleKeyDown),
                    summary.addEventListener("click", (e) => {
                        e.preventDefault();
                        const summaryEl = e.target.closest("summary");
                        this.#goToLink(summaryEl);
                    });
            }),
            this.setupIntersectionObserver();
    }
    setInitialMinHeight() {
        requestAnimationFrame(() => {
            this.setPromotionsHeight();
        });
    }
    setPromotionsHeight() {
        if (!this.containerEl) return;
        const promotionsEl = this.containerEl.querySelector(".mega-menu__promotions");
        if (!promotionsEl) return;
        const promotionsHeight = promotionsEl.offsetHeight;
        this.containerEl.style.setProperty("--promotions-height", `${promotionsHeight}px`);
    }
    #setupAriaAttributes() {
        this.summarys.forEach((summary, index) => {
            const contentEl = summary.nextElementSibling;
            if (!contentEl) return;
            const summaryId = summary.id || `menu-sidebar-item-${index}`,
                contentId = contentEl.id || `menu-sidebar-content-${index}`;
            (summary.id = summaryId),
                (contentEl.id = contentId),
                summary.setAttribute("role", "menuitem"),
                summary.setAttribute("aria-controls", contentId),
                summary.setAttribute("aria-expanded", "false"),
                contentEl.setAttribute("role", "menu"),
                contentEl.setAttribute("aria-labelledby", summaryId);
        });
    }
    setupIntersectionObserver() {
        (this.#intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                entry.isIntersecting &&
                    setTimeout(() => {
                        this.updateHeight(), this.setPromotionsHeight();
                    }, 100);
            });
        })),
            this.#intersectionObserver.observe(this);
    }
    updateHeight() {
        const activeSummary = this.querySelector(`.${this.classes.visible}`);
        if (!activeSummary) return;
        const contentEl = activeSummary.nextElementSibling;
        if (!this.containerEl || !contentEl) return;
        const contentHeight = contentEl.offsetHeight;
        this.containerEl.style.setProperty("--sidebar-height", `${contentHeight}px`);
    }
    setActiveItem(summaryEl, isUpdateHeight = !0) {
        const lastSidenavEl = this.querySelector(`.${this.classes.visible}`);
        lastSidenavEl &&
            (lastSidenavEl.classList.remove(this.classes.visible),
            lastSidenavEl.setAttribute("aria-expanded", "false")),
            summaryEl.classList.add(this.classes.visible),
            summaryEl.setAttribute("aria-expanded", "true"),
            isUpdateHeight && this.updateHeight();
    }
    handleSidenavMenuToggle(event) {
        const summaryEl = event.target.closest("summary");
        summaryEl && this.setActiveItem(summaryEl);
    }
    handleKeyDown(event) {
        const summaryEl = event.target.closest("summary");
        if (!summaryEl) return;
        const summaries = Array.from(this.summarys),
            currentIndex = summaries.indexOf(summaryEl);
        if (currentIndex === -1) return;
        const key = event.key;
        let targetIndex = currentIndex;
        switch (key) {
            case "ArrowDown":
                event.preventDefault(),
                    (targetIndex = currentIndex + 1),
                    targetIndex >= summaries.length && (targetIndex = 0),
                    summaries[targetIndex].focus(),
                    this.setActiveItem(summaries[targetIndex]);
                break;
            case "ArrowUp":
                event.preventDefault(),
                    (targetIndex = currentIndex - 1),
                    targetIndex < 0 && (targetIndex = summaries.length - 1),
                    summaries[targetIndex].focus(),
                    this.setActiveItem(summaries[targetIndex]);
                break;
            case "Home":
                event.preventDefault(), summaries[0].focus(), this.setActiveItem(summaries[0]);
                break;
            case "End":
                event.preventDefault(),
                    summaries[summaries.length - 1].focus(),
                    this.setActiveItem(summaries[summaries.length - 1]);
                break;
            case "Enter":
                event.preventDefault(), this.setActiveItem(summaryEl), this.#goToLink(summaryEl);
                break;
            case " ":
                event.preventDefault(), this.setActiveItem(summaryEl);
                break;
            default:
                return;
        }
    }
    #goToLink(summaryEl) {
        const linkUrl = summaryEl.dataset.linkUrl;
        linkUrl && (window.location.href = linkUrl);
    }
    disconnectedCallback() {
        this.summarys.forEach((el) => {
            el.removeEventListener("mouseenter", this.handleSidenavMenuToggle),
                el.removeEventListener("keydown", this.handleKeyDown);
        }),
            this.#intersectionObserver &&
                (this.#intersectionObserver.disconnect(), (this.#intersectionObserver = null));
    }
}
customElements.define("menu-sidebar", MenuSidebar);
class MenuDrawerDetails extends HTMLDetailsElement {
    #abortController = new AbortController();
    #animationFrameId = null;
    #boundHandleKeyDown = null;
    #boundHandleToggle = null;
    #detailsOutsideRestore = [];
    #focusableElements = [];
    #focusTrapHandler = null;
    constructor() {
        super(),
            (this.onSummaryClick = this.onSummaryClick.bind(this)),
            (this.onCloseButtonClick = this.onCloseButtonClick.bind(this)),
            (this.onOpenSubmenuButtonClick = this.onOpenSubmenuButtonClick.bind(this)),
            (this.#boundHandleKeyDown = this.#handleKeyDown.bind(this)),
            (this.#boundHandleToggle = this.#handleToggle.bind(this));
    }
    get parent() {
        return this.closest("[data-parent]");
    }
    get summary() {
        return this.querySelector("summary");
    }
    get closeButton() {
        return this.querySelector(".menu-drawer__item-link-back");
    }
    get openSubmenuButton() {
        return this.querySelector(".menu-drawer__item-link-arrow");
    }
    connectedCallback() {
        const summary = this.summary,
            closeButton = this.closeButton,
            openSubmenuButton = this.openSubmenuButton,
            { signal } = this.#abortController;
        summary && (summary.addEventListener("click", this.onSummaryClick, { signal }), this.#setupAriaAttributes()),
            openSubmenuButton && openSubmenuButton.addEventListener("click", this.onOpenSubmenuButtonClick, { signal }),
            closeButton && closeButton.addEventListener("click", this.onCloseButtonClick, { signal }),
            document.addEventListener("keydown", this.#boundHandleKeyDown),
            this.addEventListener("toggle", this.#boundHandleToggle, { signal }),
            this.#syncAriaExpanded();
    }
    disconnectedCallback() {
        this.#abortController.abort(),
            document.removeEventListener("keydown", this.#boundHandleKeyDown),
            this.#removeFocusTrap(),
            this.#restoreDetailsTabindex(),
            this.#animationFrameId &&
                (window.cancelAnimationFrame(this.#animationFrameId), (this.#animationFrameId = null));
    }
    #handleToggle() {
        this.open
            ? (this.#setDetailsTabindex(), this.#setupFocusTrap())
            : (this.#removeFocusTrap(), this.#restoreDetailsTabindex());
    }
    #setupFocusTrap() {
        if (this.#focusableElements.length === 0) return;
        const firstElement = this.#focusableElements[0],
            lastElement = this.#focusableElements[this.#focusableElements.length - 1],
            handleTabKey = (event) => {
                if (event.key !== "Tab") return;
                const activeElement = document.activeElement,
                    isFocusInDrawer = this.#focusableElements.includes(activeElement);
                event.shiftKey
                    ? (activeElement === firstElement || !isFocusInDrawer) &&
                      (event.preventDefault(), event.stopPropagation(), lastElement.focus())
                    : (activeElement === lastElement || !isFocusInDrawer) &&
                      (event.preventDefault(), event.stopPropagation(), firstElement.focus());
            };
        this.closeButton && this.closeButton.focus(),
            this.addEventListener("keydown", handleTabKey, !0),
            (this.#focusTrapHandler = handleTabKey);
    }
    #removeFocusTrap() {
        this.#focusTrapHandler &&
            (this.removeEventListener("keydown", this.#focusTrapHandler, !0), (this.#focusTrapHandler = null)),
            (this.#focusableElements = []);
    }
    #setDetailsTabindex() {
        this.#restoreDetailsTabindex();
        const dialog = this.closest(".dialog"),
            dialogHeader = dialog?.querySelector(".dialog__header"),
            submenu = this.querySelector(".menu-drawer__submenu"),
            focusableElements = getFocusableElements(dialog);
        (this.#focusableElements = []),
            focusableElements.forEach((el) => {
                if (submenu?.contains(el) || dialogHeader?.contains(el)) {
                    this.#focusableElements.push(el);
                    return;
                }
                const tabindex = el.getAttribute("tabindex");
                this.#detailsOutsideRestore.push({ element: el, tabindex }), el.setAttribute("tabindex", "-1");
            });
    }
    #restoreDetailsTabindex() {
        for (const { element, tabindex } of this.#detailsOutsideRestore)
            tabindex === null ? element.removeAttribute("tabindex") : element.setAttribute("tabindex", tabindex);
        this.#detailsOutsideRestore.length = 0;
    }
    #setupAriaAttributes() {
        const summary = this.summary;
        if (!summary) return;
        const contentId = summary.id || `${this.tagName.toLowerCase()}-content`;
        (summary.id = summary.id || contentId),
            summary.setAttribute("aria-expanded", this.hasAttribute("open") ? "true" : "false");
    }
    #syncAriaExpanded() {
        const summary = this.summary;
        summary && summary.setAttribute("aria-expanded", this.hasAttribute("open") ? "true" : "false");
    }
    #handleKeyDown(event) {
        if (event.key !== "Escape" || !this.hasAttribute("open")) return;
        const closestDrawer = event.target.closest("menu-drawer-details");
        !closestDrawer || closestDrawer !== this || (event.preventDefault(), this.onCloseButtonClick());
    }
    onSummaryClick(event) {
        const href = this.summary.dataset.linkUrl;
        if (href) {
            event.preventDefault(), (window.location.href = href);
            return;
        }
    }
    onOpenSubmenuButtonClick(event) {
        event.preventDefault(), event.stopPropagation();
        const parent = this.parent,
            summary = this.summary;
        setTimeout(() => {
            !parent ||
                !summary ||
                (this.open || (this.open = !0),
                parent.classList.add("active"),
                this.classList.add("active"),
                this.#syncAriaExpanded());
        }, 100);
    }
    onCloseButtonClick() {
        const parent = this.parent,
            summary = this.summary;
        !parent ||
            !summary ||
            (parent.classList.remove("active"),
            this.classList.remove("active"),
            this.#syncAriaExpanded(),
            this.#closeAnimation());
    }
    #closeAnimation() {
        this.#animationFrameId && window.cancelAnimationFrame(this.#animationFrameId);
        let animationStart;
        const handleAnimation = (time) => {
            animationStart === void 0 && (animationStart = time),
                time - animationStart < 400
                    ? (this.#animationFrameId = window.requestAnimationFrame(handleAnimation))
                    : (this.removeAttribute("open"), (this.#animationFrameId = null), this.#syncAriaExpanded());
        };
        this.#animationFrameId = window.requestAnimationFrame(handleAnimation);
    }
}
customElements.define("menu-drawer-details", MenuDrawerDetails, { extends: "details" });
class MenuDrawerSubmenu extends AccordionComponent {
    constructor() {
        super();
    }
    connectedCallback() {
        super.connectedCallback();
    }
    onSummaryClick(event) {
        event.preventDefault();
        const { target } = event,
            summary = target.closest("summary");
        if (summary) {
            const href = summary.dataset.linkUrl;
            if (href) {
                window.location.href = href;
                return;
            }
        }
    }
    onArrowClick(event) {
        event.preventDefault(), event.stopPropagation(), super.onSummaryClick(event);
    }
}
customElements.define("menu-drawer-submenu", MenuDrawerSubmenu);
class ShowMoreComponent extends Component {
    requiredRefs = ["showMoreButton", "showMoreItems", "showMoreContent"];
    #expanded = !1;
    #disableOnDesktop = !1;
    #collapsedHeight = 0;
    #disabledClass = "hidden";
    get #currentBreakpoint() {
        return isMobileBreakpoint() ? "MOBILE" : "DESKTOP";
    }
    #animation;
    #animationSpeed = 300;
    connectedCallback() {
        super.connectedCallback(), this.#updateBreakpointState();
    }
    #updateBreakpointState = () => {
        (this.#disableOnDesktop = this.dataset.disableOnDesktop === "true"),
            (this.#disabledClass = this.#disableOnDesktop ? "mobile:hidden" : "hidden");
    };
    #expand = () => {
        const { showMoreItems, showMoreContent } = this.refs;
        this.#collapsedHeight = showMoreContent.offsetHeight;
        const startHeight = this.#collapsedHeight;
        return (
            showMoreItems?.forEach((item) => item.classList.remove(this.#disabledClass)),
            { startHeight, endHeight: showMoreContent.scrollHeight }
        );
    };
    #collapse = () => {
        const { showMoreContent } = this.refs,
            startHeight = showMoreContent.offsetHeight,
            endHeight = this.#collapsedHeight;
        return { startHeight, endHeight };
    };
    #animateHeight = (startHeight, endHeight) => {
        const { showMoreContent } = this.refs;
        (showMoreContent.style.overflow = "hidden"),
            this.#animation?.cancel(),
            (this.#animation = showMoreContent.animate(
                { height: [`${startHeight}px`, `${endHeight}px`] },
                { duration: this.#animationSpeed, easing: "ease-in-out" }
            )),
            (this.#animation.onfinish = () => this.#onAnimationFinish());
    };
    #onAnimationFinish() {
        const { showMoreContent, showMoreItems } = this.refs;
        this.#expanded && showMoreItems.forEach((item) => item.classList.add(this.#disabledClass)),
            showMoreContent.style.removeProperty("height"),
            (showMoreContent.style.overflow = ""),
            (this.#expanded = !this.#expanded);
    }
    toggle = (event) => {
        if (
            (event.preventDefault(),
            this.#updateBreakpointState(),
            this.#currentBreakpoint === "DESKTOP" && this.#disableOnDesktop)
        )
            return;
        const { startHeight, endHeight } = this.#expanded ? this.#collapse() : this.#expand();
        (this.dataset.expanded = this.#expanded ? "false" : "true"),
            this.refs.showMoreButton.setAttribute("aria-expanded", this.dataset.expanded),
            this.#animateHeight(startHeight, endHeight);
    };
}
customElements.get("show-more-component") || customElements.define("show-more-component", ShowMoreComponent);
class HighlightText extends HTMLElement {
    constructor() {
        super(), (this.hasAnimated = !1);
    }
    connectedCallback() {
        this.#bindInView();
    }
    #bindInView() {
        inView(
            this,
            async () => {
                this.hasAnimated || ((this.hasAnimated = !0), await this.#enter());
            },
            { rootMargin: "0px 0px -50px 0px" }
        );
    }
    #enter() {
        this.classList.add("animate");
    }
}
customElements.get("highlight-text") || customElements.define("highlight-text", HighlightText, { extends: "em" });
class ReadMore extends Component {
    requiredRefs = ["readMoreButton", "readMoreButtonText", "readMoreContent"];
    constructor() {
        super(),
            (this.classes = { isDisabled: "is-disabled", isCollapsed: "is-collapsed" }),
            (this.toggleClass = this.dataset.toggleClass),
            (this.showText = this.dataset.showText),
            (this.hideText = this.dataset.hideText),
            (this.lineClamp = parseInt(this.dataset.lineClamp));
    }
    connectedCallback() {
        super.connectedCallback(), this.init();
    }
    init() {
        const { readMoreButton: button, readMoreContent: content } = this.refs,
            lineHeight = parseFloat(window.getComputedStyle(content).lineHeight),
            contentHeight = content.scrollHeight,
            maxHeight = lineHeight * this.lineClamp;
        if (contentHeight <= maxHeight) {
            button.style.display = "none";
            return;
        }
        this.classList.remove(this.classes.isDisabled), content.classList.remove(this.toggleClass), this.showLess();
    }
    showMore() {
        const { readMoreContent: content, readMoreButtonText: buttonText } = this.refs;
        this.classList.remove(this.classes.isCollapsed),
            content.classList.remove(this.toggleClass),
            (buttonText.textContent = this.hideText),
            this.resetHeight();
    }
    showLess() {
        const { readMoreContent: content, readMoreButtonText: buttonText } = this.refs;
        this.classList.add(this.classes.isCollapsed),
            content.classList.add(this.toggleClass),
            (buttonText.textContent = this.showText),
            this.setHeight();
    }
    setHeight() {
        const { readMoreContent: content } = this.refs,
            contentStyle = window.getComputedStyle(content),
            lineHeight = parseFloat(contentStyle.lineHeight),
            lines = parseInt(contentStyle.getPropertyValue("--line-clamp")),
            maxHeight = lineHeight * lines;
        content.style.setProperty("max-height", maxHeight + "px");
    }
    resetHeight() {
        const { readMoreContent: content } = this.refs;
        content.style.removeProperty("max-height");
    }
    onToggleClick(event) {
        event.preventDefault();
        const { readMoreContent: content } = this.refs;
        content.classList.contains(this.toggleClass) ? this.showMore() : this.showLess();
    }
}
customElements.get("read-more") || customElements.define("read-more", ReadMore);
class SwipeComponent extends HTMLDivElement {
    #resizer = null;
    #mutationObserver = null;
    #previousActiveElement = null;
    #isActive = !1;
    constructor() {
        super(),
            (this.swipeEl = null),
            (this.swipeInner = null),
            (this.scrollHandler = this.updateScrollClasses.bind(this)),
            (this.classes = { active: "is--active", begin: "is--beginning", end: "is--end" });
    }
    connectedCallback() {
        (this.swipeEl = this.querySelector(".swipe__element")),
            this.swipeEl &&
                ((this.swipeInner = this.swipeEl.querySelector(".swipe__inner")),
                this.init(),
                this.swipeEl.addEventListener("scroll", this.scrollHandler, { passive: !0 }),
                this.swipeEl.offsetParent !== null && this.updateScrollClasses(),
                (this.#resizer = new ResizeNotifier(() => {
                    this.swipeEl.offsetParent !== null && this.updateScrollClasses();
                })),
                this.#resizer.observe(this.swipeEl),
                this.#isActive && this.#startObservingActiveChanges());
    }
    disconnectCallback() {
        this.swipeEl && this.swipeEl.removeEventListener("scroll", this.scrollHandler, { passive: !0 }),
            this.#resizer && this.#resizer.disconnect(),
            this.#mutationObserver && this.#mutationObserver.disconnect();
    }
    #startObservingActiveChanges() {
        if (!this.swipeInner || this.#mutationObserver) return;
        const observedAttributes = ["aria-current", "aria-selected"];
        (this.#mutationObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === "attributes") {
                    const target = mutation.target,
                        attributeName = mutation.attributeName;
                    observedAttributes.includes(attributeName) &&
                        target.getAttribute(attributeName) === "true" &&
                        this.#scrollToActiveElement(target);
                }
                if (mutation.type === "childList" && mutation.addedNodes.length > 0)
                    for (const node of mutation.addedNodes)
                        node.nodeType === Node.ELEMENT_NODE &&
                            this.#mutationObserver.observe(node, {
                                attributes: !0,
                                attributeFilter: observedAttributes,
                            });
            }
        })),
            this.#mutationObserver.observe(this.swipeInner, { childList: !0 });
        const children = Array.from(this.swipeInner.children);
        for (const child of children)
            this.#mutationObserver.observe(child, { attributes: !0, attributeFilter: observedAttributes });
    }
    #stopObservingActiveChanges() {
        this.#mutationObserver && (this.#mutationObserver.disconnect(), (this.#mutationObserver = null));
    }
    #scrollToActiveElement(activeElement) {
        if (!this.swipeEl || !activeElement || !this.swipeInner || this.#previousActiveElement === activeElement)
            return;
        const scrollRect = activeElement.getBoundingClientRect(),
            boxRect = this.swipeEl.getBoundingClientRect(),
            scrollLeft = this.swipeEl.scrollLeft,
            containerGap = 16,
            children = Array.from(this.swipeInner.children),
            currentIndex = children.indexOf(activeElement),
            previousIndex = this.#previousActiveElement ? children.indexOf(this.#previousActiveElement) : -1;
        let scrollOffset;
        previousIndex < currentIndex
            ? (scrollOffset = scrollRect.x + scrollLeft - boxRect.x - containerGap)
            : (scrollOffset = scrollRect.x + scrollLeft - boxRect.x - boxRect.width + scrollRect.width + containerGap),
            (this.#previousActiveElement = activeElement),
            this.swipeEl.scrollTo({ left: scrollOffset, behavior: "smooth" });
    }
    init() {
        if (this.swipeEl.classList.contains("swipe-all")) {
            this.setActive(!0);
            return;
        }
        const setupResponsive = (className, mediaQuery) => {
            if (!this.swipeEl.classList.contains(className)) return;
            const mql = window.matchMedia(mediaQuery),
                update = () => this.setActive(mql.matches);
            update(), mql.addEventListener("change", update);
        };
        setupResponsive("swipe-mobile", mediaBreakpointMobile), setupResponsive("swipe-tablet", mediaBreakpointTablet);
    }
    setActive(isActive = !0) {
        (this.#isActive = isActive),
            this.classList.toggle(this.classes.active, isActive),
            isActive ? this.#startObservingActiveChanges() : this.#stopObservingActiveChanges();
    }
    updateScrollClasses() {
        const scrollLeft = this.swipeEl.scrollLeft,
            clientWidth = this.swipeEl.clientWidth,
            scrollWidth = this.swipeEl.scrollWidth,
            atStart = scrollLeft <= 0,
            atEnd = Math.ceil(scrollLeft + clientWidth) >= scrollWidth;
        this.classList.toggle(this.classes.begin, atStart), this.classList.toggle(this.classes.end, atEnd);
    }
}
customElements.define("swipe-component", SwipeComponent, { extends: "div" });
export class NewsletterForm extends Component {
    constructor() {
        super();
    }
    connectedCallback() {
        super.connectedCallback(), this.init();
    }
    init() {
        const { input, messageDialog } = this.refs,
            messageDialogRefs = messageDialog?.refs ?? {},
            { alert: alert2, messageErrorSubscribed } = messageDialogRefs,
            isSubscribed = window.location.href.includes("form_type=customer") && input.value.length != 0;
        isSubscribed && messageErrorSubscribed && !alert2 && messageErrorSubscribed.classList.remove("hidden"),
            (isSubscribed || alert2) &&
                (window.isMessageDialogShow ||
                    (messageDialog && messageDialog.showDialog(), (window.isMessageDialogShow = !0)));
    }
}
customElements.get("newsletter-form") || customElements.define("newsletter-form", NewsletterForm);
class SlideshowComponent extends CarouselComponent {
    #resizeObserver;
    constructor() {
        super(), (this.selectedIndex = this.selectedIndex);
    }
    get sectionId() {
        return this.getAttribute("data-section-id");
    }
    get controlType() {
        return this.getAttribute("data-control-type");
    }
    static get observedAttributes() {
        return ["selected-index"];
    }
    get selectedIndex() {
        return parseInt(this.getAttribute("selected-index")) || 0;
    }
    set selectedIndex(index) {
        this.setAttribute("selected-index", `${index}`);
    }
    connectedCallback() {
        super.connectedCallback(),
            this.swiperInstance
                ? this.#initAfterSwiperReady()
                : this.addEventListener(
                      "carousel:ready",
                      () => {
                          this.#initAfterSwiperReady();
                      },
                      { once: !0 }
                  );
    }
    #initAfterSwiperReady() {
        this.#init(),
            this.#updateControlsScheme(this.refs.slides[0]),
            (this.#resizeObserver = new ResizeObserver(() => this.#updateControlHeight())),
            this.#resizeObserver.observe(this.refs.controls);
    }
    disconnectedCallback() {
        this.#resizeObserver?.disconnect();
    }
    #init() {
        if (typeof this.swiperInstance != "object") return;
        const { slides, activeIndex } = this.swiperInstance;
        if (slides[activeIndex]) {
            const motionEls = slides[activeIndex].querySelectorAll("motion-component[data-motion-hold]");
            motionEls &&
                motionEls.forEach((el) => {
                    el.replay();
                });
        }
        this.swiperInstance.on("realIndexChange", this.#handleChange);
    }
    #handleChange = (swiper) => {
        const { slides, realIndex, activeIndex } = swiper;
        (this.selectedIndex = realIndex), this.#updateControlsScheme(slides[activeIndex]);
    };
    #updateControlsScheme(activeSlide) {
        if (this.refs.controls) {
            Array.from(this.refs.controls.classList)
                .filter((className) => className.startsWith("color-"))
                .forEach((className) => this.refs.controls.classList.remove(className));
            const colorScheme = activeSlide.dataset.colorScheme;
            colorScheme && this.refs.controls.classList.add(colorScheme);
        }
    }
    #updateControlHeight() {
        const height = this.refs.controls.offsetHeight;
        this.style.setProperty("--control-height", `${height}px`);
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "selected-index" && oldValue !== null && oldValue !== newValue) {
            const prevSlide = this.querySelectorAll(`[data-swiper-slide-index="${oldValue}"]`),
                currentSlide = this.querySelectorAll(`[data-swiper-slide-index="${newValue}"]`);
            prevSlide.forEach((slide) => {
                const deferredMedia = slide.querySelector("deferred-media");
                deferredMedia && deferredMedia.pauseMedia();
            }),
                currentSlide.forEach((slide) => {
                    const deferredMedia = slide.querySelector("deferred-media");
                    if (
                        (deferredMedia && deferredMedia.playMedia(),
                        !document.body.hasAttribute("data-motion-disabled"))
                    ) {
                        const motionEls = slide.querySelectorAll("motion-component");
                        motionEls &&
                            motionEls.forEach((el) => {
                                el.replay();
                            });
                    }
                });
        }
    }
}
customElements.get("slideshow-component") || customElements.define("slideshow-component", SlideshowComponent);
class CollectionHighlight extends Component {
    #shopifyAbortController;
    connectedCallback() {
        super.connectedCallback(), this.#registerDesignModeEvents();
    }
    disconnectedCallback() {
        this.#shopifyAbortController?.abort(), (this.#shopifyAbortController = void 0), super.disconnectedCallback();
    }
    #registerDesignModeEvents() {
        if (!(window.Shopify && Shopify.designMode)) return;
        this.#shopifyAbortController?.abort(), (this.#shopifyAbortController = new AbortController());
        const { signal } = this.#shopifyAbortController;
        document.addEventListener(
            "shopify:block:select",
            (e) => {
                if (e.detail.sectionId != this.sectionId) return;
                const titleEl = this.getBlockEl(e),
                    index = Number(titleEl.dataset.index);
                this.setActiveTab(index);
            },
            { signal }
        );
    }
    get sectionId() {
        const { sectionId } = this.dataset;
        if (!sectionId) throw new Error("Section id missing");
        return sectionId;
    }
    isActive(el) {
        return el.getAttribute("aria-current") === "true";
    }
    getBlockEl(event) {
        const { target } = event;
        return target.closest(".collection-highlight__part");
    }
    getTitleEl(event) {
        const { target } = event;
        return target.closest(".collection-highlight__part-title");
    }
    handleNavigationKeys(event) {
        const { key } = event,
            { titles } = this.refs;
        if (!titles?.length) return;
        const titleEl = this.getTitleEl(event);
        if (!titleEl) return;
        const currentIndex = titles.indexOf(titleEl);
        if (currentIndex === -1) return;
        if (key === "Enter" || key === " ") {
            const linkUrl = titleEl.dataset.linkUrl;
            linkUrl && (event.preventDefault(), (window.location.href = linkUrl));
            return;
        }
        let nextIndex = currentIndex;
        switch (key) {
            case "ArrowDown":
                nextIndex = currentIndex + 1;
                break;
            case "ArrowUp":
                nextIndex = currentIndex - 1;
                break;
            case "Home":
                nextIndex = 0;
                break;
            case "End":
                nextIndex = titles.length - 1;
                break;
            default:
                return;
        }
        (nextIndex = Math.max(0, Math.min(nextIndex, titles.length - 1))),
            nextIndex !== currentIndex && (event.preventDefault(), titles[nextIndex]?.focus());
    }
}
class CollectionHighlightWithImageCard extends CollectionHighlight {
    #abortController = new AbortController();
    #hoverTracker = null;
    #preventClick = !1;
    #initialPreviewHeight = !1;
    #currentActiveIndex = 0;
    connectedCallback() {
        super.connectedCallback();
        const { titles, preview } = this.refs,
            { signal } = this.#abortController;
        if (titles) {
            requestAnimationFrame(() => {
                this.setPreviewHeight(), this.setActiveTab(0);
            }),
                (this.onTouchChangeHandler = this.onTouchChange.bind(this)),
                (this.onClickHandler = this.onClick.bind(this)),
                (this.onKeydownHandler = this.handleNavigationKeys.bind(this)),
                (this.onMouseOverHandler = this.onMouseOver.bind(this)),
                (this.textsWrapMouseOverHandler = this.#onTextsWrapMouseOver.bind(this)),
                "ontouchstart" in window
                    ? titles.forEach((item) => {
                          item.addEventListener("touchstart", this.onTouchChangeHandler, { signal, passive: !0 }),
                              item.addEventListener("click", this.onClickHandler, { signal });
                      })
                    : (titles.forEach((item) => {
                          item.addEventListener("mouseover", this.onMouseOverHandler, { signal }),
                              item.addEventListener("focus", this.onMouseOverHandler, { signal });
                      }),
                      this.addEventListener("keydown", this.onKeydownHandler, { signal }),
                      preview.addEventListener("mouseover", this.textsWrapMouseOverHandler, { signal }));
            const mqlMobile = window.matchMedia(mediaBreakpointMobile);
            mqlMobile.onchange = () => this.updatePreviewHeight.bind(this);
        }
    }
    disconnectedCallback() {
        this.#abortController.abort(), super.disconnectedCallback();
    }
    setPreviewHeight() {
        const { preview, texts } = this.refs;
        preview && texts.length > 0 && preview.style.setProperty("height", texts[0].offsetHeight + "px");
    }
    updatePreviewHeight() {
        const { preview, texts } = this.refs;
        !preview ||
            !texts ||
            texts.length === 0 ||
            requestAnimationFrame(() => {
                let maxHeight = 0;
                texts.forEach((el) => {
                    maxHeight = Math.max(maxHeight, el.offsetHeight);
                }),
                    preview.style.setProperty("height", maxHeight + "px"),
                    (this.#initialPreviewHeight = !0);
            });
    }
    setActiveTab(newIndex) {
        const { titles, images, texts } = this.refs,
            newTitle = titles[newIndex],
            newImage = images[newIndex],
            newText = texts[newIndex];
        (this.#currentActiveIndex = newIndex),
            texts.forEach((el) => el.classList.toggle("is-active", el === newText)),
            titles.forEach((el) => {
                const index = Number(el.dataset.index);
                el.setAttribute("aria-current", el === newTitle),
                    el.setAttribute("tabindex", index == newIndex ? "0" : "-1");
            }),
            images.forEach((el) => {
                el.classList.toggle("is-active", el === newImage);
            });
    }
    onMouseOver(event) {
        this.#initialPreviewHeight || this.updatePreviewHeight();
        const titleEl = this.getTitleEl(event),
            index = Number(titleEl.dataset.index);
        if (event.type === "mouseover")
            clearTimeout(this.#hoverTracker),
                (this.#hoverTracker = setTimeout(() => {
                    this.isActive(titleEl) || this.setActiveTab(index);
                }, 100));
        else {
            if (this.isActive(titleEl)) return;
            this.setActiveTab(index);
        }
    }
    onTouchChange(event) {
        const titleEl = this.getTitleEl(event),
            index = Number(titleEl.dataset.index);
        if (this.isActive(titleEl)) {
            this.#preventClick = !1;
            return;
        } else this.#preventClick = !0;
        this.setActiveTab(index);
    }
    onClick(event) {
        this.#preventClick && event.preventDefault();
    }
    #onTextsWrapMouseOver() {
        clearTimeout(this.#hoverTracker);
    }
}
customElements.get("collection-highlight-with-image-card") ||
    customElements.define("collection-highlight-with-image-card", CollectionHighlightWithImageCard);
class LocalPickup extends Component {
    #activeFetch;
    connectedCallback() {
        super.connectedCallback();
        const closestSection = this.closest(".shopify-section, dialog"),
            variantUpdated = (event) => {
                event.detail.data.newProduct && (this.dataset.productUrl = event.detail.data.newProduct.url);
                const variantId = event.detail.resource ? event.detail.resource.id : null,
                    variantAvailable = event.detail.resource ? event.detail.resource.available : null;
                variantId !== this.dataset.variantId &&
                    (variantId && variantAvailable
                        ? (this.classList.remove("hidden"),
                          (this.dataset.variantId = variantId),
                          this.#fetchAvailability(variantId))
                        : this.classList.add("hidden"));
            };
        closestSection?.addEventListener(ThemeEvents.variantUpdate, variantUpdated),
            (this.disconnectedCallback = () => {
                closestSection?.removeEventListener(ThemeEvents.variantUpdate, variantUpdated);
            });
    }
    #createAbortController() {
        return (
            this.#activeFetch && this.#activeFetch.abort(),
            (this.#activeFetch = new AbortController()),
            this.#activeFetch
        );
    }
    #fetchAvailability = (variantId) => {
        if (!variantId) return;
        const abortController = this.#createAbortController(),
            url = this.dataset.productUrl;
        fetch(`${url}?variant=${variantId}&section_id=${this.dataset.sectionId}`, { signal: abortController.signal })
            .then((response) => response.text())
            .then((text) => {
                if (abortController.signal.aborted) return;
                const wrapper = new DOMParser()
                    .parseFromString(text, "text/html")
                    .querySelector(`local-pickup[data-variant-id="${variantId}"]`);
                wrapper ? (this.classList.remove("hidden"), morph(this, wrapper)) : this.classList.add("hidden");
            })
            .catch((_e) => {
                abortController.signal.aborted || this.classList.add("hidden");
            });
    };
}
customElements.get("local-pickup") || customElements.define("local-pickup", LocalPickup);
class ScrollingCards extends Component {
    #shopifyAbortController;
    constructor() {
        super(),
            (this.desktopScrollHandler = null),
            (this.resizeHandler = null),
            (this.rafId = null),
            (this.resizeTimeout = null),
            (this.lenis = null),
            (this.intersectionObserver = null),
            (this.resizeObserver = null),
            (this.isInViewport = !1),
            (this.cachedStartPoint = null),
            (this.cachedEndPoint = null),
            (this.cachedScrollRange = null),
            (this.needsRecalculation = !0),
            (this.lastScrollTop = 0),
            (this.cachedFirstColumnHeight = null),
            (this.cachedLastColumnHeight = null);
    }
    connectedCallback() {
        super.connectedCallback(), (this.scrollHandler = this.animateHeadings.bind(this));
        const updateLayout = (isMobile) => {
            const { headingWrap, headings, scrollEl } = this.refs;
            if (!headings || !scrollEl) return;
            const firstTextEl = headings.querySelector(".text-block");
            if (!firstTextEl) return;
            const firstTextStyle = window.getComputedStyle(firstTextEl),
                lineHeight = parseFloat(firstTextStyle.lineHeight),
                contentHeight = headings.offsetHeight,
                doubleLineHeight = lineHeight * this.headingLinesToShow,
                wrapHeight = Math.min(doubleLineHeight, contentHeight);
            if (((headingWrap.style.height = `${wrapHeight}px`), wrapHeight >= contentHeight)) {
                (headings.style.transform = "translateY(0)"), this.cleanup();
                return;
            }
            (this.headingsTranslateY = 0 - (contentHeight - wrapHeight)),
                (this.needsRecalculation = !0),
                this.cleanup(),
                isMobile ? this.initMobileAnimation() : this.initDesktopAnimation(),
                this.updateAnimationPosition();
        };
        requestAnimationFrame(() => {
            updateLayout(mediaQueryMobile.matches);
        }),
            (mediaQueryMobile.onchange = (event) => {
                requestAnimationFrame(() => {
                    updateLayout(event.matches);
                });
            }),
            this.setupResizeHandler(updateLayout, mediaQueryMobile),
            this.#registerDesignModeEvents(),
            (this.boundFocusinHandler = this.#handleHeadingFocusin.bind(this)),
            this.addEventListener("focusin", this.boundFocusinHandler);
    }
    setupResizeHandler(updateLayout, mqlMobile) {
        (this.resizeHandler = () => {
            this.resizeTimeout && clearTimeout(this.resizeTimeout),
                (this.resizeTimeout = setTimeout(() => {
                    requestAnimationFrame(() => {
                        updateLayout(mqlMobile.matches);
                    });
                }, 150));
        }),
            window.addEventListener("resize", this.resizeHandler, { passive: !0 });
    }
    updateAnimationPosition() {
        const { headings, cards } = this.refs;
        if (!(!headings || !cards || cards.length === 0))
            if (isMobileBreakpoint()) this.animateHeadings();
            else {
                const firstColumn = cards[0],
                    lastColumn = cards[cards.length - 1];
                (this.needsRecalculation = !0), this.updateDesktopAnimation(firstColumn, lastColumn, headings);
            }
    }
    get headingLinesToShow() {
        return 2;
    }
    initDesktopAnimation() {
        const { headings, cards } = this.refs;
        if (!headings || !cards || cards.length === 0) return;
        const firstColumn = cards[0],
            lastColumn = cards[cards.length - 1];
        this.setupIntersectionObserver(firstColumn, lastColumn),
            (this.lenis = getLenis()),
            this.lenis
                ? ((this.desktopScrollHandler = () => {
                      this.isInViewport &&
                          (this.rafId && cancelAnimationFrame(this.rafId),
                          (this.rafId = requestAnimationFrame(() => {
                              this.updateDesktopAnimation(firstColumn, lastColumn, headings), (this.rafId = null);
                          })));
                  }),
                  this.lenis.on("scroll", this.desktopScrollHandler))
                : ((this.desktopScrollHandler = () => {
                      if (this.isInViewport) {
                          if (!this.lenis) {
                              const retryLenis = getLenis();
                              if (retryLenis) {
                                  (this.lenis = retryLenis),
                                      window.removeEventListener("scroll", this.desktopScrollHandler),
                                      this.lenis.on("scroll", this.desktopScrollHandler);
                                  return;
                              }
                          }
                          this.rafId && cancelAnimationFrame(this.rafId),
                              (this.rafId = requestAnimationFrame(() => {
                                  this.updateDesktopAnimation(firstColumn, lastColumn, headings), (this.rafId = null);
                              }));
                      }
                  }),
                  window.addEventListener("scroll", this.desktopScrollHandler, { passive: !0 })),
            requestAnimationFrame(() => {
                this.updateDesktopAnimation(firstColumn, lastColumn, headings);
            });
    }
    setupIntersectionObserver(firstColumn, lastColumn) {
        const options = { root: null, rootMargin: "50% 0px", threshold: 0 };
        (this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                (this.isInViewport = entry.isIntersecting), this.isInViewport && (this.needsRecalculation = !0);
            });
        }, options)),
            this.intersectionObserver.observe(this),
            (this.resizeObserver = new ResizeObserver(() => {
                (this.needsRecalculation = !0),
                    (this.cachedFirstColumnHeight = null),
                    (this.cachedLastColumnHeight = null);
            })),
            firstColumn && this.resizeObserver.observe(firstColumn),
            lastColumn && this.resizeObserver.observe(lastColumn);
    }
    updateDesktopAnimation(firstColumn, lastColumn, headings) {
        if (!this.isInViewport) return;
        const scrollTop = this.lenis ? this.lenis.scroll : window.pageYOffset || document.documentElement.scrollTop,
            viewportHeight = window.innerHeight,
            significantScrollChange = Math.abs(scrollTop - this.lastScrollTop) > viewportHeight * 0.5;
        if (this.needsRecalculation || this.cachedStartPoint === null || significantScrollChange) {
            const firstColumnHeight = firstColumn.offsetHeight,
                lastColumnHeight = lastColumn.offsetHeight,
                firstRect = firstColumn.getBoundingClientRect(),
                lastRect = lastColumn.getBoundingClientRect(),
                firstTop = firstRect.top + scrollTop,
                lastBottom = lastRect.bottom + scrollTop;
            (this.cachedStartPoint = firstTop),
                (this.cachedEndPoint = lastBottom - viewportHeight),
                (this.cachedScrollRange = this.cachedEndPoint - this.cachedStartPoint),
                (this.cachedFirstColumnHeight = firstColumnHeight),
                (this.cachedLastColumnHeight = lastColumnHeight),
                (this.needsRecalculation = !1);
        }
        if (((this.lastScrollTop = scrollTop), this.cachedScrollRange <= 0)) {
            headings.style.transform = "translateY(0)";
            return;
        }
        const progress = Math.max(0, Math.min(1, (scrollTop - this.cachedStartPoint) / this.cachedScrollRange)),
            y = this.headingsTranslateY * progress;
        headings.style.transform = `translateY(${y}px)`;
    }
    initMobileAnimation() {
        const { scrollEl } = this.refs;
        scrollEl && scrollEl.addEventListener("scroll", this.scrollHandler, { passive: !0 });
    }
    cleanup() {
        this.desktopScrollHandler &&
            (this.lenis
                ? this.lenis.off("scroll", this.desktopScrollHandler)
                : window.removeEventListener("scroll", this.desktopScrollHandler),
            (this.desktopScrollHandler = null)),
            this.intersectionObserver && (this.intersectionObserver.disconnect(), (this.intersectionObserver = null)),
            this.resizeObserver && (this.resizeObserver.disconnect(), (this.resizeObserver = null)),
            this.resizeHandler &&
                (window.removeEventListener("resize", this.resizeHandler), (this.resizeHandler = null)),
            this.rafId && (cancelAnimationFrame(this.rafId), (this.rafId = null)),
            this.resizeTimeout && (clearTimeout(this.resizeTimeout), (this.resizeTimeout = null)),
            this.refs.scrollEl && this.refs.scrollEl.removeEventListener("scroll", this.scrollHandler),
            (this.cachedStartPoint = null),
            (this.cachedEndPoint = null),
            (this.cachedScrollRange = null),
            (this.needsRecalculation = !0),
            (this.lastScrollTop = 0),
            (this.cachedFirstColumnHeight = null),
            (this.cachedLastColumnHeight = null);
    }
    animateHeadings() {
        const { scrollEl, headings } = this.refs;
        if (!scrollEl || !headings) return;
        const scrollLeft = Math.ceil(scrollEl.scrollLeft),
            maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth;
        if (maxScroll <= 0) {
            headings.style.transform = "translateY(0)";
            return;
        }
        const scrolledRatio = scrollLeft / maxScroll,
            y = Math.ceil(this.headingsTranslateY * scrolledRatio);
        headings.style.transform = `translate3d(0, ${y}px, 0)`;
    }
    disconnectedCallback() {
        this.#shopifyAbortController?.abort(),
            (this.#shopifyAbortController = void 0),
            super.disconnectedCallback(),
            this.boundFocusinHandler &&
                (this.removeEventListener("focusin", this.boundFocusinHandler), (this.boundFocusinHandler = null)),
            this.cleanup();
    }
    get sectionId() {
        return this.dataset.sectionId || "";
    }
    #handleHeadingFocusin(e) {
        const { target } = e;
        target.closest(".block-scrolling__headings") && this.#scrollToHeadingBlock(target);
    }
    #registerDesignModeEvents() {
        if (!(window.Shopify && Shopify.designMode)) return;
        this.#shopifyAbortController?.abort(), (this.#shopifyAbortController = new AbortController());
        const { signal } = this.#shopifyAbortController;
        document.addEventListener(
            "shopify:block:select",
            (e) => {
                if (e.detail.sectionId != this.sectionId) return;
                const { target } = e;
                if (target.closest(".block-scrolling__headings")) {
                    this.#scrollToHeadingBlock(target);
                    return;
                }
                const cardEl = target.closest(".scrolling-cards__card");
                if (isMobileBreakpoint() && cardEl) {
                    const { cards, scrollEl } = this.refs;
                    if (Array.from(cards).indexOf(cardEl) >= 0) {
                        const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth;
                        if (maxScroll > 0) {
                            const targetLeft = cardEl.offsetLeft - (scrollEl.clientWidth - cardEl.offsetWidth) / 2;
                            scrollEl.scrollTo({
                                left: Math.max(0, Math.min(targetLeft, maxScroll)),
                                behavior: "smooth",
                            });
                        }
                        this.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                }
            },
            { signal }
        );
    }
    #scrollToHeadingBlock(target) {
        const { headings: headingsContainer, cards, scrollEl } = this.refs,
            selectedTextBlock = target.closest(".text-block"),
            index = selectedTextBlock ? Array.from(headingsContainer.children).indexOf(selectedTextBlock) : 0,
            N = Math.max(1, headingsContainer.children.length);
        if (isMobileBreakpoint()) {
            if (scrollEl) {
                const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth;
                if (maxScroll > 0) {
                    let ratio;
                    if (index === 0) ratio = 1;
                    else if (index === N - 1) ratio = 0;
                    else {
                        const containerRect = headingsContainer.getBoundingClientRect(),
                            textRect = selectedTextBlock.getBoundingClientRect();
                        ratio =
                            (containerRect.height - (textRect.top - containerRect.top + textRect.height / 2)) /
                            containerRect.height;
                    }
                    ratio = 1 - Math.max(0, Math.min(1, ratio));
                    const targetLeft = Math.max(0, Math.min(maxScroll * ratio, maxScroll));
                    scrollEl.scrollTo({ left: targetLeft, behavior: "smooth" });
                }
            }
        } else if (cards && cards.length > 0) {
            const firstColumn = cards[0],
                lastColumn = cards[cards.length - 1],
                scrollTop = this.lenis ? this.lenis.scroll : window.pageYOffset || document.documentElement.scrollTop,
                firstRect = firstColumn.getBoundingClientRect(),
                lastRect = lastColumn.getBoundingClientRect(),
                firstTop = firstRect.top + scrollTop,
                lastBottom = lastRect.bottom + scrollTop,
                viewportHeight = window.innerHeight,
                startPoint = firstTop,
                scrollRange = lastBottom - viewportHeight - startPoint;
            if (scrollRange > 0) {
                const progress = N > 1 ? index / (N - 1) : 0,
                    targetScrollTop = startPoint + progress * scrollRange,
                    lenis = getLenis();
                lenis
                    ? lenis.scrollTo(targetScrollTop, { lerp: 0.1 })
                    : window.scrollTo({ top: targetScrollTop, behavior: "smooth" });
            }
        } else this.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}
customElements.get("scrolling-cards") || customElements.define("scrolling-cards", ScrollingCards);
class ScrollingCardLayered extends Component {
    constructor() {
        super(),
            (this.scrollHandler = null),
            (this.resizeHandler = null),
            (this.rafId = null),
            (this.resizeTimeout = null),
            (this.lastScrollTop = 0),
            (this.cardData = null),
            (this.previousTransforms = new Map());
    }
    connectedCallback() {
        super.connectedCallback();
        const mqlMobile = window.matchMedia("screen and (max-width: 767px)"),
            init = () => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        const style = getComputedStyle(this);
                        (this.stickySpacing = parseFloat(style.getPropertyValue("--sticky-spacing")) * 10),
                            (this.widthReduced = parseFloat(style.getPropertyValue("--width-reduced")) * 10),
                            this.cleanup(),
                            this.initAnimation();
                    });
                });
            };
        init(mqlMobile.matches), (mqlMobile.onchange = (event) => init(event.matches));
    }
    initAnimation() {
        const { cards } = this.refs;
        if (!Array.isArray(cards) || cards.length === 0) {
            this.cardData = null;
            return;
        }
        const cardCount = cards.length,
            lastCard = cards[cardCount - 1],
            headerHeight =
                parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-height")) +
                20 +
                (cards.length - 1) * this.stickySpacing,
            cardWidths = [],
            scaleRatios = [];
        for (let index = 0; index < cardCount; index++)
            if (((cardWidths[index] = cards[index].offsetWidth), index < cardCount - 1)) {
                const cardWidth = cardWidths[index],
                    newWidth = cardWidth - (cardCount - index - 1) * this.widthReduced;
                scaleRatios[index] = newWidth / cardWidth;
            }
        const lastCardRect = lastCard.getBoundingClientRect(),
            lenisInstance = getLenis(),
            currentScrollTop = lenisInstance
                ? lenisInstance.scroll
                : window.pageYOffset || document.documentElement.scrollTop,
            lastCardTopAbsolute = lastCardRect.top + currentScrollTop;
        (this.cardData = { cards, cardCount, lastCard, lastCardTopAbsolute, headerHeight, cardWidths, scaleRatios }),
            (this.lenis = getLenis()),
            this.lenis
                ? ((this.scrollHandler = throttle(() => {
                      this.cardData && ((this.lastScrollTop = this.lenis.scroll), this.rafId || this.#rafLoop());
                  }, 32)),
                  this.lenis.on("scroll", this.scrollHandler))
                : ((this.scrollHandler = throttle(() => {
                      if (!this.cardData) return;
                      if (!this.lenis) {
                          const retryLenis = getLenis();
                          if (retryLenis) {
                              (this.lenis = retryLenis),
                                  window.removeEventListener("scroll", this.scrollHandler),
                                  (this.scrollHandler = throttle(() => {
                                      this.cardData &&
                                          ((this.lastScrollTop = this.lenis.scroll), this.rafId || this.#rafLoop());
                                  }, 32)),
                                  this.lenis.on("scroll", this.scrollHandler);
                              return;
                          }
                      }
                      const currentScrollTop2 = window.pageYOffset || document.documentElement.scrollTop;
                      (this.lastScrollTop = currentScrollTop2), this.rafId || this.#rafLoop();
                  }, 32)),
                  window.addEventListener("scroll", this.scrollHandler, { passive: !0 })),
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.cardData && (this.#recalculateLastCardPosition(), this.updateAnimation());
                });
            }),
            setTimeout(() => {
                this.cardData && !this.rafId && (this.#recalculateLastCardPosition(), this.updateAnimation());
            }, 100),
            this.setupResizeHandler();
    }
    #rafLoop() {
        if (!this.cardData) {
            this.rafId = null;
            return;
        }
        this.updateAnimation();
        const currentScrollTop = this.lenis
                ? this.lenis.scroll
                : window.pageYOffset || document.documentElement.scrollTop,
            lastScrollTop = this.lastScrollTop || currentScrollTop;
        Math.abs(currentScrollTop - lastScrollTop) > 0.1
            ? ((this.lastScrollTop = currentScrollTop),
              (this.rafId = requestAnimationFrame(() => {
                  this.#rafLoop();
              })))
            : (this.updateAnimation(), (this.rafId = null), (this.lastScrollTop = currentScrollTop));
    }
    updateAnimation() {
        if (!this.cardData) return;
        const { cards, cardCount, lastCard, headerHeight, scaleRatios } = this.cardData,
            scrollTop = this.lenis ? this.lenis.scroll : window.pageYOffset || document.documentElement.scrollTop,
            viewportHeight = window.visualViewport
                ? window.visualViewport.height
                : document.documentElement.clientHeight || window.innerHeight,
            cardRects = [];
        for (let index = 0; index < cardCount; index++) cardRects[index] = cards[index].getBoundingClientRect();
        const lastCardRect = cardRects[cardCount - 1],
            lastCardTopRelative = lastCardRect.top,
            lastCardTopAbsolute = lastCardRect.top + scrollTop;
        this.cardData.lastCardTopAbsolute = lastCardTopAbsolute;
        const stickyStartPoint = lastCardTopAbsolute - headerHeight,
            stickyEndPoint = lastCardTopAbsolute,
            isInStickyRange = scrollTop >= stickyStartPoint && scrollTop <= stickyEndPoint,
            firstCardAnimationStart = lastCardTopAbsolute - headerHeight - viewportHeight * 3,
            lastCardAnimationEnd = lastCardTopAbsolute + viewportHeight * 2;
        if (scrollTop < firstCardAnimationStart || scrollTop > lastCardAnimationEnd) {
            for (let index = 0; index < cardCount - 1; index++) {
                const card = cards[index];
                this.previousTransforms.get(card) !== "scale3d(1, 1, 1)" &&
                    ((card.style.transform = "scale3d(1, 1, 1)"),
                    this.previousTransforms.set(card, "scale3d(1, 1, 1)"));
            }
            for (let index = 0; index < cardCount - 1; index++) {
                const card = cards[index];
                card.style.getPropertyValue("--offset-top") && card.style.removeProperty("--offset-top");
            }
            return;
        }
        const cardTopsAbsolute = [];
        for (let index = 0; index < cardCount; index++) cardTopsAbsolute[index] = cardRects[index].top + scrollTop;
        for (let index = 0; index < cardCount - 1; index++) {
            const card = cards[index],
                scaleRatio = scaleRatios[index],
                nextCardTop = cardTopsAbsolute[index + 1],
                endPoint = lastCardTopAbsolute - headerHeight,
                startPoint = nextCardTop - viewportHeight,
                scrollRange = endPoint - startPoint;
            let newTransform;
            if (scrollRange <= 0) newTransform = "scale3d(1, 1, 1)";
            else {
                const progress = Math.max(0, Math.min(1, (scrollTop - startPoint) / scrollRange)),
                    scale = 1 + (scaleRatio - 1) * progress;
                newTransform = `scale3d(${scale}, ${scale}, 1)`;
            }
            this.previousTransforms.get(card) !== newTransform &&
                ((card.style.transform = newTransform), this.previousTransforms.set(card, newTransform));
        }
        if (isInStickyRange) {
            const currentLastCardTop = Math.max(lastCardTopRelative, 0);
            for (let index = 0; index < cardCount - 1; index++) {
                const card = cards[index],
                    newValue = `${currentLastCardTop - (cardCount - index - 1) * this.stickySpacing}px`;
                card.style.getPropertyValue("--offset-top") !== newValue &&
                    card.style.setProperty("--offset-top", newValue);
            }
        } else
            for (let index = 0; index < cardCount - 1; index++) {
                const card = cards[index];
                card.style.getPropertyValue("--offset-top") && card.style.removeProperty("--offset-top");
            }
    }
    setupResizeHandler() {
        (this.resizeHandler = () => {
            this.resizeTimeout && clearTimeout(this.resizeTimeout),
                (this.resizeTimeout = setTimeout(() => {
                    requestAnimationFrame(() => {
                        if (this.cardData) {
                            const { cards, cardCount } = this.cardData,
                                cardWidths = [],
                                scaleRatios = [];
                            for (let index = 0; index < cardCount; index++)
                                if (((cardWidths[index] = cards[index].offsetWidth), index < cardCount - 1)) {
                                    const cardWidth = cardWidths[index],
                                        newWidth = cardWidth - (cardCount - index - 1) * this.widthReduced;
                                    scaleRatios[index] = newWidth / cardWidth;
                                }
                            (this.cardData.cardWidths = cardWidths),
                                (this.cardData.scaleRatios = scaleRatios),
                                (this.cardData.headerHeight =
                                    parseFloat(
                                        getComputedStyle(document.documentElement).getPropertyValue("--header-height")
                                    ) +
                                    20 +
                                    (cardCount - 1) * this.stickySpacing);
                            const lastCardRect = this.cardData.lastCard.getBoundingClientRect(),
                                currentScrollTop = this.lenis
                                    ? this.lenis.scroll
                                    : window.pageYOffset || document.documentElement.scrollTop;
                            (this.cardData.lastCardTopAbsolute = lastCardRect.top + currentScrollTop),
                                (this.lastScrollTop = currentScrollTop),
                                this.updateAnimation();
                        }
                    });
                }, 150));
        }),
            window.addEventListener("resize", this.resizeHandler, { passive: !0 });
    }
    #recalculateLastCardPosition() {
        if (!this.cardData) return;
        const lastCardRect = this.cardData.lastCard.getBoundingClientRect(),
            currentScrollTop = this.lenis
                ? this.lenis.scroll
                : window.pageYOffset || document.documentElement.scrollTop;
        this.cardData.lastCardTopAbsolute = lastCardRect.top + currentScrollTop;
    }
    cleanup() {
        this.scrollHandler &&
            (this.lenis
                ? this.lenis.off("scroll", this.scrollHandler)
                : window.removeEventListener("scroll", this.scrollHandler),
            (this.scrollHandler = null)),
            this.resizeHandler &&
                (window.removeEventListener("resize", this.resizeHandler), (this.resizeHandler = null)),
            this.rafId && (cancelAnimationFrame(this.rafId), (this.rafId = null)),
            this.resizeTimeout && (clearTimeout(this.resizeTimeout), (this.resizeTimeout = null)),
            (this.cardData = null),
            this.previousTransforms.clear();
    }
    disconnectedCallback() {
        super.disconnectedCallback(), this.cleanup();
    }
}
customElements.get("scrolling-card-layered") || customElements.define("scrolling-card-layered", ScrollingCardLayered);
class ProductsBundle extends Component {
    #abortController = new AbortController();
    constructor() {
        super();
    }
    connectedCallback() {
        super.connectedCallback();
        const { signal } = this.#abortController,
            { hotspots } = this.refs;
        (this.onHoverHandler = this.#handleHover.bind(this)),
            hotspots &&
                hotspots.forEach((hotspot) => {
                    ["mouseover", "mouseleave", "focus", "focusout"].forEach((eventName) => {
                        hotspot.addEventListener(eventName, this.onHoverHandler, { signal });
                    });
                }),
            this.#setButtonDisable();
    }
    disconnectedCallback() {
        super.disconnectedCallback(), this.#abortController.abort();
    }
    #handleHover(event) {
        const { type, target } = event,
            { productList } = this.refs,
            { products } = productList.refs,
            hotspot = target.closest('[ref="hotspots[]"]'),
            hotspotIndex = Number(hotspot.dataset.index),
            isEnter = type === "mouseover" || type === "focus";
        hotspot.classList.toggle("is-selected", isEnter),
            isMobileBreakpoint() || this.classList.toggle("is-hover", isEnter);
        let activeProduct = null;
        products.forEach((product) => {
            const productIndex = Number(product.dataset.index);
            product.classList.toggle("is-selected", hotspotIndex === productIndex),
                hotspotIndex === productIndex && (activeProduct = product);
        }),
            isEnter &&
                (productList.swiperInstance &&
                    typeof productList.swiperInstance == "object" &&
                    !productList.swiperInstance.visibleSlidesIndexes.includes(hotspotIndex) &&
                    productList.swiperInstance.slideTo(hotspotIndex),
                isMobileBreakpoint() && activeProduct && this.#scrollToTop(activeProduct));
    }
    #scrollToTop(target, offset = 80) {
        ((selector, offset2) => {
            window.scrollTo({
                behavior: "smooth",
                top: selector.getBoundingClientRect().top - document.body.getBoundingClientRect().top - offset2,
            });
        })(target, offset);
    }
    onAddToCartClick(event) {
        event.preventDefault();
        const { addAllToCart } = this.refs;
        if (addAllToCart.getAttribute("aria-disabled") === "true") return;
        addAllToCart.setAttribute("aria-disabled", "true"), this.#showErrorMessage(), this.#toggleButtonLoading(!0);
        const products = this.querySelectorAll("product-bundle-variant-selector"),
            items = Array.from(products, (product) => ({
                id: product.querySelector("[name=id]")?.value,
                quantity: Number(product.querySelector("quantity-input")?.input?.value) || 1,
            })).filter((item) => item.id);
        if (FoxTheme.template.name == "cart" || FoxTheme.settings.cartType != "drawer") {
            const formData = new FormData();
            items.forEach(({ id, quantity }, index) => {
                formData.append(`items[${index}][id]`, id), formData.append(`items[${index}][quantity]`, quantity);
            });
            const fetchCfg2 = fetchConfig("javascript", { body: formData });
            fetch(FoxTheme.routes.cart_add_url, {
                ...fetchCfg2,
                headers: { ...fetchCfg2.headers, Accept: "text/html" },
            }).then((response) => {
                response.ok && (window.location = FoxTheme.routes.cart_url);
            });
            return;
        }
        let sectionsToUpdate = [];
        document.dispatchEvent(new CartGroupedSections(sectionsToUpdate));
        const body = JSON.stringify({
                items,
                sections: Array.from(sectionsToUpdate).join(","),
                sections_url: window.location.pathname,
            }),
            fetchCfg = fetchConfig("json", { body });
        fetch(`${FoxTheme.routes.cart_add_url}`, fetchCfg)
            .then((response) => response.json())
            .then(async (response) => {
                if (response.status) {
                    this.#showErrorMessage(response.description);
                    return;
                } else {
                    const cartJson = await (await fetch(`${FoxTheme.routes.cart_url}`, fetchConfig("json"))).json();
                    (cartJson.sections = response.sections),
                        this.dispatchEvent(
                            new CartUpdateEvent(cartJson, "", {
                                itemCount: cartJson.item_count || 0,
                                sections: response.sections,
                            })
                        );
                }
            })
            .catch((e) => {
                console.error(e);
            })
            .finally(() => {
                addAllToCart.removeAttribute("aria-disabled"), this.#toggleButtonLoading(!1);
            });
    }
    #showErrorMessage(message = !1) {
        const { addToCartTextError } = this.refs;
        addToCartTextError
            ? (addToCartTextError.classList.toggle("hidden", !message),
              message && (addToCartTextError.textContent = message))
            : message && alert(message);
    }
    #toggleButtonLoading(isLoading) {
        const { addAllToCart, addToCartSpinner } = this.refs;
        addAllToCart.classList.toggle("btn--loading", isLoading),
            addToCartSpinner.classList.toggle("hidden", !isLoading);
    }
    #setButtonDisable() {
        const products = this.querySelectorAll("product-bundle-variant-selector"),
            { addAllToCart } = this.refs;
        products.length < 1 && (addAllToCart.disabled = !0);
    }
}
customElements.get("products-bundle") || customElements.define("products-bundle", ProductsBundle);
class ProductBundleVariantSelector extends Component {
    constructor() {
        super();
    }
    connectedCallback() {
        super.connectedCallback();
        const { variantSelect } = this.refs;
        (this.currentOptionIds = variantSelect
            ? variantSelect.options[variantSelect.selectedIndex].dataset.optionsId
            : null),
            (this.currentVariantId = variantSelect ? variantSelect.value : null);
    }
    get productId() {
        return this.dataset.productId;
    }
    get productUrl() {
        return this.dataset.productUrl;
    }
    get sectionId() {
        return this.dataset.sectionId;
    }
    onVariantChange(event) {
        const { target: variantSelect } = event;
        (this.currentOptionIds = variantSelect.options[variantSelect.selectedIndex].dataset.optionsId),
            (this.currentVariantId = variantSelect.value),
            fetch(
                `${this.productUrl.split("?")[0]}?section_id=${this.sectionId}&option_values=${this.currentOptionIds}`
            )
                .then((response) => response.text())
                .then((responseText) => {
                    const html = new DOMParser().parseFromString(responseText, "text/html"),
                        pcardSource = this.getProductCardFromSource(html),
                        pcardDestination = this.closest(`.product-card__wrapper[data-product-id="${this.productId}"]`),
                        updateSourceFromDestination = (selector) => {
                            const source = pcardSource.querySelector(selector),
                                destination = pcardDestination.querySelector(selector);
                            source && destination && destination.replaceWith(source);
                        };
                    pcardSource &&
                        pcardDestination &&
                        (updateSourceFromDestination(".product-card__media"),
                        updateSourceFromDestination(".product-card__content"));
                })
                .catch((error) => {
                    console.error(error);
                });
    }
    getProductCardFromSource(html) {
        return html.querySelector(`.product-card__wrapper[data-product-id="${this.productId}"]`);
    }
}
customElements.get("product-bundle-variant-selector") ||
    customElements.define("product-bundle-variant-selector", ProductBundleVariantSelector);
class TestimonialParallax extends Component {
    constructor() {
        super(),
            (this.scrollHandler = null),
            (this.rafId = null),
            (this.lenis = null),
            (this.intersectionObserver = null),
            (this.isInViewport = !1);
    }
    connectedCallback() {
        super.connectedCallback(), this.#update(), mediaQueryMobile.addEventListener("change", this.#update);
    }
    disconnectedCallback() {
        super.disconnectedCallback(), this.#destroy();
    }
    #update = () => {
        isMobileBreakpoint() ? this.#destroy() : this.#init();
    };
    #init() {
        this.#setupIntersectionObserver(), this.#handleItemsAnimation();
    }
    #setupIntersectionObserver() {
        (this.intersectionObserver = new IntersectionObserver(
            (entries) => {
                (this.isInViewport = entries[0].isIntersecting),
                    this.isInViewport &&
                        requestAnimationFrame(() => {
                            this.#updateItemsAnimation();
                        });
            },
            { rootMargin: "100px" }
        )),
            this.intersectionObserver.observe(this);
    }
    #handleItemsAnimation() {
        const { items } = this.refs;
        items.length &&
            ((this.lenis = getLenis()),
            (this.scrollHandler = () => {
                this.rafId && cancelAnimationFrame(this.rafId),
                    (this.rafId = requestAnimationFrame(() => {
                        this.#updateItemsAnimation(), (this.rafId = null);
                    }));
            }),
            this.lenis
                ? this.lenis.on("scroll", this.scrollHandler)
                : window.addEventListener("scroll", this.scrollHandler, { passive: !0 }),
            requestAnimationFrame(() => {
                this.#updateItemsAnimation();
            }));
    }
    #updateItemsAnimation() {
        const { items } = this.refs;
        if (!items.length || !this.isInViewport) return;
        if (!this.lenis) {
            const retryLenis = getLenis();
            retryLenis &&
                ((this.lenis = retryLenis),
                window.removeEventListener("scroll", this.scrollHandler),
                this.lenis.on("scroll", this.scrollHandler));
        }
        const scrollTop = this.lenis ? this.lenis.scroll : window.pageYOffset || document.documentElement.scrollTop,
            viewportHeight = window.innerHeight;
        items.forEach((item) => {
            const { begin, end } = item.dataset;
            if (!begin || !end) return;
            const beginValue = parseFloat(begin),
                endValue = parseFloat(end),
                beginUnit = begin.includes("%") ? "%" : "px",
                endUnit = end.includes("%") ? "%" : "px",
                itemRect = item.getBoundingClientRect(),
                itemTop = itemRect.top + scrollTop,
                itemBottom = itemTop + itemRect.height,
                startPoint = itemTop - viewportHeight,
                scrollRange = itemBottom - startPoint;
            if (scrollRange <= 0) {
                const beginPx2 = beginUnit === "%" ? (beginValue / 100) * itemRect.height : beginValue;
                item.style.transform = `translateY(${beginPx2}${beginUnit === "%" ? "%" : "px"})`;
                return;
            }
            const progress = Math.max(0, Math.min(1, (scrollTop - startPoint) / scrollRange)),
                beginPx = beginUnit === "%" ? (beginValue / 100) * itemRect.height : beginValue,
                endPx = endUnit === "%" ? (endValue / 100) * itemRect.height : endValue,
                currentY = beginPx + (endPx - beginPx) * progress;
            item.style.transform = `translateY(${currentY}px)`;
        });
    }
    #destroy() {
        this.intersectionObserver && (this.intersectionObserver.disconnect(), (this.intersectionObserver = null)),
            this.scrollHandler &&
                (this.lenis
                    ? this.lenis.off("scroll", this.scrollHandler)
                    : window.removeEventListener("scroll", this.scrollHandler),
                (this.scrollHandler = null)),
            this.rafId && (cancelAnimationFrame(this.rafId), (this.rafId = null)),
            this.refs.items &&
                this.refs.items.forEach((item) => {
                    item.style.transform = "";
                });
    }
}
customElements.get("testimonial-parallax") || customElements.define("testimonial-parallax", TestimonialParallax);
class FlexCarousel extends CarouselComponent {
    connectedCallback() {
        super.connectedCallback(),
            this.swiperInstance
                ? this.#init()
                : this.addEventListener(
                      "carousel:ready",
                      () => {
                          this.#init();
                      },
                      { once: !0 }
                  );
    }
    #init() {
        if (!this.swiperInstance) return;
        const EVENTS = ["reachBeginning", "reachEnd", "fromEdge"];
        this.querySelectorAll(".edge__shadows").forEach((edgeEl) => {
            const swiper = edgeEl.getAttribute("ref") === "thumbnails" ? this.thumbnailSwiper : this.swiperInstance;
            edgeEl.classList.add("is--active"),
                this.#updateShadow(edgeEl, swiper),
                EVENTS.forEach((evt) => {
                    swiper.on(evt, () => this.#updateShadow(edgeEl, swiper));
                });
        });
    }
    #updateShadow(edgeEl, swiper) {
        edgeEl.classList.toggle("is--beginning", swiper.isBeginning), edgeEl.classList.toggle("is--end", swiper.isEnd);
    }
}
customElements.define("flex-carousel", FlexCarousel),
    customElements.get("footer-details") ||
        customElements.define(
            "footer-details",
            class extends HTMLDetailsElement {
                constructor() {
                    super();
                }
                get accordionEl() {
                    return (this._accordionEl = this._accordionEl || this.closest("accordion-component"));
                }
                connectedCallback() {
                    this.openDefault = this.dataset.openDefault === "true";
                    const mqlTablet = window.matchMedia("screen and (max-width: 1023px)"),
                        updateOpen = (isTablet) => {
                            const shouldOpen = isTablet ? this.openDefault : !0;
                            if (this.open === shouldOpen) return;
                            const accordionEl = this.accordionEl;
                            if (!accordionEl || !accordionEl.refs) {
                                console.warn("footer-details: accordion-component not found or refs not initialized");
                                return;
                            }
                            const { item: items, summary: summaries, content: contents } = accordionEl.refs;
                            if (!items || !summaries || !contents) {
                                const item2 = this.closest("details") || this,
                                    summary2 = item2.querySelector("summary"),
                                    content2 = item2.querySelector(".accordion__content");
                                accordionEl.toggleOpen &&
                                    item2 &&
                                    summary2 &&
                                    content2 &&
                                    accordionEl.toggleOpen({
                                        willOpen: shouldOpen,
                                        item: item2,
                                        summary: summary2,
                                        content: content2,
                                    });
                                return;
                            }
                            let idx = -1;
                            Array.isArray(items) && (idx = items.indexOf(this));
                            let item = Array.isArray(items) ? items[idx] : items,
                                summary = Array.isArray(summaries) ? summaries[idx] : summaries,
                                content = Array.isArray(contents) ? contents[idx] : contents;
                            !item ||
                                !summary ||
                                !content ||
                                accordionEl.toggleOpen({ willOpen: shouldOpen, item, summary, content });
                        };
                    updateOpen(mqlTablet.matches), (mqlTablet.onchange = (event) => updateOpen(event.matches));
                }
            },
            { extends: "details" }
        );
class MarqueeComponent extends Component {
    requiredRefs = ["inner"];
    #resizeObserver;
    #scrollStop = null;
    #inViewStop = null;
    #intersectionObserver = null;
    #previousWidth = 0;
    static #PAUSE_OBSERVER_MARGIN = "0px 0px 50px 0px";
    static #MIN_COPIES = 5;
    static #COPY_WIDTH_ESTIMATE = 200;
    static #DURATION_MULTIPLIER = 33;
    static #DURATION_MAX_RATIO = 2.5;
    static #DEFAULT_DURATION = "20s";
    static #DEFAULT_PARALLAX = 0.55;
    static #RESIZE_DEBOUNCE = 200;
    connectedCallback() {
        super.connectedCallback(),
            !prefersReducedMotion() &&
                ((this.isRTL = !1),
                typeof requestIdleCallback < "u"
                    ? requestIdleCallback(
                          () => {
                              this.#init();
                          },
                          { timeout: 1e3 }
                      )
                    : setTimeout(() => {
                          this.#init();
                      }, 100));
    }
    disconnectedCallback() {
        super.disconnectedCallback(), this.#cleanup();
    }
    #init() {
        const { inner } = this.refs;
        if (!inner) return;
        const item = inner.firstElementChild;
        item &&
            requestAnimationFrame(() => {
                const height = this.offsetHeight,
                    isRotated = this.classList.contains("marquee--rotated"),
                    childWidth = this.#getChildWidthSync(inner),
                    parentWidth = this.#getParentWidthSync();
                item.classList.add("animate"),
                    this.#setAnimationDurationWithValues(childWidth, parentWidth),
                    this.style.setProperty("--block-height", `${height}px`),
                    isRotated ? this.#setRotateOffsetWithHeight(height) : this.style.setProperty("--offset", "0px"),
                    this.#adjustItemCount(),
                    (this.#previousWidth = parentWidth),
                    this.parallax
                        ? (this.#initParallax(),
                          requestAnimationFrame(() => {
                              this.#adjustItemCount();
                          }))
                        : this.#initPauseObserver(),
                    this.#setupResizeObserver();
            });
    }
    #getChildWidthSync(inner) {
        const item = inner?.firstElementChild;
        if (!item) return 1;
        const rect = item.getBoundingClientRect();
        return rect.right - rect.left;
    }
    #getParentWidthSync() {
        const rect = this.getBoundingClientRect();
        return rect.right - rect.left;
    }
    #setAnimationDurationWithValues(childWidth, parentWidth) {
        const liquidDuration = this.duration;
        if (liquidDuration && liquidDuration > 0) {
            this.style.setProperty("--duration", `${liquidDuration}s`);
            return;
        }
        if (childWidth > 0 && parentWidth > 0) {
            const ratio = Math.ceil(childWidth / parentWidth),
                duration =
                    (MarqueeComponent.#DURATION_MULTIPLIER - 16) *
                    Math.min(MarqueeComponent.#DURATION_MAX_RATIO, ratio);
            this.style.setProperty("--duration", `${duration}s`);
        } else this.style.setProperty("--duration", MarqueeComponent.#DEFAULT_DURATION);
    }
    #cleanup() {
        this.#resizeObserver?.disconnect(),
            window.removeEventListener("resize", this.#handleResize),
            this.#intersectionObserver?.disconnect(),
            this.#inViewStop?.(),
            this.#scrollStop?.(),
            (this.#intersectionObserver = null),
            (this.#inViewStop = null),
            (this.#scrollStop = null);
    }
    #setAnimationDuration() {
        const liquidDuration = this.duration;
        if (liquidDuration && liquidDuration > 0) {
            this.style.setProperty("--duration", `${liquidDuration}s`);
            return;
        }
        const childWidth = this.childElementWidth,
            parentWidth = this.parentWidth;
        if (childWidth > 0 && parentWidth > 0) {
            const ratio = Math.ceil(childWidth / parentWidth),
                duration =
                    (MarqueeComponent.#DURATION_MULTIPLIER - 16) *
                    Math.min(MarqueeComponent.#DURATION_MAX_RATIO, ratio);
            this.style.setProperty("--duration", `${duration}s`);
        } else this.style.setProperty("--duration", MarqueeComponent.#DEFAULT_DURATION);
    }
    #adjustItemCount(resetAll = !1) {
        const { inner } = this.refs;
        if (!inner) return;
        const currentCount = inner.children.length;
        if (currentCount === 0) return;
        const originalItem = inner.firstElementChild;
        if (!originalItem) return;
        if (resetAll && currentCount > 1) for (; inner.children.length > 1; ) inner.lastElementChild?.remove();
        if (inner.children.length === 1) {
            const conservativeCount = Math.max(
                    MarqueeComponent.#MIN_COPIES,
                    Math.ceil(window.innerWidth / MarqueeComponent.#COPY_WIDTH_ESTIMATE) + 2
                ),
                fragment = document.createDocumentFragment();
            for (let i = 0; i < conservativeCount - 1; i++) {
                const clone = originalItem.cloneNode(!0);
                this.#disableFocusableElements(clone),
                    clone.setAttribute("aria-hidden", "true"),
                    clone.classList.add("animate"),
                    fragment.appendChild(clone);
            }
            inner.appendChild(fragment),
                requestAnimationFrame(() => {
                    inner.querySelectorAll(".marquee__items:not(:first-child) .media").forEach((media) => {
                        const img = media.querySelector("img.media__image");
                        img &&
                            img.complete &&
                            img.naturalWidth > 0 &&
                            (media.classList.remove("loading"),
                            img.classList.contains("loading") &&
                                (img.classList.remove("loading"), img.classList.add("loaded")));
                    });
                });
        }
        const exactCount = this.#calculateNumberOfCopies(),
            finalCount = inner.children.length;
        if (exactCount > finalCount) this.#addRepeatedItems(exactCount - finalCount, originalItem);
        else if (exactCount < finalCount) {
            const itemsToRemove = Math.min(finalCount - exactCount, finalCount - 1);
            this.#removeRepeatedItems(itemsToRemove);
        }
        this.hasAttribute("data-duration") || this.#setAnimationDuration();
    }
    #addRepeatedItems(numberOfCopies, templateItem = null) {
        const { inner } = this.refs;
        if (!inner) return;
        const item = templateItem || inner.firstElementChild;
        if (item) for (let i = 0; i < numberOfCopies; i++) this.#cloneItem(item, inner);
    }
    #removeRepeatedItems(numberOfCopies) {
        const { inner } = this.refs;
        if (inner) for (let i = 0; i < numberOfCopies; i++) inner.lastElementChild?.remove();
    }
    #cloneItem(item, container) {
        const clone = item.cloneNode(!0);
        this.#disableFocusableElements(clone),
            clone.setAttribute("aria-hidden", "true"),
            clone.classList.add("animate"),
            container.appendChild(clone),
            clone.querySelectorAll(".media").forEach((media) => {
                const img = media.querySelector("img.media__image");
                img &&
                    img.complete &&
                    img.naturalWidth > 0 &&
                    (media.classList.remove("loading"),
                    img.classList.contains("loading") &&
                        (img.classList.remove("loading"), img.classList.add("loaded")));
            });
    }
    #getFocusableElements(wrapperEl) {
        return wrapperEl.querySelectorAll("a[href], button:enabled, [tabindex]:not([tabindex^='-'])");
    }
    #disableFocusableElements(wrapperEl) {
        const focusableElements = this.#getFocusableElements(wrapperEl);
        focusableElements &&
            focusableElements.forEach((el) => {
                el.setAttribute("tabindex", "-1");
            });
    }
    #calculateNumberOfCopies() {
        const childWidth = this.childElementWidth,
            parentWidth = this.parentWidth;
        if (childWidth <= 0 || parentWidth <= 0) return MarqueeComponent.#MIN_COPIES;
        const baseCopies = Math.ceil(parentWidth / childWidth);
        if (this.parallax) {
            const parallaxValue = this.#parseParallaxValue(),
                parallaxTranslate = Math.abs((parallaxValue * 100) / (1 + parallaxValue)),
                parallaxMultiplier = 1.5,
                extraCopies = Math.ceil(parallaxTranslate / 10) + 4;
            return Math.ceil(baseCopies * parallaxMultiplier) + extraCopies;
        }
        return baseCopies + 2;
    }
    #initParallax() {
        this.#createParallaxAnimation(), this.#initParallaxPauseObserver();
    }
    #createParallaxAnimation() {
        const parallaxValue = this.#parseParallaxValue();
        let translate = this.#calculateParallaxTranslate(parallaxValue);
        this.#scrollStop = scroll(
            animate(
                this.refs.inner,
                { transform: [`translateX(${translate}%)`, "translateX(0)"] },
                { easing: "linear" }
            ),
            { target: this, offset: ["start end", "end start"] }
        );
    }
    #parseParallaxValue() {
        const parallaxAttr = this.getAttribute("data-parallax");
        return !parallaxAttr || parallaxAttr === "false"
            ? 0
            : parallaxAttr === "true"
              ? MarqueeComponent.#DEFAULT_PARALLAX
              : parseFloat(parallaxAttr);
    }
    #calculateParallaxTranslate(parallaxValue) {
        let translate = (parallaxValue * 100) / (1 + parallaxValue);
        return (
            this.direction === "reverse" || this.direction === "right" || (translate *= -1),
            this.isRTL && (translate *= -1),
            translate
        );
    }
    #initParallaxPauseObserver() {
        (this.#intersectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    entry.isIntersecting ? this.#resumeParallax() : this.#pauseParallax();
                });
            },
            { rootMargin: MarqueeComponent.#PAUSE_OBSERVER_MARGIN }
        )),
            this.#intersectionObserver.observe(this);
    }
    #pauseParallax() {
        this.classList.add("paused"), this.#scrollStop && (this.#scrollStop(), (this.#scrollStop = null));
    }
    #resumeParallax() {
        this.classList.remove("paused"), this.#scrollStop || this.#createParallaxAnimation();
    }
    #initPauseObserver() {
        (this.#intersectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    entry.isIntersecting ? this.classList.remove("paused") : this.classList.add("paused");
                });
            },
            { rootMargin: MarqueeComponent.#PAUSE_OBSERVER_MARGIN }
        )),
            this.#intersectionObserver.observe(this);
    }
    #setupResizeObserver() {
        (this.#resizeObserver = new ResizeObserver(() => this.#setHeight())),
            this.#resizeObserver.observe(this),
            window.addEventListener("resize", this.#handleResize);
    }
    #handleResize = debounce(() => {
        const currentWidth = this.parentWidth;
        if (currentWidth === this.#previousWidth) return;
        this.#previousWidth = currentWidth;
        const { inner } = this.refs;
        if (!inner) return;
        inner.querySelectorAll(".marquee__items").forEach((el) => {
            el.classList.remove("animate"), (el.style.transform = "");
        }),
            this.parallax &&
                this.#scrollStop &&
                (this.#scrollStop(), (this.#scrollStop = null), (inner.style.transform = "")),
            this.#adjustItemCount(!0),
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    inner.querySelectorAll(".marquee__items").forEach((el) => {
                        el.classList.add("animate"), (el.style.transform = "");
                    }),
                        this.parallax && this.#createParallaxAnimation();
                });
            });
    }, MarqueeComponent.#RESIZE_DEBOUNCE);
    #setHeight() {
        const height = this.offsetHeight,
            isRotated = this.classList.contains("marquee--rotated");
        this.style.setProperty("--block-height", `${height}px`),
            isRotated ? this.#setRotateOffsetWithHeight(height) : this.style.setProperty("--offset", "0px");
    }
    #setRotateOffsetWithHeight(blockHeight) {
        const angleDeg =
            parseFloat(this.style.getPropertyValue("--angle-raw")) ||
            parseFloat(this.style.getPropertyValue("--angle")) ||
            0;
        if (angleDeg === 0) {
            this.style.setProperty("--offset", "0px");
            return;
        }
        const angleRad = (Math.abs(angleDeg) * Math.PI) / 180,
            offset = blockHeight * Math.tan(angleRad);
        this.style.setProperty("--offset", `${offset}px`);
    }
    #setRotateOffset() {
        if (!this.classList.contains("marquee--rotated")) {
            this.style.setProperty("--offset", "0px");
            return;
        }
        const angleDeg =
            parseFloat(this.style.getPropertyValue("--angle-raw")) ||
            parseFloat(this.style.getPropertyValue("--angle")) ||
            0;
        if (angleDeg === 0) {
            this.style.setProperty("--offset", "0px");
            return;
        }
        const angleRad = (Math.abs(angleDeg) * Math.PI) / 180,
            offset =
                (this.offsetHeight || parseFloat(this.style.getPropertyValue("--block-height")) || 0) *
                Math.tan(angleRad);
        this.style.setProperty("--offset", `${offset}px`);
    }
    onPause() {
        this.classList.add("paused"),
            this.parallax && this.#scrollStop && (this.#scrollStop(), (this.#scrollStop = null));
    }
    onPlay() {
        this.classList.remove("paused"), this.parallax && !this.#scrollStop && this.#createParallaxAnimation();
    }
    get direction() {
        return this.getAttribute("data-direction") || "forward";
    }
    get duration() {
        if (!this.hasAttribute("data-duration")) return null;
        const value = parseFloat(this.getAttribute("data-duration"));
        return isNaN(value) ? null : value;
    }
    get parallax() {
        return isTouch() ? !1 : this.#parseParallaxValue();
    }
    get parentWidth() {
        const rect = this.getBoundingClientRect();
        return rect.right - rect.left;
    }
    get childElementWidth() {
        const { inner } = this.refs,
            item = inner?.firstElementChild;
        if (!item) return 1;
        const rect = item.getBoundingClientRect();
        return rect.right - rect.left;
    }
}
customElements.get("marquee-component") || customElements.define("marquee-component", MarqueeComponent);
 
