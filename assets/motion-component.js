import { Component } from "@theme/component";
import { prefersReducedMotion, coordinatedInView } from "@theme/utilities";
import { initMotionEngine, replay } from "@theme/motion-engine";

export class MotionComponent extends Component {
    #stop = null;

    connectedCallback() {
        super.connectedCallback();

        if (prefersReducedMotion() || this.#disabled()) return;

        this.#bind();
    }

    updatedCallback() {
        super.updatedCallback();

        if (prefersReducedMotion() || this.#disabled()) return;

        this.removeAttribute("data-initialized");

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
            const rect = this.getBoundingClientRect();

            if (rect.top < window.innerHeight && rect.bottom > 0) {
                initMotionEngine(this);
                return;
            }
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
        if (prefersReducedMotion() || this.#disabled()) return;

        this.#unbind();

        replay(this);

        this.#bind(true);
    }

    #disabled() {
        return this.hasAttribute("data-motion-off") ||
               this.closest("[data-motion-disabled]");
    }
}

customElements.define("motion-component", MotionComponent);