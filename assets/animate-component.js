

 import { Component } from "@theme/component";
import { animate } from "@theme/animation";
import { prefersReducedMotion, coordinatedInView } from "@theme/utilities";
import { motionCoordinator } from "@theme/motion-coordinator";
export class MotionComponent extends Component {
    #inViewStop = null;
    connectedCallback() {
        super.connectedCallback(), !(prefersReducedMotion() || this.#isDisabled()) && this.#bindInView();
    }
    updatedCallback() {
        super.updatedCallback(),
            !(prefersReducedMotion() || this.#isDisabled()) &&
                (this.removeAttribute("data-initialized"),
                this.#unbindInView(),
                this.#prestage(),
                this.#bindInView(!0));
    }
    disconnectedCallback() {
        this.#unbindInView(), super.disconnectedCallback();
    }
    get type() {
        return this.dataset.motion || "fade-up";
    }
    get delay() {
        return this.hasAttribute("data-motion-delay") ? parseInt(this.getAttribute("data-motion-delay")) / 1e3 : 0;
    }
    get isHold() {
        return this.hasAttribute("data-motion-hold");
    }
    get isInstant() {
        return this.hasAttribute("data-instantly");
    }
    get media() {
        return Array.from(this.querySelectorAll("img, iframe, svg"));
    }
    #prestage() {
        if (!this.isHold)
            switch (this.type) {
                case "fade-in":
                    animate(this, { opacity: 0 }, { duration: 0 });
                    break;
                case "fade-up":
                    animate(this, { transform: "translateY(2.5rem)", opacity: 0 }, { duration: 0 });
                    break;
                case "slide-in-left":
                    animate(this, { transform: "translateX(-2.5rem)", opacity: 0 }, { duration: 0 });
                    break;
                case "slide-in-right":
                    animate(this, { transform: "translateX(2.5rem)", opacity: 0 }, { duration: 0 });
                    break;
                case "zoom-in":
                    animate(this, { transform: "scale(0.8)" }, { duration: 0 });
                    break;
                case "zoom-out":
                    animate(this, { transform: "scale(1.15)" }, { duration: 0 });
                    break;
            }
    }
    async #enter() {
        if (this.isHold) return;
        const easing = [0.16, 1, 0.3, 1];
        switch (this.type) {
            case "fade-in":
                await animate(this, { opacity: 1 }, { duration: 1.5, delay: this.delay, easing }).finished;
                break;
            case "fade-up":
                await animate(
                    this,
                    { transform: "translateY(0)", opacity: 1 },
                    { duration: 1.5, delay: this.delay, easing }
                ).finished;
                break;
            case "slide-in-left":
                await animate(
                    this,
                    { transform: "translateX(0)", opacity: 1 },
                    { duration: 1.5, delay: this.delay, easing }
                ).finished;
                break;
            case "slide-in-right":
                await animate(
                    this,
                    { transform: "translateX(0)", opacity: 1 },
                    { duration: 1.5, delay: this.delay, easing }
                ).finished;
                break;
            case "zoom-in":
                await animate(this, { transform: "scale(1)" }, { duration: 1.3, delay: this.delay, easing }).finished;
                break;
            case "zoom-out":
                await animate(this, { transform: "scale(1)" }, { duration: 1.3, delay: this.delay, easing }).finished;
                break;
        }
        this.setAttribute("data-initialized", "true"), (this.style.willChange = "auto");
    }
    #bindInView(forceImmediate = !1) {
        if ((this.#unbindInView(), forceImmediate)) {
            const rect = this.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                (async () => (
                    !this.isInstant && this.media.length && (await this.#waitForMediaSmart(this.media)), this.#enter()
                ))();
                return;
            }
        }
        this.#inViewStop = coordinatedInView(this, async () => {
            !this.isInstant && this.media.length && (await this.#waitForMediaSmart(this.media)), this.#enter();
        });
    }
    async #waitForMediaSmart(mediaElements) {
        const promises = mediaElements.map((el) =>
            el instanceof HTMLImageElement && el.getAttribute("is") === "responsive-image"
                ? el.isReady || (el.complete && el.naturalWidth > 0)
                    ? Promise.resolve()
                    : el.ready instanceof Promise
                      ? el.ready
                      : new Promise((resolve) => {
                            const timeout = setTimeout(resolve, 5e3);
                            el.addEventListener(
                                "image:ready",
                                () => {
                                    clearTimeout(timeout), resolve();
                                },
                                { once: !0 }
                            ),
                                el.complete ||
                                    el.addEventListener(
                                        "load",
                                        () => {
                                            clearTimeout(timeout), resolve();
                                        },
                                        { once: !0 }
                                    );
                        })
                : el instanceof HTMLImageElement
                  ? el.complete && el.naturalWidth > 0
                      ? Promise.resolve()
                      : new Promise((resolve) => {
                            el.addEventListener("load", resolve, { once: !0 }),
                                el.addEventListener("error", resolve, { once: !0 });
                        })
                  : Promise.resolve()
        );
        await Promise.allSettled(promises);
    }
    #unbindInView() {
        this.#inViewStop && (this.#inViewStop(), (this.#inViewStop = null));
    }
    replay() {
        prefersReducedMotion() ||
            this.#isDisabled() ||
            (this.#unbindInView(),
            motionCoordinator.clearCompleted(this),
            this.removeAttribute("data-motion-hold"),
            this.removeAttribute("data-initialized"),
            this.#prestage(),
            this.#bindInView(!0));
    }
    #isDisabled() {
        return this.hasAttribute("data-motion-off") || this.closest("[data-motion-disabled]") !== null;
    }
}
customElements.define("motion-component", MotionComponent);