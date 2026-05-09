class MediaCoordinator {
    constructor() {
        this.intersectionObserver = null;
        this.resizeObserver = null;

        this.elements = new Map();
        this.resizeElements = new Set();
        this.resizeRAFs = new Map();

        this.config = {
            lazyLoadMargin: "0px 0px -5%",
            lazyLoadThreshold: 0.01,
            resizeThrottle: 16,
        };
    }

    init() {
        if (this.intersectionObserver && this.resizeObserver) return;

        if (
            !this.intersectionObserver &&
            typeof window !== "undefined" &&
            "IntersectionObserver" in window
        ) {
            this.intersectionObserver = new IntersectionObserver(
                (entries) => this.handleIntersections(entries),
                {
                    rootMargin: this.config.lazyLoadMargin,
                    threshold: this.config.lazyLoadThreshold,
                }
            );
        }

        if (!this.resizeObserver && typeof window !== "undefined" && "ResizeObserver" in window) {
            this.resizeObserver = new ResizeObserver((entries) => this.handleResize(entries));
        } else if (!this.resizeObserver) {
            this.setupResizeFallback();
        }
    }

    registerLazyLoad(element, options = {}) {
        this.intersectionObserver || this.init();

        return this.intersectionObserver
            ? (this.elements.set(element, {
                  mode: "lazy",
                  onIntersect: options.onIntersect,
              }),
              this.intersectionObserver.observe(element),
              () => this.unregisterLazyLoad(element))
            : (options.onIntersect?.(), () => {});
    }

    registerResize(target, image, callback) {
        this.resizeObserver || this.init();

        return this.resizeObserver
            ? (this.elements.set(image, {
                  ...this.elements.get(image),
                  resizeTarget: target,
                  onResize: callback,
                  lastWidth: 0,
              }),
              this.resizeElements.add(image),
              this.resizeObserver.observe(target),
              () => this.unregisterResize(target, image))
            : (callback(target.offsetWidth || 0), () => {});
    }

    unregisterLazyLoad(element) {
        this.intersectionObserver && this.intersectionObserver.unobserve(element);

        const data = this.elements.get(element);
        if (data && data.mode === "lazy") {
            this.elements.delete(element);
        }
    }

    unregisterResize(target, image) {
        this.resizeObserver && this.resizeObserver.unobserve(target);

        this.resizeElements.delete(image);

        const rafId = this.resizeRAFs.get(image);
        if (rafId) {
            cancelAnimationFrame(rafId);
            this.resizeRAFs.delete(image);
        }

        const data = this.elements.get(image);

        if (data && !data.mode) {
            this.elements.delete(image);
        } else if (data) {
            delete data.resizeTarget;
            delete data.onResize;
            delete data.lastWidth;
        }
    }

    handleIntersections(entries) {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            const element = entry.target;
            const data = this.elements.get(element);

            if (!data || data.mode !== "lazy") return;

            this.intersectionObserver.unobserve(element);

            try {
                data.onIntersect?.();
            } catch (error) {
                console.error("[MediaCoordinator] Intersection callback error:", error);
            }

            this.elements.delete(element);
        });
    }

    handleResize(entries) {
        entries.forEach((entry) => {
            const target = entry.target;

            for (const [image, data] of this.elements.entries()) {
                if (data.resizeTarget !== target || this.resizeRAFs.has(image)) continue;

                const rafId = requestAnimationFrame(() => {
                    this.resizeRAFs.delete(image);

                    const width = Math.ceil(entry.contentRect.width || 0);
                    const lastWidth = data.lastWidth || 0;

                    if (Math.abs(width - lastWidth) < 1) return;

                    data.lastWidth = width;

                    try {
                        data.onResize?.(width);
                    } catch (error) {
                        console.error("[MediaCoordinator] Resize callback error:", error);
                    }
                });

                this.resizeRAFs.set(image, rafId);
            }
        });
    }

    setupResizeFallback() {
        let timeout;

        const handleWindowResize = () => {
            clearTimeout(timeout);

            timeout = setTimeout(() => {
                for (const [image, data] of this.elements.entries()) {
                    if (!data.resizeTarget || !data.onResize) continue;

                    const width = data.resizeTarget.offsetWidth || 0;
                    const lastWidth = data.lastWidth || 0;

                    if (Math.abs(width - lastWidth) < 1) continue;

                    data.lastWidth = width;

                    try {
                        data.onResize(width);
                    } catch (error) {
                        console.error("[MediaCoordinator] Resize fallback error:", error);
                    }
                }
            }, 100);
        };

        window.addEventListener("resize", handleWindowResize);
    }

    getStats() {
        let lazyCount = 0;
        let resizeCount = 0;

        for (const data of this.elements.values()) {
            if (data.mode === "lazy") lazyCount++;
            if (data.resizeTarget) resizeCount++;
        }

        return {
            total: this.elements.size,
            lazy: lazyCount,
            resize: resizeCount,
            observers: {
                intersectionObserver: this.intersectionObserver ? "initialized" : "not initialized",
                resizeObserver: this.resizeObserver ? "initialized" : "fallback",
            },
            pendingRAFs: this.resizeRAFs.size,
        };
    }

    destroy() {
        this.intersectionObserver && (this.intersectionObserver.disconnect(), (this.intersectionObserver = null));
        this.resizeObserver && (this.resizeObserver.disconnect(), (this.resizeObserver = null));

        for (const rafId of this.resizeRAFs.values()) {
            cancelAnimationFrame(rafId);
        }

        this.elements.clear();
        this.resizeElements.clear();
        this.resizeRAFs.clear();
    }
}

export const mediaCoordinator = new MediaCoordinator();

if (typeof window !== "undefined") {
    window.__THEME__ = window.__THEME__ || {};
    window.__THEME__.mediaCoordinator = mediaCoordinator;
}