// import { Component } from "@theme/component";
// import { fetchConfig, debounce, resetLoading } from "@theme/utilities";
// import { morphSection, sectionRenderer } from "@theme/section-renderer";
// import { ThemeEvents, CartUpdateEvent, DiscountUpdateEvent } from "@theme/events";
// class CartItemsComponent extends Component {
//     #debouncedOnChange = debounce(this.#onQuantityChange, 300).bind(this);
//     #timeout = 5e3;
//     connectedCallback() {
//         super.connectedCallback(),
//             document.addEventListener(ThemeEvents.cartUpdate, this.#handleCartUpdate),
//             document.addEventListener(ThemeEvents.discountUpdate, this.handleDiscountUpdate),
//             document.addEventListener(ThemeEvents.quantitySelectorUpdate, this.#debouncedOnChange);
//     }
//     disconnectedCallback() {
//         super.disconnectedCallback(),
//             document.removeEventListener(ThemeEvents.cartUpdate, this.#handleCartUpdate),
//             document.removeEventListener(ThemeEvents.discountUpdate, this.handleDiscountUpdate),
//             document.removeEventListener(ThemeEvents.quantitySelectorUpdate, this.#debouncedOnChange);
//     }
//     #onQuantityChange(event) {
//         const { quantity, cartLine: line } = event.detail;
//         if (!line) return;
//         if (quantity === 0) return this.onLineItemRemove(line);
//         this.updateQuantity({ line, quantity, action: "change" });
//         const lineItemRow = this.refs.cartItemRows[line - 1];
//         if (!lineItemRow) return;
//         lineItemRow.querySelectorAll(".cart-items__remove-button")?.forEach((button) => {
//             button?.classList.add("btn--loading");
//         });
//     }
//     onLineItemRemove(line, event) {
//         event?.preventDefault(), this.updateQuantity({ line, quantity: 0, action: "clear" });
//         const cartItemRowToRemove = this.refs.cartItemRows[line - 1];
//         if (!cartItemRowToRemove) return;
//         cartItemRowToRemove.querySelectorAll(".cart-items__remove-button").forEach((button) => {
//             button?.classList.add("btn--loading");
//         });
//     }
//     updateQuantity(config) {
//         this.#disableCartItems();
//         const { line, quantity } = config,
//             cartItemsComponents = document.querySelectorAll("cart-items-component"),
//             sectionsToUpdate = new Set([this.sectionId]);
//         cartItemsComponents.forEach((item) => {
//             item instanceof HTMLElement && item.dataset.sectionId && sectionsToUpdate.add(item.dataset.sectionId);
//         });
//         const body = JSON.stringify({
//             line,
//             quantity,
//             sections: Array.from(sectionsToUpdate).join(","),
//             sections_url: window.location.pathname,
//         });
//         fetch(`${FoxTheme.routes.cart_change_url}`, fetchConfig("json", { body }))
//             .then((response) => response.text())
//             .then(async (responseText) => {
//                 const parsedResponseText = JSON.parse(responseText);
//                 if ((resetLoading(this), parsedResponseText.sections && parsedResponseText.sections[this.sectionId])) {
//                     const newCartHiddenItemCount = new DOMParser()
//                             .parseFromString(parsedResponseText.sections[this.sectionId], "text/html")
//                             .querySelector('[ref="cartItemCount"]')?.textContent,
//                         newCartItemCount = newCartHiddenItemCount ? parseInt(newCartHiddenItemCount, 10) : 0;
//                     this.dispatchEvent(
//                         new CartUpdateEvent({}, this.sectionId, {
//                             itemCount: newCartItemCount,
//                             source: "cart-items-component",
//                             sections: parsedResponseText.sections,
//                         })
//                     ),
//                         morphSection(this.sectionId, parsedResponseText.sections[this.sectionId]);
//                 } else if (parsedResponseText.errors) {
//                     const cartSectionsData = {};
//                     let cartJson = null;
//                     const cartSectionsPromises = Array.from(sectionsToUpdate).map(async (sectionId) => {
//                             const sectionUrl = `${window.location.pathname.split("?")[0]}?section_id=${sectionId}`,
//                                 html = await (await fetch(sectionUrl)).text();
//                             cartSectionsData[sectionId] = html;
//                         }),
//                         cartJsonPromises = fetch(FoxTheme.routes.cart)
//                             .then((res) => res.json())
//                             .then((data) => {
//                                 cartJson = data;
//                             });
//                     await Promise.all([...cartSectionsPromises, cartJsonPromises]),
//                         (cartJson.sections = cartSectionsData),
//                         this.dispatchEvent(
//                             new CartUpdateEvent(cartJson, "", {
//                                 itemCount: cartJson.item_count || 0,
//                                 sections: cartJson.sections,
//                             })
//                         ),
//                         morphSection(this.sectionId, cartJson.sections[this.sectionId]);
//                 }
//                 parsedResponseText.errors && this.#handleCartError(line, parsedResponseText);
//             })
//             .catch((error) => {
//                 console.error(error);
//             })
//             .finally(() => {
//                 this.#enableCartItems();
//             });
//     }
//     handleDiscountUpdate = (event) => {
//         event?.detail?.sourceId !== this.sectionId && this.#handleCartUpdate(event);
//     };
//     #handleCartError = (line, parsedResponseText) => {
//         const cartItemError = this.refs[`cartItemError-${line}`],
//             cartItemErrorContainer = this.refs[`cartItemErrorContainer-${line}`];
//         if (!(cartItemError instanceof HTMLElement)) throw new Error("Cart item error not found");
//         if (!(cartItemErrorContainer instanceof HTMLElement)) throw new Error("Cart item error container not found");
//         (cartItemError.textContent = parsedResponseText.errors),
//             cartItemErrorContainer.classList.remove("hidden"),
//             setTimeout(() => {
//                 cartItemErrorContainer.classList.add("hidden");
//             }, this.#timeout);
//     };
//     #handleCartUpdate = (event) => {
//         if (event instanceof DiscountUpdateEvent) {
//             if (event?.detail?.sourceId === this.sectionId) return;
//             sectionRenderer.renderSection(this.sectionId, { cache: !1 });
//             return;
//         }
//         if (event.target === this) return;
//         const cartItemsHtml = event.detail.data.sections?.[this.sectionId];
//         cartItemsHtml
//             ? morphSection(this.sectionId, cartItemsHtml)
//             : sectionRenderer.renderSection(this.sectionId, { cache: !1 });
//     };
//     #disableCartItems() {
//         this.classList.add("cart-items-disabled");
//     }
//     #enableCartItems() {
//         this.classList.remove("cart-items-disabled");
//     }
//     get sectionId() {
//         const { sectionId } = this.dataset;
//         if (!sectionId) throw new Error("Section id missing");
//         return sectionId;
//     }
// }
// customElements.get("cart-items-component") || customElements.define("cart-items-component", CartItemsComponent);
 