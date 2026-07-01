import { requestIdleCallback } from "@theme/utilities";
export class ShadowComponent extends HTMLElement {
    connectedCallback() {
        if (!this.shadowRoot) {
            const template = this.querySelector(':scope > template[shadowrootmode="open"]');
            if (!(template instanceof HTMLTemplateElement)) return;
            this.attachShadow({ mode: "open" }).append(template.content.cloneNode(!0));
        }
    }
}
export class ResizeNotifier extends ResizeObserver {
    #initialized = !1;
    constructor(callback) {
        super((entries) => {
            if (this.#initialized) return callback(entries, this);
            this.#initialized = !0;
        });
    }
    disconnect() {
        (this.#initialized = !1), super.disconnect();
    }
}
(() => {
    function setScrollbarWidth() {
        requestIdleCallback(() => {
            const outer = document.createElement("div");
            (outer.style.cssText = "visibility:hidden;overflow:scroll;position:absolute;width:100px;height:100px;"),
                document.body.appendChild(outer);
            const inner = document.createElement("div");
            (inner.style.width = "100%"), outer.appendChild(inner);
            const scrollbarWidth = outer.offsetWidth - inner.offsetWidth,
                windowWidth = window.innerWidth,
                documentWidth = document.documentElement.clientWidth;
            document.body.removeChild(outer);
            const finalWidth = scrollbarWidth > 0 ? scrollbarWidth : Math.max(0, windowWidth - documentWidth);
            document.documentElement.style.setProperty("--scrollbar-width", `${finalWidth}px`);
        });
    }
    document.readyState === "complete"
        ? setScrollbarWidth()
        : window.addEventListener("load", setScrollbarWidth, { once: !0 });
    let resizeTimeout;
    const debouncedSetScrollbarWidth = () => {
        clearTimeout(resizeTimeout), (resizeTimeout = setTimeout(setScrollbarWidth, 100));
    };
    window.addEventListener("resize", debouncedSetScrollbarWidth),
        window.addEventListener("orientationchange", debouncedSetScrollbarWidth);
})();
 
