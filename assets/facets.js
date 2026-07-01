import { sectionRenderer } from "@theme/section-renderer";
import { debounce, formatMoney } from "@theme/utilities";
import { FilterUpdateEvent, ThemeEvents } from "@theme/events";
import { Component } from "@theme/component";
const SEARCH_QUERY = "q";
class FacetsFormComponent extends Component {
    requiredRefs = ["facetsForm"];
    createURLParameters(formData = new FormData(this.refs.facetsForm)) {
        let newParameters = new URLSearchParams(formData);
        newParameters.get("filter.v.price.gte") === "" && newParameters.delete("filter.v.price.gte"),
            newParameters.get("filter.v.price.lte") === "" && newParameters.delete("filter.v.price.lte"),
            newParameters.delete("page");
        const searchQuery = this.#getSearchQuery();
        return searchQuery && newParameters.set(SEARCH_QUERY, searchQuery), newParameters;
    }
    #getSearchQuery() {
        return new URL(window.location.href).searchParams.get(SEARCH_QUERY) ?? "";
    }
    get sectionId() {
        const id = this.getAttribute("section-id");
        if (!id) throw new Error("Section ID is required");
        return id;
    }
    #updateURLHash() {
        const url = new URL(window.location.href),
            urlParameters = this.createURLParameters();
        url.search = "";
        for (const [param, value] of urlParameters.entries()) url.searchParams.append(param, value);
        history.pushState({ urlParameters: urlParameters.toString() }, "", url.toString());
    }
    updateFilters = () => {
        this.#updateURLHash(),
            this.dispatchEvent(new FilterUpdateEvent(this.createURLParameters())),
            this.#updateSection();
    };
    async #updateSection() {
        await sectionRenderer.renderSection(this.sectionId), this.#scrollToTop();
    }
    async updateFiltersByURL(url) {
        history.pushState("", "", url),
            this.dispatchEvent(new FilterUpdateEvent(this.createURLParameters())),
            await this.#updateSection();
    }
    #scrollToTop() {
        this.#cachedHeaderHeight ||
            (this.#cachedHeaderHeight =
                parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-height")) || 0);
        const targetElement = document.querySelector(".main-collection") || document.body;
        if (targetElement) {
            const targetRect = targetElement.getBoundingClientRect(),
                targetTop = window.scrollY + targetRect.top - this.#cachedHeaderHeight;
            window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
        }
    }
    #cachedHeaderHeight = null;
}
customElements.get("facets-form-component") || customElements.define("facets-form-component", FacetsFormComponent);
class FacetInputsComponent extends Component {
    get sectionId() {
        const id = this.closest(".shopify-section")?.id;
        if (!id) throw new Error("FacetInputs component must be a child of a section");
        return id;
    }
    updateFilters() {
        const facetsForm = this.closest("facets-form-component");
        facetsForm instanceof FacetsFormComponent && facetsForm.updateFilters();
    }
    handleKeyDown(event) {
        if (!(event.target instanceof HTMLElement)) return;
        const closestInput = event.target.querySelector("input");
        closestInput instanceof HTMLInputElement &&
            (event.key === "Enter" || event.key === " ") &&
            (event.preventDefault(), (closestInput.checked = !closestInput.checked), this.updateFilters());
    }
    prefetchPage = debounce((event) => {
        if (!(event.target instanceof HTMLElement)) return;
        const form = this.closest("form");
        if (!form) return;
        const formData = new FormData(form),
            inputElement = event.target.querySelector("input");
        if (!(inputElement instanceof HTMLInputElement)) return;
        inputElement.checked || formData.append(inputElement.name, inputElement.value);
        const facetsForm = this.closest("facets-form-component");
        if (!(facetsForm instanceof FacetsFormComponent)) return;
        const urlParameters = facetsForm.createURLParameters(formData),
            url = new URL(window.location.pathname, window.location.origin);
        for (const [key, value] of urlParameters) url.searchParams.append(key, value);
        inputElement.checked && url.searchParams.delete(inputElement.name, inputElement.value),
            sectionRenderer.getSectionHTML(this.sectionId, !0, url);
    }, 200);
    cancelPrefetchPage = () => this.prefetchPage.cancel();
    #updateSelectedFacetSummary() {
        if (!this.refs.facetInputs) return;
        const checkedInputElements = this.refs.facetInputs.filter((input) => input.checked),
            statusComponent = this.closest("details")?.querySelector("facet-status-component");
        statusComponent instanceof FacetStatusComponent && statusComponent.updateListSummary(checkedInputElements);
    }
}
customElements.get("facet-inputs-component") || customElements.define("facet-inputs-component", FacetInputsComponent);
class PriceFacetComponent extends Component {
    connectedCallback() {
        super.connectedCallback(), this.addEventListener("keydown", this.#onKeyDown), this.#initializeRangeInputs();
    }
    disconnectedCallback() {
        super.disconnectedCallback(), this.removeEventListener("keydown", this.#onKeyDown), this.#cleanupRangeInputs();
    }
    #onKeyDown = (event) => {
        if (event.metaKey) return;
        const pattern = /[0-9]|\.|,|'| |Tab|Backspace|Enter|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Delete|Escape/;
        event.key.match(pattern) || event.preventDefault();
    };
    updatePriceFilterAndResults() {
        const { minInput, maxInput } = this.refs;
        this.#adjustToValidValues(minInput), this.#adjustToValidValues(maxInput);
        const facetsForm = this.closest("facets-form-component");
        facetsForm instanceof FacetsFormComponent && (facetsForm.updateFilters(), this.#setMinAndMaxValues());
    }
    #adjustToValidValues(input) {
        if (input.value.trim() === "") return;
        const value = Number(input.value),
            min = Number(formatMoney(input.getAttribute("data-min") ?? "")),
            max = Number(formatMoney(input.getAttribute("data-max") ?? ""));
        value < min && (input.value = min.toString()), value > max && (input.value = max.toString());
    }
    #setMinAndMaxValues() {
        const { minInput, maxInput } = this.refs;
        maxInput.value && minInput.setAttribute("data-max", maxInput.value),
            minInput.value && maxInput.setAttribute("data-min", minInput.value),
            minInput.value === "" && maxInput.setAttribute("data-min", "0"),
            maxInput.value === "" && minInput.setAttribute("data-max", maxInput.getAttribute("data-max") ?? "");
    }
    #updateSummary() {
        const { minInput, maxInput } = this.refs,
            statusComponent = this.closest("details")?.querySelector("facet-status-component");
        statusComponent instanceof FacetStatusComponent && statusComponent?.updatePriceSummary(minInput, maxInput);
    }
    #initializeRangeInputs() {
        const { rangeMin, rangeMax, minInput, maxInput } = this.refs;
        !rangeMin ||
            !rangeMax ||
            (rangeMin.addEventListener("input", this.#onRangeMinInput),
            rangeMax.addEventListener("input", this.#onRangeMaxInput),
            rangeMin.addEventListener("change", this.#onRangeMinChange),
            rangeMax.addEventListener("change", this.#onRangeMaxChange),
            minInput.addEventListener("change", this.#onMinInputChange),
            maxInput.addEventListener("change", this.#onMaxInputChange),
            this.#updateRangeVisual());
    }
    #cleanupRangeInputs() {
        const { rangeMin, rangeMax, minInput, maxInput } = this.refs;
        rangeMin &&
            (rangeMin.removeEventListener("input", this.#onRangeMinInput),
            rangeMin.removeEventListener("change", this.#onRangeMinChange)),
            rangeMax &&
                (rangeMax.removeEventListener("input", this.#onRangeMaxInput),
                rangeMax.removeEventListener("change", this.#onRangeMaxChange)),
            minInput && minInput.removeEventListener("change", this.#onMinInputChange),
            maxInput && maxInput.removeEventListener("change", this.#onMaxInputChange);
    }
    #onRangeMinInput = (event) => {
        const { rangeMax, minInput } = this.refs,
            value = parseInt(event.target.value),
            maxValue = parseInt(rangeMax.value);
        value >= maxValue && (event.target.value = maxValue - 1),
            (minInput.value = this.#centsToMoney(parseInt(event.target.value))),
            this.#updateRangeVisual();
    };
    #onRangeMaxInput = (event) => {
        const { rangeMin, maxInput } = this.refs,
            value = parseInt(event.target.value),
            minValue = parseInt(rangeMin.value);
        value <= minValue && (event.target.value = minValue + 1),
            (maxInput.value = this.#centsToMoney(parseInt(event.target.value))),
            this.#updateRangeVisual();
    };
    #onRangeMinChange = () => {
        this.updatePriceFilterAndResults();
    };
    #onRangeMaxChange = () => {
        this.updatePriceFilterAndResults();
    };
    #centsToMoney(cents) {
        return (cents / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    #moneyToCents(money) {
        const cleanNumber = formatMoney(String(money));
        return Math.round(parseFloat(cleanNumber) * 100);
    }
    #onMinInputChange = (event) => {
        const { rangeMin, maxInput } = this.refs,
            valueInCents = this.#moneyToCents(event.target.value) || 0,
            maxInCents = this.#moneyToCents(maxInput.value) || parseInt(rangeMin.max),
            minRange = parseInt(rangeMin.min) || 0,
            constrainedValue = Math.max(minRange, Math.min(valueInCents, maxInCents - 1));
        (event.target.value = this.#centsToMoney(constrainedValue)),
            (rangeMin.value = constrainedValue),
            this.#updateRangeVisual();
    };
    #onMaxInputChange = (event) => {
        const { rangeMax, minInput } = this.refs,
            valueInCents = this.#moneyToCents(event.target.value) || parseInt(rangeMax.max),
            minInCents = this.#moneyToCents(minInput.value) || 0,
            maxRange = parseInt(rangeMax.max),
            constrainedValue = Math.min(maxRange, Math.max(valueInCents, minInCents + 1));
        (event.target.value = this.#centsToMoney(constrainedValue)),
            (rangeMax.value = constrainedValue),
            this.#updateRangeVisual();
    };
    #updateRangeVisual() {
        const { rangeMin, rangeMax } = this.refs;
        if (!rangeMin || !rangeMax) return;
        const rangeInputs = this.querySelector(".price-facet__range-inputs");
        if (!rangeInputs) return;
        const minValue = parseInt(rangeMin.value),
            maxValue = parseInt(rangeMax.value),
            maxRange = parseInt(rangeMax.max),
            minPercent = (minValue / maxRange) * 100,
            maxPercent = (maxValue / maxRange) * 100;
        rangeInputs.style.setProperty("--range-min", `${minPercent}%`),
            rangeInputs.style.setProperty("--range-max", `${maxPercent}%`);
        const intersectThresholdPercent = this.dataset.intersectThresholdPercent,
            intersectThreshold = (maxRange * intersectThresholdPercent) / 100;
        minValue + intersectThreshold >= maxRange
            ? this.style.setProperty("--range-min-z-index", "2")
            : this.style.removeProperty("--range-min-z-index");
    }
}
customElements.get("price-facet-component") || customElements.define("price-facet-component", PriceFacetComponent);
class SortingFilterComponent extends Component {
    connectedCallback() {
        super.connectedCallback();
        const select = this.querySelector(".sorting-filter__select"),
            radioInputs = this.querySelectorAll(".sorting-filter__radio");
        select && select.addEventListener("change", this.updateFilterAndSorting),
            radioInputs.forEach((radio) => {
                radio.addEventListener("change", this.updateFilterAndSorting);
            });
    }
    updateFilterAndSorting = (event) => {
        const facetsForm =
            this.closest("facets-form-component") ||
            this.closest(".shopify-section")?.querySelector("facets-form-component");
        facetsForm instanceof FacetsFormComponent && facetsForm.updateFilters();
    };
    updateFacetStatus(event) {
        const target = event.target;
        if (!(target instanceof HTMLSelectElement || target instanceof HTMLInputElement)) return;
        const details = this.querySelector("details");
        if (!details) return;
        const facetStatus = details.querySelector("facet-status-component");
        if (!(facetStatus instanceof FacetStatusComponent)) return;
        const value = target.value,
            defaultSortBy = details.dataset.defaultSortBy,
            optionName =
                target.dataset.optionName ||
                (target instanceof HTMLSelectElement
                    ? target.options[target.selectedIndex]?.text
                    : target.closest(".sorting-filter__option")?.querySelector(".facets__checkbox-text")?.textContent);
        facetStatus.textContent = value !== defaultSortBy ? (optionName ?? "") : "";
    }
}
customElements.get("sorting-filter-component") ||
    customElements.define("sorting-filter-component", SortingFilterComponent);
class FacetRemoveComponent extends Component {
    connectedCallback() {
        super.connectedCallback(), document.addEventListener(ThemeEvents.FilterUpdate, this.#handleFilterUpdate);
    }
    disconnectedCallback() {
        super.disconnectedCallback(), document.removeEventListener(ThemeEvents.FilterUpdate, this.#handleFilterUpdate);
    }
    removeFilter({ form }, event) {
        if (event instanceof KeyboardEvent) {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
        }
        const url = this.dataset.url;
        if (!url) return;
        let facetsForm;
        form
            ? (facetsForm = document.getElementById(form))
            : ((facetsForm = this.closest("facets-form-component")),
              facetsForm || (facetsForm = document.querySelector("facets-form-component"))),
            facetsForm instanceof FacetsFormComponent && facetsForm.updateFiltersByURL(url);
    }
    #handleFilterUpdate = (event) => {
        const { clearButton } = this.refs;
        clearButton instanceof Element && clearButton.classList.toggle("active", event.shouldShowClearAll());
    };
}
customElements.get("facet-remove-component") || customElements.define("facet-remove-component", FacetRemoveComponent);
 