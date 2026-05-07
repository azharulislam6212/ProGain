// import { DialogComponent } from "@theme/dialog";
// import { ThemeEvents, CartGroupedSections } from "@theme/events";
// import { getSectionId } from "@theme/utilities";
// class CartDrawerComponent extends DialogComponent {
//     #currentCartItemCount = null;
//     connectedCallback() {
//         super.connectedCallback(),
//             this.#initializeCartCount(),
//             document.addEventListener(ThemeEvents.cartUpdate, this.#handleCartUpdate),
//             (this.getSectionToRenderListener = this.#getSectionToRender.bind(this)),
//             document.addEventListener(CartGroupedSections.eventName, this.getSectionToRenderListener);
//     }
//     disconnectedCallback() {
//         super.disconnectedCallback(),
//             document.removeEventListener(ThemeEvents.cartUpdate, this.#handleCartUpdate),
//             document.removeEventListener(CartGroupedSections.eventName, this.getSectionToRenderListener);
//     }
//     #initializeCartCount() {
//         const cartCountElement = document.querySelector('cart-count:not([data-context="drawer"])');
//         if (cartCountElement?.refs?.cartBubbleCount) {
//             this.#currentCartItemCount = parseInt(cartCountElement.refs.cartBubbleCount.textContent ?? "0", 10);
//             return;
//         }
//         const cartBubbleCount = document.querySelector(".cart-bubble__text-count");
//         if (cartBubbleCount) {
//             this.#currentCartItemCount = parseInt(cartBubbleCount.textContent ?? "0", 10);
//             return;
//         }
//         this.#currentCartItemCount = 0;
//     }
//     #isDrawerOpen() {
//         return this.refs.dialog?.open ?? !1;
//     }
//     #handleCartUpdate = (event) => {
//         if (!this.hasAttribute("auto-open")) return;
//         const sourceId = event.detail.sourceId;
//         if (event.detail.data?.source === "cart-items-component" && this.#isDrawerOpen()) {
//             this.#updateCartCount(event);
//             return;
//         }
//         const itemCount = event.detail.data?.itemCount,
//             isIncremental = event.detail.data?.isIncremental ?? !1;
//         if (itemCount == null) return;
//         let newCartItemCount;
//         if (isIncremental) {
//             const currentCount2 = this.#currentCartItemCount ?? 0;
//             newCartItemCount = Math.max(0, currentCount2 + itemCount);
//         } else newCartItemCount = Math.max(0, itemCount);
//         const currentCount = this.#currentCartItemCount ?? 0;
//         newCartItemCount > currentCount && (this.#isDrawerOpen() || this.showDialog()),
//             (this.#currentCartItemCount = newCartItemCount);
//     };
//     #updateCartCount(event) {
//         const itemCount = event.detail.data?.itemCount,
//             isIncremental = event.detail.data?.isIncremental ?? !1;
//         if (itemCount != null)
//             if (isIncremental) {
//                 const currentCount = this.#currentCartItemCount ?? 0;
//                 this.#currentCartItemCount = Math.max(0, currentCount + itemCount);
//             } else this.#currentCartItemCount = Math.max(0, itemCount);
//     }
//     open(event) {
//         event.preventDefault(),
//             this.showDialog(),
//             customElements.whenDefined("shopify-payment-terms").then(() => {
//                 document
//                     .querySelector("shopify-payment-terms")
//                     ?.shadowRoot?.querySelector("#shopify-installments-cta")
//                     ?.addEventListener("click", this.closeDialog, { once: !0 });
//             });
//     }
//     close() {
//         this.closeDialog();
//     }
//     #getSectionToRender(event) {
//         event.detail.sections.push(getSectionId(this));
//     }
// }
// customElements.get("cart-drawer-component") || customElements.define("cart-drawer-component", CartDrawerComponent);
 