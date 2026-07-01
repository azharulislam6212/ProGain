import { requestIdleCallback } from "@theme/utilities";
import PaginatedList from "@theme/paginated-list";
export default class ResultsList extends PaginatedList {
    connectedCallback() {
        super.connectedCallback(), this.setAttribute("initialized", "");
    }
    disconnectedCallback() {}
    updateLayout({ target }) {
        target instanceof HTMLInputElement && this.#setLayout(target.value);
    }
    toggleFiltering() {
        const isOpen = this.getAttribute("show-filtering") === "true";
        this.setAttribute("show-filtering", !isOpen);
    }
    #setLayout(value) {
        const { grid } = this.refs;
        grid &&
            (grid.setAttribute("product-grid-view", value),
            requestIdleCallback(() => {
                sessionStorage.setItem("product-grid-view", value);
            }));
    }
}
customElements.get("results-list") || customElements.define("results-list", ResultsList);
 