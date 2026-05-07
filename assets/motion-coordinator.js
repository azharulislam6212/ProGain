import { gsap } from "@theme/gsap";

export class MotionCoordinator {
    constructor() {
        this.observer = null;
        this.queue = new Map();
        this.active = new Set();
        this.completed = new Set();

        this.config = {
            maxActiveAnimations: 25,
            maxZoomAnimations: 12,
            maxPerSection: 8,
            threshold: 0.15,
            rootMargin: "50px",
        };
    }

    init() {
        if (this.observer) return;

        this.observer = new IntersectionObserver(
            (entries) => this.handleIntersections(entries),
            {
                threshold: this.config.threshold,
                rootMargin: this.config.rootMargin,
            }
        );
    }

    registerElement(element, options = {}) {
        this.init();

        if (this.completed.has(element)) return () => {};

        const type =
            options.type || element.dataset?.motion || "fade-up";

        this.queue.set(element, {
            type,
            vars: options.vars || {},
            timeline: options.timeline || null,
        });

        this.observer.observe(element);

        return () => this.unregister(element);
    }

    unregister(element) {
        this.observer?.unobserve(element);
        this.queue.delete(element);
        this.active.delete(element);
    }

    handleIntersections(entries) {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            const el = entry.target;
            const data = this.queue.get(el);

            if (!data) return;

            if (this.canActivate(el, data.type)) {
                this.activate(el, data);
            }
        });
    }

    canActivate(element, type) {
        if (this.active.size >= this.config.maxActiveAnimations) {
            return false;
        }

        const isZoom =
            type === "zoom-in" || type === "zoom-out";

        if (isZoom) {
            const zoomCount = [...this.active].filter((el) => {
                const d = this.queue.get(el);
                return d && (d.type === "zoom-in" || d.type === "zoom-out");
            }).length;

            if (zoomCount >= this.config.maxZoomAnimations) {
                return false;
            }
        }

        const section = element.closest("section, [class*='section']");

        if (section) {
            const count = [...this.active].filter((el) =>
                section.contains(el)
            ).length;

            if (count >= this.config.maxPerSection) {
                return false;
            }
        }

        return true;
    }

    async activate(element, data) {
        this.active.add(element);
        this.observer.unobserve(element);

        try {
            await this.runGSAP(element, data);
        } catch (err) {
            console.error("[MotionCoordinator GSAP]", err);
        } finally {
            this.active.delete(element);
            this.queue.delete(element);
            this.completed.add(element);
        }
    }

    runGSAP(element, data) {
        const { type, vars } = data;

        const base = { opacity: 1, x: 0, y: 0, scale: 1 };

        // PRESET animations
        switch (type) {
            case "fade-up":
                gsap.set(element, { opacity: 0, y: 40 });
                return gsap.to(element, {
                    ...base,
                    y: 0,
                    duration: 1.2,
                    ease: "power3.out",
                    ...vars,
                });

            case "fade-in":
                gsap.set(element, { opacity: 0 });
                return gsap.to(element, {
                    opacity: 1,
                    duration: 1,
                    ease: "power2.out",
                    ...vars,
                });

            case "slide-left":
                gsap.set(element, { opacity: 0, x: -50 });
                return gsap.to(element, {
                    x: 0,
                    opacity: 1,
                    duration: 1.2,
                    ease: "power3.out",
                    ...vars,
                });

            case "slide-right":
                gsap.set(element, { opacity: 0, x: 50 });
                return gsap.to(element, {
                    x: 0,
                    opacity: 1,
                    duration: 1.2,
                    ease: "power3.out",
                    ...vars,
                });

            case "zoom-in":
                gsap.set(element, { opacity: 0, scale: 0.85 });
                return gsap.to(element, {
                    scale: 1,
                    opacity: 1,
                    duration: 1.1,
                    ease: "power3.out",
                    ...vars,
                });

            case "zoom-out":
                gsap.set(element, { opacity: 0, scale: 1.15 });
                return gsap.to(element, {
                    scale: 1,
                    opacity: 1,
                    duration: 1.1,
                    ease: "power3.out",
                    ...vars,
                });

            default:
                return gsap.to(element, {
                    opacity: 1,
                    duration: 1,
                    ...vars,
                });
        }
    }

    clearCompleted(element) {
        this.completed.delete(element);
    }

    getStats() {
        return {
            queued: this.queue.size,
            active: this.active.size,
            completed: this.completed.size,
            observer: this.observer ? "initialized" : "not initialized",
            limits: this.config,
        };
    }

    destroy() {
        this.observer?.disconnect();
        this.observer = null;

        this.queue.clear();
        this.active.clear();
        this.completed.clear();
    }
}

export const motionCoordinator = new MotionCoordinator();

if (typeof window !== "undefined") {
    window.FoxTheme = window.FoxTheme || {};
    window.FoxTheme.motionCoordinator = motionCoordinator;
}