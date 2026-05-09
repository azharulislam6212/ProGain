import { Component } from "@theme/component";
import { DialogCloseEvent } from "@theme/dialog";
import { ThemeEvents, MediaStartedPlayingEvent, ModelInteractionEvent } from "@theme/events";
import { isSafari, getSafariVersion } from "@theme/utilities";
import { mediaCoordinator } from "@theme/media-coordinator";
class TabsComponent extends Component {
    requiredRefs = ["tab", "panel"];
    _activeIndex = 0;
    #animations = new WeakMap();
    #previousIndex = 0;
    #shopifyAbortController;
    connectedCallback() {
        super.connectedCallback(), this.#registerDesignModeEvents();
        const initial = Number(this.getAttribute("active-index"));
        Number.isNaN(initial) || (this._activeIndex = this.#clampIndex(initial)),
            this.#ensureIdsAndAria(),
            this.#syncSelected(!1);
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
                const { target } = e,
                    index = target.closest('[ref="panel[]"]').dataset.index;
                this.selectTab(index, !0);
            },
            { signal }
        );
    }
    onTabClick(event) {
        event.preventDefault();
        const target = event.target;
        if (!target) return;
        const index = this.refs.tab.indexOf(target);
        index !== -1 && this.selectTab(index, !0);
    }
    onKeydown(event) {
        const tabs = this.refs.tab;
        if (!tabs?.length) return;
        const currentIndex = tabs.indexOf(event.target);
        if (currentIndex === -1) return;
        let next;
        switch (event.key) {
            case "ArrowRight":
            case "ArrowDown":
                next = currentIndex + 1;
                break;
            case "ArrowLeft":
            case "ArrowUp":
                next = currentIndex - 1;
                break;
            case "Home":
                next = 0;
                break;
            case "End":
                next = tabs.length - 1;
                break;
            default:
                return;
        }
        event.preventDefault(), this.selectTab(next, !0);
    }
    selectTab(index, focus = !1) {
        const next = this.#clampIndex(index);
        next !== this._activeIndex &&
            ((this.#previousIndex = this._activeIndex),
                (this._activeIndex = next),
                this.setAttribute("active-index", String(next)),
                this.#syncSelected(focus));
    }
    #loadPanelContent(panel) {
        if (panel.dataset.lazyLoading !== "true" || panel.dataset.loaded === "true") return;
        const template = panel.querySelector("template");
        if (!template) {
            panel.dataset.loaded = "true";
            return;
        }
        const fragment = template.content.cloneNode(!0);
        panel.appendChild(fragment),
            template.remove(),
            panel.querySelectorAll("noscript").forEach((fallback) => fallback.remove()),
            (panel.dataset.loaded = "true");
    }
    #syncSelected(focus) {
        const tabs = this.refs.tab,
            panels = this.refs.panel;
        if (!tabs?.length || !panels?.length) return;
        for (let i = 0; i < tabs.length; i++) {
            const isActive = i === this._activeIndex;
            tabs[i].setAttribute("aria-selected", String(isActive)),
                tabs[i].setAttribute("tabindex", isActive ? "0" : "-1"),
                tabs[i].toggleAttribute("data-active", isActive);
        }
        const activePanel = panels[this._activeIndex],
            previousPanel = panels[this.#previousIndex];
        if ((this.#loadPanelContent(activePanel), this.#previousIndex === this._activeIndex))
            activePanel &&
                (this.#cancelAnimation(activePanel), (activePanel.hidden = !1), (activePanel.style.willChange = ""));
        else {
            previousPanel &&
                (this.#cancelAnimation(previousPanel),
                    (previousPanel.hidden = !0),
                    (previousPanel.style.willChange = "")),
                activePanel &&
                (this.#cancelAnimation(activePanel), (activePanel.hidden = !1), this.#animateIn(activePanel));
            for (let i = 0; i < panels.length; i++) {
                if (i === this._activeIndex) continue;
                const panel = panels[i];
                panel && (this.#cancelAnimation(panel), (panel.hidden = !0), (panel.style.willChange = ""));
            }
        }
        focus && tabs[this._activeIndex]?.focus();
    }
    #animateIn(panel) {
        const supportsWAAPI = typeof Element < "u" && "animate" in Element.prototype,
            prefersReduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
        if (!supportsWAAPI || prefersReduce) {
            panel.hidden = !1;
            return;
        }
        this.#cancelAnimation(panel), (panel.hidden = !1), (panel.style.willChange = "opacity, transform");
        const styles = getComputedStyle(this),
            translate = styles.getPropertyValue("--tabs-enter-translate").trim() || "12px",
            durationStr = styles.getPropertyValue("--tabs-enter-duration").trim(),
            duration = Number(durationStr) || 220,
            easing = styles.getPropertyValue("--ease-standard").trim() || "ease",
            anim = panel.animate(
                [
                    { opacity: 0, transform: `translateY(${translate})` },
                    { opacity: 1, transform: "translateY(0)" },
                ],
                { duration, easing }
            );
        this.#animations.set(panel, anim);
        const cleanup = () => {
            this.#animations.get(panel) === anim && (this.#animations.delete(panel), (panel.style.willChange = ""));
        };
        anim.addEventListener("finish", cleanup, { once: !0 }), anim.addEventListener("cancel", cleanup, { once: !0 });
    }
    #cancelAnimation(panel) {
        const anim = this.#animations.get(panel);
        anim && (anim.cancel(), this.#animations.delete(panel));
    }
    #ensureIdsAndAria() {
        const tabs = this.refs.tab,
            panels = this.refs.panel;
        if (!(!tabs?.length || !panels?.length))
            for (let i = 0; i < tabs.length; i++) {
                const tab = tabs[i],
                    panel = panels[i];
                if (!panel) continue;
                const tabId = tab.id || `${this.sectionId}-${this.tagName.toLowerCase()}-tab-${i}`,
                    panelId = panel.id || `${this.sectionId}-${this.tagName.toLowerCase()}-panel-${i}`;
                (tab.id = tabId),
                    (panel.id = panelId),
                    tab.setAttribute("role", "tab"),
                    panel.setAttribute("role", "tabpanel"),
                    tab.setAttribute("aria-controls", panelId),
                    panel.setAttribute("aria-labelledby", tabId);
            }
    }
    #clampIndex(index) {
        const tabs = this.refs.tab;
        if (!tabs?.length) return 0;
        const len = tabs.length;
        return ((index % len) + len) % len;
    }
    get sectionId() {
        const { sectionId } = this.dataset;
        if (!sectionId) throw new Error("Section id missing");
        return sectionId;
    }
}
customElements.get("tabs-component") || customElements.define("tabs-component", TabsComponent);
export class AccordionComponent extends Component {
    requiredRefs = ["item", "summary", "content"];
    #animations = new WeakMap();
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
                const { target } = e,
                    item = target.closest("details");
                if (item && item.open != !0) {
                    const summary = item.querySelector("summary"),
                        content = item.querySelector(".accordion__content");
                    this.toggleOpen({ willOpen: !0, item, summary, content });
                }
            },
            { signal }
        );
    }
    onSummaryClick(event) {
        event.preventDefault();
        const summary = event.target,
            summaries = this.refs.summary,
            items = this.refs.item,
            contents = this.refs.content;
        let idx = -1;
        Array.isArray(summaries) && (idx = summaries.indexOf(summary));
        let item, content;
        idx >= 0
            ? ((item = Array.isArray(items) ? items[idx] : items),
                (content = Array.isArray(contents) ? contents[idx] : contents))
            : ((item = summary.closest("details") ?? void 0), item && (content = this.#getContent(item))),
            !(!item || !content) && this.toggleOpen({ willOpen: !item.open, item, summary, content, shouldScroll: !0 });
    }
    toggleOpen(settings) {
        const { willOpen, item, summary, content, shouldScroll = !1 } = settings;
        if (willOpen)
            item.classList.add("is-open"),
                this.dataset.singleOpen === "true" && this.#closeOthers(item),
                (item.open = !0),
                item.querySelector("summary")?.setAttribute("aria-expanded", "true"),
                this.#animateOpen(content, shouldScroll ? () => this.#scrollIntoViewIfOut(summary) : void 0);
        else {
            if (this.#isAtLeastOneItemOpen()) {
                const { item: item2 } = this.refs;
                let numberItemOpened = 0;
                for (const detail of item2) detail.classList.contains("is-open") && numberItemOpened++;
                if (numberItemOpened <= 1) return;
            }
            item.classList.remove("is-open"), this.#animateClose(item, content);
        }
    }
    #isAtLeastOneItemOpen() {
        return this.dataset.atLeastOneItemOpen === "true";
    }
    #closeOthers(except) {
        const items = this.refs.item;
        for (const it of items) {
            if (it === except || !it.open) continue;
            it.classList.remove("is-open");
            const content = this.#getContent(it);
            content && this.#animateClose(it, content);
        }
    }
    #getContent(item) {
        const ref = this.refs.content;
        if (Array.isArray(ref)) {
            const found = ref.find((el) => item.contains(el));
            if (found) return found;
        } else if (ref instanceof HTMLElement && item.contains(ref)) return ref;
        const summary = item.querySelector("summary");
        if (!summary) return null;
        let node = summary.nextElementSibling;
        for (; node && node.tagName.toLowerCase() === "summary";) node = node.nextElementSibling;
        return node;
    }
    #animateOpen(content, onFinish) {
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
        if ((this.#cancel(content), (content.style.overflow = "hidden"), (content.hidden = !1), reduce)) {
            (content.style.height = ""),
                (content.style.opacity = ""),
                (content.style.overflow = ""),
                typeof onFinish == "function" && onFinish();
            return;
        }
        content.style.height = "0px";
        const duration = this.#duration(),
            easing = this.#easing(),
            start = () => {
                const inner = content.querySelector(".accordion__inner"),
                    target = inner instanceof HTMLElement ? inner.scrollHeight : content.scrollHeight,
                    anim = content.animate(
                        [
                            { height: "0px", opacity: 0 },
                            { height: `${target}px`, opacity: 1 },
                        ],
                        { duration, easing, fill: "forwards" }
                    );
                this.#animations.set(content, anim);
                const cleanup = () => {
                    this.#animations.get(content) === anim &&
                        (this.#animations.delete(content),
                            anim.cancel(),
                            (content.style.height = ""),
                            (content.style.opacity = ""),
                            (content.style.overflow = ""),
                            typeof onFinish == "function" && onFinish());
                };
                anim.addEventListener("finish", cleanup, { once: !0 }),
                    anim.addEventListener("cancel", cleanup, { once: !0 });
            };
        typeof requestAnimationFrame == "function" ? requestAnimationFrame(start) : start();
    }
    #animateClose(item, content) {
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
        this.#cancel(content);
        const heightFrom = content.getBoundingClientRect().height || content.scrollHeight;
        if (reduce) {
            item.open = !1;
            return;
        }
        (content.style.overflow = "hidden"), (content.style.height = `${heightFrom}px`);
        const duration = this.#duration(),
            easing = this.#easing(),
            start = () => {
                const anim = content.animate(
                    [
                        { height: `${heightFrom}px`, opacity: 1 },
                        { height: "0px", opacity: 0 },
                    ],
                    { duration, easing, fill: "forwards" }
                );
                this.#animations.set(content, anim);
                const cleanup = () => {
                    this.#animations.get(content) === anim &&
                        (this.#animations.delete(content),
                            anim.cancel(),
                            (item.open = !1),
                            item.querySelector("summary")?.setAttribute("aria-expanded", "false"),
                            (content.style.height = ""),
                            (content.style.opacity = ""),
                            (content.style.overflow = ""));
                };
                anim.addEventListener("finish", cleanup, { once: !0 }),
                    anim.addEventListener("cancel", cleanup, { once: !0 });
            };
        typeof requestAnimationFrame == "function" ? requestAnimationFrame(start) : start();
    }
    #cancel(content) {
        const a = this.#animations.get(content);
        a && (a.cancel(), this.#animations.delete(content));
    }
    #duration() {
        const d = getComputedStyle(this).getPropertyValue("--accordion-duration").trim();
        return Number(d) || 260;
    }
    #easing() {
        return getComputedStyle(this).getPropertyValue("--accordion-easing").trim() || "cubic-bezier(0.22, 1, 0.36, 1)";
    }
    #scrollIntoViewIfOut(el) {
        if (!el) return;
        const rect = el.getBoundingClientRect(),
            margin = 16,
            topVisible = rect.top >= margin,
            bottomVisible = rect.bottom <= window.innerHeight - margin;
        if (topVisible && bottomVisible) return;
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
            targetTop = Math.max(0, window.scrollY + rect.top - margin);
        window.scrollTo({ top: targetTop, behavior: reduce ? "auto" : "smooth" });
    }
    get sectionId() {
        const { sectionId } = this.dataset;
        return sectionId;
    }
}
customElements.get("accordion-component") || customElements.define("accordion-component", AccordionComponent);
class ResponsiveImage extends HTMLImageElement {
    #observer = null;
    #resizeObserver = null;
    #resizeRafId = null;
    #readyPromise = null;
    #resolveReady = null;
    #pollId = null;
    #cachedSizesConfig = null;
    #lastSrc = null;
    get ready() {
        return this.#readyPromise;
    }
    get isReady() {
        return this.classList.contains("loaded");
    }
    connectedCallback() {
        this.#init();
    }
    disconnectedCallback() {
        this.#cleanup();
    }
    updatedCallback() {
        const currentSrc = this.src || this.dataset.src;
        currentSrc !== this.#lastSrc &&
            ((this.#lastSrc = currentSrc),
                this.#cleanup(),
                this.classList.remove("loaded", "loading"),
                this.wrapper?.classList.remove("loaded", "loading", "error"),
                this.#init());
    }
    #init() {
        (this.wrapper = this.closest(".media")),
            (this.#lastSrc = this.src || this.dataset.src),
            (this.#readyPromise = new Promise((r) => (this.#resolveReady = r)));
        const isLiquid = this.dataset.mode === "liquid",
            isSafariOld = getSafariVersion()?.major < 16,
            wasAlreadyLoaded = this.classList.contains("loaded"),
            isComplete = this.complete && this.naturalWidth > 0;
        if (
            (this.classList.remove("loading", "loaded"),
                this.wrapper?.classList.remove("loading", "loaded", "error"),
                wasAlreadyLoaded || isComplete)
        ) {
            this.#markLoaded();
            return;
        }
        if (!isLiquid) {
            this.#applyFallbackSizes(), this.#setupLazyLoad();
            return;
        }
        if (isSafariOld && this.src) {
            const src = this.src,
                srcset = this.srcset;
            this.removeAttribute("src"),
                srcset && this.removeAttribute("srcset"),
                queueMicrotask(() => {
                    this.isConnected && (srcset && (this.srcset = srcset), (this.src = src), this.#waitForLoad(!0));
                });
        } else this.#waitForLoad(isSafariOld);
    }
    #waitForLoad(usePoll = !1) {
        this.classList.remove("loaded"),
            this.wrapper?.classList.remove("loaded", "error"),
            this.classList.add("loading"),
            this.wrapper?.classList.add("loading");
        const done = () => {
            this.removeEventListener("load", done),
                this.removeEventListener("error", done),
                this.#stopPoll(),
                this.#markLoaded();
        };
        this.addEventListener("load", done, { once: !0 }),
            this.addEventListener("error", done, { once: !0 }),
            usePoll &&
            ((this.#pollId = setInterval(() => {
                if (!this.isConnected) return this.#stopPoll();
                this.naturalWidth > 0 && done();
            }, 50)),
                setTimeout(() => {
                    this.#pollId && !this.isReady && (this.#stopPoll(), this.#markLoaded());
                }, 2e3));
    }
    #stopPoll() {
        this.#pollId && (clearInterval(this.#pollId), (this.#pollId = null));
    }
    #setupLazyLoad() {
        requestAnimationFrame(() => {
            this.isConnected && (this.#setSizesFromWrapper(), this.#observeResize());
        }),
            (this.#observer = imageCoordinator.registerLazyLoad(this, {
                onIntersect: () => {
                    this.#hydrateSources(), this.#hydrateImage(), this.#loadImage();
                },
            }));
    }
    #applyFallbackSizes() {
        if (this.sizes?.trim()) return;
        const defaultSizes = this.dataset.defaultSizes;
        if (defaultSizes?.trim()) {
            this.sizes = defaultSizes;
            return;
        }
        if (this.#getSizesConfig().unit === "vw") {
            this.sizes = "100vw";
            return;
        }
        const widthAttr = parseInt(this.getAttribute("width") || "0", 10);
        if (widthAttr > 0) {
            this.sizes = `${widthAttr}px`;
            return;
        }
        this.sizes = "100vw";
    }
    #getSizesConfig() {
        return this.#cachedSizesConfig
            ? this.#cachedSizesConfig
            : ((this.#cachedSizesConfig = {
                unit: (this.dataset.sizesUnit || "").toLowerCase(),
                mult: parseFloat(this.dataset.sizesMult || "1"),
                targetDpr: parseFloat(this.dataset.targetDpr || "0"),
                safety: parseFloat(this.dataset.sizesSafety || "1.0"),
            }),
                this.#cachedSizesConfig);
    }
    #calculateSizes(width) {
        if (width <= 0) return null;
        const config = this.#getSizesConfig();
        if (config.unit === "vw") {
            const vw = Math.max(1, window.innerWidth || width);
            return `${Math.max(1, Math.min(100, Math.round((width / vw) * 100)))}vw`;
        }
        let factor = isNaN(config.mult) ? 1 : config.mult;
        if (!isNaN(config.targetDpr) && config.targetDpr > 0) {
            const dpr = window.devicePixelRatio || 1;
            factor = (config.targetDpr / dpr) * (isNaN(config.safety) ? 1 : config.safety);
        }
        return `${Math.ceil(width * factor)}px`;
    }
    #setSizesFromWrapper() {
        const target = this.wrapper || this;
        if (!target) return;
        const w = target.offsetWidth;
        if (w > 0) {
            const sizes = this.#calculateSizes(w);
            sizes && (this.sizes = sizes);
        }
    }
    #observeResize() {
        const target = this.wrapper || this;
        target &&
            (this.#resizeObserver = imageCoordinator.registerResize(target, this, (width) => {
                const sizes = this.#calculateSizes(width);
                sizes && sizes !== this.sizes && (this.sizes = sizes);
            }));
    }
    #hydrateSources() {
        const picture = this.closest("picture");
        if (!picture) return;
        const sources = picture.querySelectorAll("source[data-srcset]:not([srcset])");
        for (const s of sources) s.srcset = s.dataset.srcset;
    }
    #hydrateImage() {
        !this.srcset && this.dataset.srcset && (this.srcset = this.dataset.srcset),
            !this.src && this.dataset.src && (this.src = this.dataset.src),
            (this._hydrated = !0);
    }
    #loadImage() {
        if (!this.classList.contains("loaded")) {
            if (this.complete && this.naturalWidth > 0) {
                this.#handleImageReady();
                return;
            }
            this.classList.remove("loaded"),
                this.wrapper?.classList.remove("loaded", "error"),
                this.classList.add("loading"),
                this.wrapper?.classList.add("loading"),
                this.addEventListener("load", this.#onLoad, { once: !0 }),
                this.addEventListener("error", this.#onError, { once: !0 });
        }
    }
    #onLoad = () => {
        this.#handleImageReady();
    };
    #onError = () => {
        this.#markError();
    };
    async #handleImageReady() {
        if (typeof this.decode == "function" && !this.src?.includes(".svg"))
            try {
                const timeout = isSafari() ? 150 : 100;
                await Promise.race([this.decode(), new Promise((r) => setTimeout(r, timeout))]);
            } catch { }
        this.#markLoaded();
    }
    #markLoaded() {
        this.classList.contains("loaded") ||
            (this.classList.remove("loading"),
                this.classList.add("loaded"),
                this.wrapper?.classList.remove("loading"),
                this.wrapper?.classList.add("loaded"),
                this.#resolveReady?.(),
                (this.#resolveReady = null),
                this.dispatchEvent(new CustomEvent("image:ready", { bubbles: !0, composed: !0, detail: { image: this } })));
    }
    #markError() {
        this.classList.remove("loading"),
            this.wrapper?.classList.remove("loading"),
            this.wrapper?.classList.add("error"),
            this.#resolveReady?.(),
            (this.#resolveReady = null);
    }
    #cleanup() {
        this.#stopPoll(),
            typeof this.#observer == "function" && this.#observer(),
            (this.#observer = null),
            typeof this.#resizeObserver == "function" && this.#resizeObserver(),
            (this.#resizeObserver = null),
            this.#resizeRafId && (cancelAnimationFrame(this.#resizeRafId), (this.#resizeRafId = null));
    }
}
customElements.get("responsive-image") || customElements.define("responsive-image", ResponsiveImage, { extends: "img" });
class DeferredMedia extends Component {
    isPlaying = !1;
    #abortController = new AbortController();
    #intersectionObserver = null;
    #isIntersecting = !1;
    #player = null;
    #isLoading = !1;
    #isPreloaded = !1;
    #mediaType = "";
    #originalVideoSrc = null;
    static get observedAttributes() {
        return ["data-media-loaded", "data-media-type", "data-autoplay"];
    }
    constructor() {
        super(), (this.#mediaType = this.getAttribute("data-media-type") || this.detectMediaType());
    }
    connectedCallback() {
        super.connectedCallback();
        const signal = this.#abortController.signal,
            mediaGallery = this.#getMediaGalleryParent();
        mediaGallery &&
            mediaGallery.addEventListener(
                ThemeEvents.mediaStartedPlaying,
                (event) => {
                    event.detail.resource !== this && this.pauseMedia();
                },
                { signal }
            ),
            document.addEventListener(
                ThemeEvents.mediaStartedPlaying,
                (event) => {
                    event.detail.resource !== this && !mediaGallery && this.pauseMedia();
                },
                { signal }
            ),
            window.addEventListener(DialogCloseEvent.eventName, this.pauseMedia.bind(this), { signal }),
            this.#setupIntersectionObserver(),
            this.#initializeFromExistingContent(),
            this.hasAttribute("data-autoplay") && this.#handleAutoplay();
    }
    disconnectedCallback() {
        super.disconnectedCallback(),
            this.#abortController.abort(),
            this.#cleanupIntersectionObserver(),
            this.#cleanupPlayer();
    }
    detectMediaType() {
        const template = this.querySelector("template");
        if (!template) return "";
        const content = template.content.firstElementChild;
        if (!content) return "";
        if (content.tagName === "VIDEO") return "video";
        if (content.tagName === "IFRAME") {
            const src = content.src || content.dataset.src;
            return src?.includes("youtube") ? "youtube" : src?.includes("vimeo") ? "vimeo" : "iframe";
        }
        return content.tagName === "MODEL-VIEWER" ? "model" : "unknown";
    }
    #getMediaGalleryParent() {
        return this.closest("media-gallery");
    }
    #pauseOtherMediaInGallery() {
        const mediaGallery = this.#getMediaGalleryParent();
        if (!mediaGallery) return;
        mediaGallery.querySelectorAll("deferred-media").forEach((media) => {
            media !== this && media.isPlaying && media.pauseMedia();
        });
    }
    #dispatchMediaStartedEvent() {
        const mediaGallery = this.#getMediaGalleryParent(),
            event = new MediaStartedPlayingEvent(this);
        mediaGallery ? mediaGallery.dispatchEvent(event) : this.dispatchEvent(event);
    }
    #setupIntersectionObserver() {
        "IntersectionObserver" in window &&
            ((this.#intersectionObserver = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        this.#isIntersecting = entry.isIntersecting;
                        const isLoaded = this.getAttribute("data-media-loaded");
                        entry.isIntersecting
                            ? this.hasAttribute("data-autoplay") && !this.hasAttribute("data-autoplay-blocked")
                                ? isLoaded
                                    ? this.playMedia()
                                    : this.showDeferredMedia()
                                : isLoaded || this.#preloadContent()
                            : this.pauseMedia();
                    });
                },
                { rootMargin: "0px", threshold: 0.1 }
            )),
                this.#intersectionObserver.observe(this));
    }
    #cleanupIntersectionObserver() {
        this.#intersectionObserver && (this.#intersectionObserver.disconnect(), (this.#intersectionObserver = null));
    }
    #handleAutoplay() {
        if (this.#mediaType !== "video") return;
        if (!this.#checkAutoplaySupport()) {
            this.setAttribute("data-autoplay-blocked", "");
            return;
        }
    }
    #checkAutoplaySupport() {
        return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    async #preloadContent() {
        if (!(this.#isLoading || this.#isPreloaded || this.getAttribute("data-media-loaded"))) {
            (this.#isLoading = !0), this.setAttribute("data-loading", "");
            try {
                switch (this.#mediaType || this.detectMediaType()) {
                    case "youtube":
                        await this.#loadYouTubeAPI();
                        break;
                    case "vimeo":
                        await this.#loadVimeoAPI();
                        break;
                    case "model":
                        window.Shopify?.loadFeatures &&
                            (await new Promise((resolve) =>
                                Shopify.loadFeatures([
                                    { name: "model-viewer-ui", version: "1.0", onLoad: () => resolve() },
                                ])
                            ));
                        break;
                    default:
                        break;
                }
                this.#isPreloaded = !0;
            } catch (error) {
                console.error("Failed to preload resources:", error), this.setAttribute("data-error", "");
            } finally {
                this.removeAttribute("data-loading"), (this.#isLoading = !1);
            }
        }
    }
    updatePlayPauseHint(isPlaying) {
        const toggleMediaButton = this.refs.toggleMediaButton;
        if (toggleMediaButton instanceof HTMLElement) {
            toggleMediaButton.classList.remove("hidden");
            const playIcon = toggleMediaButton.querySelector(".icon-play");
            playIcon && playIcon.classList.toggle("hidden", isPlaying);
            const pauseIcon = toggleMediaButton.querySelector(".icon-pause");
            pauseIcon && pauseIcon.classList.toggle("hidden", !isPlaying);
        }
    }
    #isCarouselDragging() {
        const carousel = this.closest("carousel-slider");
        if (!carousel) return !1;
        const swiper = carousel.swiperInstance;
        return !swiper || swiper.destroyed
            ? !1
            : swiper.touching === !0 ||
            (swiper.touchEventsData && swiper.touchEventsData.isTouched === !0) ||
            swiper.animating === !0;
    }
    showDeferredMedia = async () => {
        if (!this.#isLoading && !(this.#isCarouselDragging() && !this.hasAttribute("data-autoplay")))
            try {
                this.setAttribute("data-loading", ""),
                    await this.loadContent(!1),
                    (this.hasAttribute("data-disable-controls") || this.hasAttribute("data-autoplay")) &&
                    (await this.playMedia()),
                    this.dispatchEvent(new CustomEvent("deferred-media:play", { bubbles: !0 }));
            } catch (error) {
                console.error("Failed to show deferred media:", error), this.handleError(error);
            }
    };
    async loadContent(focus = !0) {
        if (this.getAttribute("data-media-loaded")) return;
        this.#pauseOtherMediaInGallery(), this.#dispatchMediaStartedEvent();
        const template = this.querySelector("template");
        if (!template) throw new Error("No template content found");
        const content = template.content.firstElementChild?.cloneNode(!0);
        if (!content) throw new Error("No content found in template");
        return (
            this.setAttribute("data-media-loaded", "true"),
            this.appendChild(content),
            focus &&
            content instanceof HTMLElement &&
            (!content.hasAttribute("tabindex") && content.tabIndex < 0 && (content.tabIndex = -1), content.focus()),
            this.refs.deferredMediaPlayButton?.classList.add("deferred-media__playing"),
            this.refs.deferredMediaPlayButton?.setAttribute("tabindex", "-1"),
            await this.#initializePlayer(content),
            content
        );
    }
    async #initializePlayer(content) {
        switch (this.#mediaType) {
            case "video":
                await this.#initializeVideoPlayer(content);
                break;
            case "youtube":
                await this.#initializeYouTubePlayer(content);
                break;
            case "vimeo":
                await this.#initializeVimeoPlayer(content);
                break;
            default:
                break;
        }
    }
    #initializeFromExistingContent() {
        if (!this.hasAttribute("data-media-loaded") || this.#player) return;
        let content = null;
        for (const child of this.children)
            if (
                !(child.tagName === "TEMPLATE" || child.tagName === "BUTTON") &&
                (child.tagName === "VIDEO" || child.tagName === "IFRAME" || child.tagName === "MODEL-VIEWER")
            ) {
                content = child;
                break;
            }
        if (content) {
            if (!this.#mediaType || this.#mediaType === "unknown")
                if (content.tagName === "VIDEO") this.#mediaType = "video";
                else if (content.tagName === "IFRAME") {
                    const src = content.src;
                    src?.includes("youtube")
                        ? (this.#mediaType = "youtube")
                        : src?.includes("vimeo")
                            ? (this.#mediaType = "vimeo")
                            : (this.#mediaType = "iframe");
                } else content.tagName === "MODEL-VIEWER" && (this.#mediaType = "model");
            this.#initializePlayer(content), this.removeAttribute("data-loading");
        }
    }
    async updateVolumeButton(player) {
        const { toggleVolumeButton } = this.refs;
        if (!toggleVolumeButton) return;
        const muteIcon = toggleVolumeButton.querySelector(".icon-mute"),
            unMuteIcon = toggleVolumeButton.querySelector(".icon-unmute");
        let isMuted = !1;
        if (player instanceof HTMLVideoElement) isMuted = player.muted;
        else if (player && typeof player == "object" && "muted" in player) isMuted = player.muted;
        else if (this.#mediaType === "youtube" && this.#player)
            try {
                isMuted = await this.#player.isMuted?.();
            } catch (error) {
                console.warn("Failed to get YouTube muted state:", error), (isMuted = !1);
            }
        else if (this.#mediaType === "vimeo" && this.#player)
            try {
                isMuted = await this.#player.getMuted?.();
            } catch (error) {
                console.warn("Failed to get Vimeo muted state:", error), (isMuted = !1);
            }
        muteIcon && muteIcon.classList.toggle("hidden", !isMuted),
            unMuteIcon && unMuteIcon.classList.toggle("hidden", isMuted);
    }
    async #initializeVideoPlayer(videoElement) {
        if (!(videoElement instanceof HTMLVideoElement)) return;
        const video = videoElement,
            { toggleVolumeButton } = this.refs;
        if (
            (toggleVolumeButton &&
                (await this.updateVolumeButton(video),
                    toggleVolumeButton.addEventListener(
                        "click",
                        async () => {
                            (video.muted = !video.muted), await this.updateVolumeButton(video);
                        },
                        { signal: this.#abortController.signal }
                    )),
                video.addEventListener("play", () => {
                    (this.isPlaying = !0),
                        this.setAttribute("data-playing", ""),
                        this.updatePlayPauseHint(!0),
                        this.removeAttribute("data-suspended"),
                        setTimeout(() => {
                            this.removeAttribute("data-loading");
                        }, 2e3);
                }),
                video.addEventListener("pause", () => {
                    (this.isPlaying = !1), this.removeAttribute("data-playing"), this.updatePlayPauseHint(!1);
                }),
                video.addEventListener("ended", () => {
                    (this.isPlaying = !1), this.removeAttribute("data-playing"), this.updatePlayPauseHint(!1);
                }),
                video.addEventListener("error", (error) => {
                    this.handleError(error);
                }),
                video.hasAttribute("autoplay"))
        )
            try {
                await video.play();
            } catch (error) {
                if (error.name === "NotAllowedError") {
                    this.setAttribute("data-suspended", ""),
                        this.setAttribute("data-autoplay-blocked", ""),
                        (video.controls = !0);
                    const replacementImageSrc = video.previousElementSibling?.currentSrc;
                    replacementImageSrc && (video.poster = replacementImageSrc);
                }
            }
        (this.#player = video), (this.#originalVideoSrc = video.src || video.currentSrc);
    }
    async #initializeYouTubePlayer(iframeElement) {
        if (!(iframeElement instanceof HTMLIFrameElement)) return;
        (!window.YT || !window.YT.Player) && (await this.#loadYouTubeAPI());
        const player = new YT.Player(iframeElement, {
            events: {
                onReady: async () => {
                    if (
                        ((this.#player = player),
                            await this.#setupYouTubeVolumeButton(),
                            this.hasAttribute("data-autoplay") &&
                            !this.hasAttribute("data-autoplay-blocked") &&
                            this.#isIntersecting)
                    )
                        try {
                            this.#player.playVideo?.();
                        } catch { }
                },
                onStateChange: (event) => {
                    event.data === YT.PlayerState.PLAYING
                        ? ((this.isPlaying = !0),
                            this.setAttribute("data-playing", ""),
                            this.updatePlayPauseHint(!0),
                            this.removeAttribute("data-loading"))
                        : (event.data === YT.PlayerState.ENDED || event.data === YT.PlayerState.PAUSED) &&
                        ((this.isPlaying = !1), this.removeAttribute("data-playing"), this.updatePlayPauseHint(!1));
                },
                onError: (error) => {
                    this.handleError(error);
                },
            },
        });
    }
    async #initializeVimeoPlayer(iframeElement) {
        if (!(iframeElement instanceof HTMLIFrameElement)) return;
        (!window.Vimeo || !window.Vimeo.Player) && (await this.#loadVimeoAPI());
        const player = new Vimeo.Player(iframeElement);
        player.on("loaded", async () => {
            if (
                ((this.#player = player),
                    await this.#setupVimeoVolumeButton(),
                    this.hasAttribute("data-autoplay") &&
                    !this.hasAttribute("data-autoplay-blocked") &&
                    this.#isIntersecting)
            )
                try {
                    await this.#player.play?.();
                } catch { }
        }),
            player.on("play", () => {
                (this.isPlaying = !0),
                    this.setAttribute("data-playing", ""),
                    this.updatePlayPauseHint(!0),
                    this.removeAttribute("data-loading");
            }),
            player.on("pause", () => {
                (this.isPlaying = !1), this.removeAttribute("data-playing"), this.updatePlayPauseHint(!1);
            }),
            player.on("ended", () => {
                (this.isPlaying = !1), this.removeAttribute("data-playing"), this.updatePlayPauseHint(!1);
            }),
            player.on("error", (error) => {
                this.handleError(error);
            }),
            (this.#player = player);
    }
    async #loadYouTubeAPI() {
        return new Promise((resolve, reject) => {
            if (window.YT && window.YT.Player) {
                resolve();
                return;
            }
            const pendingKey = "__ytApiPending__";
            if (window[pendingKey]) {
                window[pendingKey].then(resolve, reject);
                return;
            }
            const p = new Promise((res, rej) => {
                const previous = window.onYouTubeIframeAPIReady;
                window.onYouTubeIframeAPIReady = () => {
                    typeof previous == "function" && previous(), res();
                };
                const script = document.createElement("script");
                (script.src = "https://www.youtube.com/iframe_api"),
                    (script.onload = () => { }),
                    (script.onerror = rej),
                    document.head.appendChild(script);
            });
            (window[pendingKey] = p.finally(() => {
                delete window[pendingKey];
            })),
                window[pendingKey].then(resolve, reject);
        });
    }
    async #loadVimeoAPI() {
        return new Promise((resolve, reject) => {
            if (window.Vimeo && window.Vimeo.Player) {
                resolve();
                return;
            }
            const script = document.createElement("script");
            (script.src = "https://player.vimeo.com/api/player.js"),
                (script.onload = resolve),
                (script.onerror = reject),
                document.head.appendChild(script);
        });
    }
    async #setupYouTubeVolumeButton() {
        const { toggleVolumeButton } = this.refs;
        !toggleVolumeButton ||
            !this.#player ||
            (await this.updateVolumeButton(this.#player),
                toggleVolumeButton.addEventListener(
                    "click",
                    async () => {
                        try {
                            const isMuted = await this.#player.isMuted?.(),
                                newMutedState = !isMuted;
                            isMuted ? this.#player.unMute?.() : this.#player.mute?.(),
                                await this.updateVolumeButton({ muted: newMutedState }),
                                setTimeout(async () => {
                                    await this.updateVolumeButton(this.#player);
                                }, 150);
                        } catch (error) {
                            console.warn("Failed to toggle YouTube volume:", error);
                        }
                    },
                    { signal: this.#abortController.signal }
                ));
    }
    async #setupVimeoVolumeButton() {
        const { toggleVolumeButton } = this.refs;
        !toggleVolumeButton ||
            !this.#player ||
            (await this.updateVolumeButton(this.#player),
                toggleVolumeButton.addEventListener(
                    "click",
                    async () => {
                        try {
                            const newMutedState = !(await this.#player.getMuted?.());
                            await this.#player.setMuted?.(newMutedState),
                                await this.updateVolumeButton({ muted: newMutedState }),
                                setTimeout(async () => {
                                    await this.updateVolumeButton(this.#player);
                                }, 150);
                        } catch (error) {
                            console.warn("Failed to toggle Vimeo volume:", error);
                        }
                    },
                    { signal: this.#abortController.signal }
                ));
    }
    toggleMedia() {
        if (!this.#isCarouselDragging()) {
            if (!this.getAttribute("data-media-loaded")) {
                this.showDeferredMedia();
                return;
            }
            this.isPlaying ? this.pauseMedia() : this.playMedia();
        }
    }
    #hasVideoSrcChanged(currentSrc) {
        return !currentSrc || !this.#originalVideoSrc ? !1 : currentSrc !== this.#originalVideoSrc;
    }
    #isVideoSrcCorrupted(src) {
        if (!src) return !1;
        try {
            const url = new URL(src);
            if (url.searchParams.has("variant") || url.searchParams.has("section_id")) return !0;
            const path = url.pathname.toLowerCase();
            return url.hostname.includes("cdn") || /\.(mp4|webm|ogg|avi|mov)/.test(path)
                ? !1
                : /\/(products|collections|pages|blogs)\//.test(path);
        } catch {
            return !1;
        }
    }
    #recoverVideoSrc(videoElement) {
        const bestSrc = this.#getBestVideoSrc(videoElement);
        return bestSrc && videoElement.src !== bestSrc ? ((videoElement.src = bestSrc), videoElement.load(), !0) : !1;
    }
    #getBestVideoSrc(videoElement) {
        if (
            (this.#originalVideoSrc &&
                this.#isVideoSrcCorrupted(this.#originalVideoSrc) &&
                (this.#originalVideoSrc = null),
                this.#originalVideoSrc)
        )
            return this.#originalVideoSrc;
        if (videoElement.currentSrc && !this.#isVideoSrcCorrupted(videoElement.currentSrc))
            return (
                this.#originalVideoSrc || (this.#originalVideoSrc = videoElement.currentSrc), videoElement.currentSrc
            );
        const template = this.querySelector("template");
        if (template) {
            const templateVideo = template.content.querySelector("video");
            if (templateVideo && (templateVideo.src || templateVideo.currentSrc)) {
                const templateSrc = templateVideo.src || templateVideo.currentSrc;
                return (
                    !this.#originalVideoSrc &&
                    !this.#isVideoSrcCorrupted(templateSrc) &&
                    (this.#originalVideoSrc = templateSrc),
                    templateSrc
                );
            }
        }
        return null;
    }
    async playMedia() {
        if (!this.#isLoading) {
            if (!this.getAttribute("data-media-loaded")) {
                this.showDeferredMedia();
                return;
            }
            this.#pauseOtherMediaInGallery(), this.#dispatchMediaStartedEvent();
            try {
                switch (this.#mediaType) {
                    case "video":
                        if (this.#player instanceof HTMLVideoElement)
                            (this.#hasVideoSrcChanged(this.#player.src) ||
                                this.#isVideoSrcCorrupted(this.#player.src)) &&
                                (this.#recoverVideoSrc(this.#player) || this.#player.removeAttribute("src")),
                                await this.#player.play();
                        else {
                            const existingVideo = this.querySelector("video");
                            existingVideo &&
                                (this.#recoverVideoSrc(existingVideo),
                                    await this.#initializeVideoPlayer(existingVideo),
                                    this.#player && (await this.#player.play()));
                        }
                        break;
                    case "youtube":
                        this.#player && this.#player.playVideo && this.#player.playVideo();
                        break;
                    case "vimeo":
                        this.#player && this.#player.play && (await this.#player.play());
                        break;
                    default:
                        break;
                }
                (this.isPlaying = !0), this.updatePlayPauseHint(this.isPlaying);
            } catch (error) {
                console.error("Failed to play media:", error), this.handleError(error);
            }
        }
    }
    attributeChangedCallback(name, oldValue, newValue) {
        name === "data-media-type" && (this.#mediaType = this.getAttribute("data-media-type") || this.#mediaType),
            name === "data-autoplay" &&
            this.isConnected &&
            this.#isIntersecting &&
            this.getAttribute("data-media-loaded") &&
            !this.hasAttribute("data-autoplay-blocked") &&
            (this.#pauseOtherMediaInGallery(), this.#dispatchMediaStartedEvent(), this.playMedia());
    }
    pauseMedia() {
        try {
            switch (this.#mediaType) {
                case "video":
                    this.#player instanceof HTMLVideoElement && this.#player.pause();
                    break;
                case "youtube":
                    this.#player && this.#player.pauseVideo && this.#player.pauseVideo();
                    break;
                case "vimeo":
                    this.#player && this.#player.pause && this.#player.pause();
                    break;
                default:
                    break;
            }
            (this.isPlaying = !1), this.updatePlayPauseHint(this.isPlaying);
        } catch (error) {
            console.error("Failed to pause media:", error);
        }
    }
    handleError(error) {
        const errorType = error?.name || error?.constructor?.name || "Unknown",
            errorMessage = error?.message || "Media playback issue";
        this.#shouldLogError(error) &&
            console.warn(`Media ${errorType}: ${errorMessage}`, {
                mediaType: this.#mediaType,
                hasPlayer: !!this.#player,
                isPlaying: this.isPlaying,
            }),
            this.setAttribute("data-error", ""),
            this.removeAttribute("data-loading"),
            this.dispatchEvent(new CustomEvent("deferred-media:error", { bubbles: !0, detail: { error } }));
    }
    #shouldLogError(error) {
        const errorName = error?.name || "",
            errorMessage = error?.message || "",
            expectedErrors = ["AbortError", "NotAllowedError"];
        return !(
            (error instanceof Event && error.type === "error") ||
            expectedErrors.includes(errorName) ||
            errorMessage.includes("interrupted by a new load request")
        );
    }
    #cleanupPlayer() {
        this.#player &&
            (this.#player instanceof HTMLVideoElement
                ? (this.#player.pause(), (this.#player.src = ""), this.#player.load())
                : this.#player && typeof this.#player.destroy == "function" && this.#player.destroy(),
                (this.#player = null));
    }
    getPlayerState() {
        return {
            isPlaying: this.isPlaying,
            isLoading: this.#isLoading,
            mediaType: this.#mediaType,
            hasError: this.hasAttribute("data-error"),
            isLoaded: this.hasAttribute("data-media-loaded"),
        };
    }
}
customElements.get("deferred-media") || customElements.define("deferred-media", DeferredMedia);
class ProductModel extends DeferredMedia {
    #abortController = new AbortController();
    modelViewerUI = null;
    #originalModelViewerPlay = null;
    #originalModelViewerPause = null;
    async loadContent(focus = !0) {
        const content = await super.loadContent(focus);
        return (
            window.Shopify?.loadFeatures &&
            Shopify.loadFeatures([
                { name: "model-viewer-ui", version: "1.0", onLoad: this.setupModelViewerUI.bind(this) },
            ]),
            content
        );
    }
    disconnectedCallback() {
        super.disconnectedCallback(),
            this.#abortController.abort(),
            this.modelViewerUI &&
            typeof this.modelViewerUI.destroy == "function" &&
            (this.modelViewerUI.destroy(), (this.modelViewerUI = null)),
            (this.#originalModelViewerPlay = null),
            (this.#originalModelViewerPause = null);
    }
    pauseMedia() {
        if ((super.pauseMedia(), typeof this.#originalModelViewerPause == "function" && this.modelViewerUI))
            try {
                typeof this.modelViewerUI.pause == "function" && this.#originalModelViewerPause();
            } catch (error) {
                !error.message?.includes("is not a function") &&
                    !error.message?.includes("destroyed") &&
                    console.warn("Failed to call original pause method:", error);
            }
        else if (this.modelViewerUI && typeof this.modelViewerUI.pause == "function" && !this.#originalModelViewerPause)
            try {
                this.modelViewerUI.pause();
            } catch (error) {
                !error.message?.includes("is not a function") &&
                    !error.message?.includes("destroyed") &&
                    console.warn("Failed to pause model viewer:", error);
            }
        this.setAttribute("data-playing", "false"),
            (this.closest(".shopify-section") || document).dispatchEvent(new ModelInteractionEvent(this, !1));
    }
    async playMedia() {
        if ((await super.playMedia(), typeof this.#originalModelViewerPlay == "function" && this.modelViewerUI))
            try {
                typeof this.modelViewerUI.play == "function" && this.#originalModelViewerPlay();
            } catch (error) {
                !error.message?.includes("is not a function") &&
                    !error.message?.includes("destroyed") &&
                    console.warn("Failed to call original play method:", error);
            }
        else if (this.modelViewerUI && typeof this.modelViewerUI.play == "function" && !this.#originalModelViewerPlay)
            try {
                this.modelViewerUI.play();
            } catch (error) {
                !error.message?.includes("is not a function") &&
                    !error.message?.includes("destroyed") &&
                    console.warn("Failed to play model viewer:", error);
            }
        this.setAttribute("data-playing", "true"),
            (this.closest(".shopify-section") || document).dispatchEvent(new ModelInteractionEvent(this, !0));
    }
    async setupModelViewerUI(errors) {
        if (errors) {
            console.error("Model viewer UI load errors:", errors);
            return;
        }
        if ((Shopify.ModelViewerUI || (await this.#waitForModelViewerUI()), !Shopify.ModelViewerUI)) {
            console.warn("Shopify.ModelViewerUI not available after waiting");
            return;
        }
        const element = this.querySelector("model-viewer");
        if (!element) {
            console.warn("No model-viewer element found");
            return;
        }
        const signal = this.#abortController.signal;
        try {
            if (((this.modelViewerUI = new Shopify.ModelViewerUI(element)), !this.modelViewerUI)) {
                console.warn("Failed to create ModelViewerUI instance");
                return;
            }
            this.modelViewerUI.play &&
                ((this.#originalModelViewerPlay = this.modelViewerUI.play.bind(this.modelViewerUI)),
                    (this.modelViewerUI.play = () => {
                        this.playMedia();
                    })),
                this.modelViewerUI.pause &&
                ((this.#originalModelViewerPause = this.modelViewerUI.pause.bind(this.modelViewerUI)),
                    (this.modelViewerUI.pause = () => {
                        this.pauseMedia();
                    })),
                this.playMedia(),
                this.#setupModelInteractions(element, signal);
        } catch (error) {
            console.error("Error setting up model viewer UI:", error), this.handleError(error);
        }
    }
    #setupModelInteractions(element, signal) {
        let pointerStartX = 0,
            pointerStartY = 0;
        element.addEventListener(
            "pointerdown",
            (event) => {
                (pointerStartX = event.clientX), (pointerStartY = event.clientY);
            },
            { signal }
        ),
            element.addEventListener(
                "click",
                (event) => {
                    const distanceX = Math.abs(event.clientX - pointerStartX),
                        distanceY = Math.abs(event.clientY - pointerStartY);
                    Math.sqrt(distanceX * distanceX + distanceY * distanceY) < 10 &&
                        (this.getAttribute("data-playing") === "true" ? this.pauseMedia() : this.playMedia());
                },
                { signal }
            );
    }
    async #waitForModelViewerUI() {
        for (let i = 0; i < 10; i++) {
            if (Shopify.ModelViewerUI) return;
            await new Promise((resolve) => setTimeout(resolve, 50));
        }
    }
    getPlayerState() {
        return {
            ...super.getPlayerState(),
            hasModelViewerUI: !!this.modelViewerUI,
            modelViewerReady: !!this.modelViewerUI && !!this.querySelector("model-viewer"),
        };
    }
}
customElements.get("product-model") || customElements.define("product-model", ProductModel);
