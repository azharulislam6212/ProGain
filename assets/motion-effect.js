import { Component } from "@theme/component";
import { prefersReducedMotion, coordinatedInView } from "@theme/utilities";
import { initMotionEngine, replay, clearCompleted } from "@theme/motion-engine";


export class MotionEffect extends Component {
    #stop = null;

    connectedCallback() {
        super.connectedCallback();
        if (prefersReducedMotion() || this.#disabled()) return;
        const image = this.querySelector('[is="responsive-image"]');

        if (image && !image.isReady) {
            image.addEventListener(
                "image:ready",
                () => this.#bind(),
                { once: true }
            );
            return;
        }

        this.#bind();
    }


    updatedCallback() {
        super.updatedCallback();
        this.removeAttribute("data-motion-initialized");
        clearCompleted(this);
        this.#unbind();
        this.#bind(true);
    }


    disconnectedCallback() {
        this.#unbind();
        super.disconnectedCallback();
    }


    #bind(force = false) {
        this.#unbind();

        if (force) {
            initMotionEngine(this);
            return;
        }

        this.#stop = coordinatedInView(this, () => {
            initMotionEngine(this);
        });
    }


    #unbind() {
        this.#stop?.();
        this.#stop = null;
    }


    replay() {
        clearCompleted(this);
        replay(this);
    }

    #disabled() {
        return (
            this.hasAttribute("data-motion-off") ||
            this.closest("[data-motion-disabled]")
        );
    }
}


customElements.get("motion-effect") || customElements.define("motion-effect", MotionEffect);