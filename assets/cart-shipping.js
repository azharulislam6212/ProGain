// import { Component } from "@theme/component";
// import { fetchConfig } from "@theme/utilities";
// export class CountryProvinceForm extends Component {
//     requiredRefs = ["countryInput", "provinceInput"];
//     #pendingCountryData = null;
//     #pendingProvinceData = null;
//     #dialogObserver = null;
//     #optionsPopulated = !1;
//     #handleCountryChangeBound = this.#handleCountryChange.bind(this);
//     connectedCallback() {
//         super.connectedCallback(),
//             this.#initializeCountry(),
//             this.refs.countryInput.addEventListener("change", this.#handleCountryChangeBound),
//             this.#setupContainerObserver();
//     }
//     updatedCallback() {
//         super.updatedCallback(), (this.#optionsPopulated = !1), this.#initializeCountry();
//         const oldCountryInput = this.refs.countryInput;
//         oldCountryInput && oldCountryInput.removeEventListener("change", this.#handleCountryChangeBound),
//             this.refs.countryInput.addEventListener("change", this.#handleCountryChangeBound),
//             this.#dialogObserver?.disconnect(),
//             (this.#dialogObserver = null),
//             this.#setupContainerObserver();
//         const dialogElement = this.closest("dialog"),
//             detailsElement = this.closest("details"),
//             containerElement = dialogElement || detailsElement;
//         containerElement && containerElement.open && this.#handleContainerOpen({ target: containerElement });
//     }
//     disconnectedCallback() {
//         super.disconnectedCallback(),
//             this.refs.countryInput &&
//             this.refs.countryInput.removeEventListener("change", this.#handleCountryChangeBound),
//             this.#dialogObserver?.disconnect(),
//             (this.#dialogObserver = null);
//     }
//     #handleContainerOpen(event) {
//         if (this.#optionsPopulated) return;
//         const dialogElement = this.closest("dialog"),
//             detailsElement = this.closest("details"),
//             containerElement = dialogElement || detailsElement;
//         containerElement &&
//             containerElement.open &&
//             (this.#ensureCountryOptionsPopulated(),
//                 (this.#optionsPopulated = !0),
//                 this.#pendingCountryData &&
//                 (this.#setDefaultCountry(this.#pendingCountryData, this.#pendingProvinceData),
//                     (this.#pendingCountryData = null),
//                     (this.#pendingProvinceData = null)));
//     }
//     #initializeCountry() {
//         (this.#pendingCountryData = this.dataset.country), (this.#pendingProvinceData = this.dataset.province);
//     }
//     #populateCountryOptions() {
//         const template = this.refs.countryInput.querySelector("template");
//         if (template) {
//             const templateContent = document.importNode(template.content, !0);
//             this.refs.countryInput.appendChild(templateContent);
//         }
//     }
//     #ensureCountryOptionsPopulated() {
//         this.refs.countryInput.querySelector("template") && this.#populateCountryOptions();
//     }
//     #setDefaultCountry(countryData, provinceData) {
//         const countryOption = Array.from(this.refs.countryInput.options).find(
//             (option) => option.textContent === countryData
//         );
//         countryOption &&
//             ((this.refs.countryInput.selectedIndex = countryOption.index),
//                 this.refs.countryInput.dispatchEvent(new Event("change")));
//     }
//     #setupContainerObserver() {
//         const dialogElement = this.closest("dialog"),
//             detailsElement = this.closest("details"),
//             containerElement = dialogElement || detailsElement;
//         containerElement &&
//             ((this.#dialogObserver = new MutationObserver((mutations) => {
//                 mutations.forEach((mutation) => {
//                     mutation.type === "attributes" &&
//                         mutation.attributeName === "open" &&
//                         containerElement.open &&
//                         this.#handleContainerOpen({ target: containerElement });
//                 });
//             })),
//                 this.#dialogObserver.observe(containerElement, { attributes: !0, attributeFilter: ["open"] }));
//     }
//     #handleCountryChange() {
//         const selectedOption = this.refs.countryInput.options[this.refs.countryInput.selectedIndex];
//         if (!selectedOption) return;
//         const provincesData = selectedOption.dataset.provinces;
//         if (!provincesData) {
//             this.#hideProvinceField();
//             return;
//         }
//         try {
//             const provinces = JSON.parse(provincesData);
//             if (!Array.isArray(provinces) || provinces.length === 0) {
//                 this.#hideProvinceField();
//                 return;
//             }
//             this.#showProvinceField(), this.#updateProvinceOptions(provinces);
//         } catch (error) {
//             console.error("Error parsing provinces data:", error), this.#hideProvinceField();
//         }
//     }
//     #hideProvinceField() {
//         const provinceField = this.refs.provinceInput.closest(".form-field");
//         provinceField && (provinceField.hidden = !0);
//     }
//     #showProvinceField() {
//         const provinceField = this.refs.provinceInput.closest(".form-field");
//         provinceField && (provinceField.hidden = !1);
//     }
//     #updateProvinceOptions(provinces) {
//         (this.refs.provinceInput.innerHTML = ""),
//             provinces.forEach((provinceData) => {
//                 const [code, name] = provinceData,
//                     isSelected = code === this.dataset.province,
//                     option = new Option(name, code, isSelected, isSelected);
//                 this.refs.provinceInput.options.add(option);
//             });
//     }
// }
// customElements.get("country-province") || customElements.define("country-province", CountryProvinceForm);
// export class CartShippingComponent extends Component {
//     requiredRefs = ["form", "submitButton", "resultsElement", "zipInput", "countryProvince"];
//     #abortController;
//     #isProcessing = !1;
//     #handleFormSubmitBound = this.#handleFormSubmit.bind(this);
//     connectedCallback() {
//         super.connectedCallback(), this.refs.form.addEventListener("submit", this.#handleFormSubmitBound);
//     }
//     updatedCallback() {
//         super.updatedCallback();
//         const oldForm = this.refs.form;
//         oldForm && oldForm.removeEventListener("submit", this.#handleFormSubmitBound),
//             this.refs.form.addEventListener("submit", this.#handleFormSubmitBound);
//     }
//     disconnectedCallback() {
//         super.disconnectedCallback(),
//             this.refs.form && this.refs.form.removeEventListener("submit", this.#handleFormSubmitBound),
//             this.#abortController?.abort();
//     }
//     #handleFormSubmit(event) {
//         if ((event.preventDefault(), this.#isProcessing)) return;
//         this.#abortController?.abort();
//         const zip = this.refs.zipInput.value.trim(),
//             country = this.refs.countryProvince.refs.countryInput.value,
//             province = this.refs.countryProvince.refs.provinceInput.value,
//             validationError = this.#validateFormData(zip, country);
//         if (validationError) {
//             this.#formatError({ validation: validationError }), (this.refs.resultsElement.hidden = !1);
//             return;
//         }
//         (this.#isProcessing = !0), this.#addLoadingState();
//         const body = JSON.stringify({ shipping_address: { zip, country, province } }),
//             sectionUrl = `${FoxTheme.routes.cart_url}/shipping_rates.json`;
//         (this.#abortController = new AbortController()),
//             fetch(sectionUrl, { ...fetchConfig("json", { body }), signal: this.#abortController.signal })
//                 .then((response) =>
//                     response.json().then((data) => {
//                         if (!response.ok) {
//                             if (response.status === 422) return data;
//                             throw new Error(`HTTP ${response.status}: ${response.statusText}`);
//                         }
//                         return data;
//                     })
//                 )
//                 .then((parsedState) => {
//                     parsedState.shipping_rates
//                         ? this.#formatShippingRates(parsedState.shipping_rates)
//                         : this.#formatServerErrors(parsedState);
//                 })
//                 .catch((error) => {
//                     error.name !== "AbortError" &&
//                         (console.error("Shipping calculation error:", error),
//                             this.#formatError({ error: "Unable to calculate shipping rates" }));
//                 })
//                 .finally(() => {
//                     (this.#isProcessing = !1), this.#removeLoadingState(), (this.refs.resultsElement.hidden = !1);
//                 });
//     }
//     #validateFormData(zip, country) {
//         return zip
//             ? country
//                 ? /^[a-zA-Z0-9\s-]{3,10}$/.test(zip)
//                     ? null
//                     : "Please enter a valid postal code"
//                 : "Please select a country"
//             : "Please enter a postal code";
//     }
//     #addLoadingState() {
//         this.refs.submitButton.classList.add("btn--loading"), (this.refs.submitButton.disabled = !0);
//     }
//     #removeLoadingState() {
//         this.refs.submitButton.classList.remove("btn--loading"), (this.refs.submitButton.disabled = !1);
//     }
//     #formatError(errors) {
//         const errorMessages = Object.values(errors);
//         this.#renderErrorMessages(errorMessages);
//     }
//     #renderErrorMessages(errorMessages) {
//         const hasMultipleErrors = errorMessages.length > 1;
//         this.refs.resultsElement.innerHTML = `
//       <div class="alert alert--error text-left grid gap-2" role="alert" aria-live="polite">
//         ${hasMultipleErrors ? `<ul class="list-disc grid gap-1 text-body-sm" role="list">${errorMessages.map((msg) => `<li>${msg}</li>`).join("")}</ul>` : `<p class="text-body-sm m-0">${errorMessages[0]}</p>`}
//       </div>
//     `;
//     }
//     #formatServerErrors(response) {
//         let errorMessages = [];
//         Object.keys(response).some((key) => Array.isArray(response[key]))
//             ? Object.entries(response).forEach(([field, messages]) => {
//                 Array.isArray(messages) ? errorMessages.push(...messages) : errorMessages.push(messages);
//             })
//             : response.errors
//                 ? Object.entries(response.errors).forEach(([field, messages]) => {
//                     Array.isArray(messages) ? errorMessages.push(...messages) : errorMessages.push(messages);
//                 })
//                 : response.message
//                     ? errorMessages.push(response.message)
//                     : typeof response == "string"
//                         ? errorMessages.push(response)
//                         : errorMessages.push("Unable to calculate shipping rates"),
//             this.#renderErrorMessages(errorMessages);
//     }
//     #formatShippingRates(shippingRates) {
//         if (shippingRates.length === 0) {
//             this.#formatError({ notFound: FoxTheme.translations.shipping_calculator_not_found });
//             return;
//         }
//         const shippingRatesList = shippingRates.map(
//             ({ presentment_name, currency, price }) => `<li>${presentment_name}: ${currency} ${price}</li>`
//         ),
//             message = this.#getShippingMessage(shippingRates.length);
//         this.refs.resultsElement.innerHTML = `
//       <div class="text-left alert alert--success grid gap-2" role="status" aria-live="polite">
//         <p class="m-0">${message}</p>
//         <ul class="list-disc grid gap-1 text-body-sm" role="list">${shippingRatesList.join("")}</ul>
//       </div>
//     `;
//     }
//     #getShippingMessage(count) {
//         if (count === 1) return FoxTheme.translations.shipping_calculator_one_result;
//         const message = FoxTheme.translations.shipping_calculator_multiple_results;
//         return message.includes("{{ count }}") ? message.replace("{{ count }}", count) : message;
//     }
// }
// customElements.get("cart-shipping") || customElements.define("cart-shipping", CartShippingComponent);
