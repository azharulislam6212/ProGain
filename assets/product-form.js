import { Component} from"@theme/component";
import {fetchConfig}from"@theme/utilities";
import {ThemeEvents,CartAddEvent,CartUpdateEvent,CartErrorEvent}from"@theme/events";
export class AddToCartComponent extends Component {
  requiredRefs=["addToCartButton"];
  connectedCallback() {
    document.addEventListener(CartAddEvent.eventName, this.#onCartAddDone.bind(this)),
    document.addEventListener(CartErrorEvent.eventName, this.#onCartAddDone.bind(this)),
    super.connectedCallback()
  }
  disconnectedCallback() {
    document.removeEventListener(CartAddEvent.eventName, this.#onCartAddDone.bind(this)),
    document.removeEventListener(CartErrorEvent.eventName, this.#onCartAddDone.bind(this)),
    super.disconnectedCallback()
  }
  disable() {
    this.refs.addToCartButton.disabled= !0
  }
  enable() {
    this.refs.addToCartButton.disabled= !1
  }
  addLoading() {
    this.refs.addToCartButton.classList.add("btn--loading"),
    this.refs.addToCartSpinner.classList.remove("hidden")
  }
  removeLoading() {
    this.refs.addToCartButton.classList.remove("btn--loading"),
    this.refs.addToCartSpinner.classList.add("hidden")
  }
  #onCartAddDone() {
    this.removeLoading()
  }
}

customElements.get("add-to-cart-component")||customElements.define("add-to-cart-component", AddToCartComponent);
class ProductFormComponent extends Component {
  requiredRefs=["variantId",
  "liveRegion"];
  #abortController=new AbortController;
  #timeout;
  connectedCallback() {
    super.connectedCallback();
    const {
      signal
    }
    =this.#abortController,
    target=this.closest(".shopify-section, dialog, product-card");
    target?.addEventListener(ThemeEvents.variantUpdate, this.#onVariantUpdate, {
      signal
    }
    ),
    target?.addEventListener(ThemeEvents.variantSelected, this.#onVariantSelected, {
      signal
    }
    )
  }
  disconnectedCallback() {
    super.disconnectedCallback(),
    this.#abortController.abort()
  }
  handleSubmit(event) {
    const {
      addToCartTextError
    }
    =this.refs;
    if(event.preventDefault(), this.#timeout&&clearTimeout(this.#timeout), this.refs.addToCartButtonContainer?.refs.addToCartButton?.getAttribute("disabled")==="true")return;
    this.refs.addToCartButtonContainer?.addLoading();
    const form=this.querySelector("form");
    if( !form)throw new Error("Product form element missing");
    const formData=new FormData(form),
    cartItemsComponents=document.querySelectorAll("cart-items-component"),
    cartItemComponentsSectionIds=[];
    cartItemsComponents.forEach(item=> {
      item instanceof HTMLElement&&item.dataset.sectionId&&cartItemComponentsSectionIds.push(item.dataset.sectionId)
    }
    ),
    cartItemComponentsSectionIds.length>0&&formData.append("sections", cartItemComponentsSectionIds.join(","));
    const fetchCfg=fetchConfig("javascript", {
      body: formData
    }
    );
    fetch(FoxTheme.routes.cart_add_url, {
      ...fetchCfg, headers: {
        ...fetchCfg.headers, Accept: "text/html"
      }
    }
    ).then(response=>response.json()).then(response=> {
      if(response.status) {
        if(this.dispatchEvent(new CartErrorEvent(form.getAttribute("id")||"", response.message, response.description, response.errors)), this.refs.addToCartButtonContainer?.removeLoading(),  !addToCartTextError)return;
        if(this.#timeout&&clearTimeout(this.#timeout), addToCartTextError.textContent=response.description||response.message, addToCartTextError.classList.remove("hidden"), this.#setLiveRegionText(response.message), this.#timeout=setTimeout(()=> {
          addToCartTextError&&(addToCartTextError.classList.add("hidden"), this.#clearLiveRegionText())
        }
        , 1e4), response.sections) {
          let actualItemCount=0, foundCount= !1;
          for(const section of Object.values(response.sections)) {
            const tempDiv=document.createElement("div");
            tempDiv.innerHTML=section;
            let itemCountElement=tempDiv.querySelector('[ref="cartItemCount"]');
            if(itemCountElement||(itemCountElement=tempDiv.querySelector(".cart-bubble__text-count")), itemCountElement) {
              actualItemCount=parseInt(itemCountElement.textContent||"0", 10), foundCount= !0;
              break
            }
          }
          foundCount&&this.dispatchEvent(new CartUpdateEvent( {}
          , this.id, {
            itemCount: actualItemCount, source:"product-form-component", productId:this.dataset.productId, sections:response.sections
          }
          ))
        }
        else fetch(FoxTheme.routes.cart).then(res=>res.json()).then(cart=> {
          this.dispatchEvent(new CartUpdateEvent( {}
          , this.id, {
            itemCount: cart.item_count||0, source:"product-form-component", productId:this.dataset.productId
          }
          ))
        }
        ).catch(error=> {
          console.error("Failed to fetch cart count:", error)
        }
        );
        return
      }
      else {
        const id=formData.get("id");
        if(addToCartTextError&&(addToCartTextError.classList.add("hidden"), addToCartTextError.removeAttribute("aria-live")),  !id)throw new Error("Form ID is required");
        if(this.refs.addToCartButtonContainer?.refs.addToCartButton) {
          const addedText=FoxTheme.translations.added;
          this.#setLiveRegionText(addedText), setTimeout(()=> {
            this.#clearLiveRegionText()
          }
          , 5e3)
        }
        this.dispatchEvent(new CartAddEvent( {}
        , id.toString(), {
          source: "product-form-component", itemCount:Number(formData.get("quantity"))||Number(this.dataset.quantityDefault), productId:this.dataset.productId, sections:response.sections
        }
        ))
      }
    }
    ).catch(error=> {
      console.error(error)
    }
    ).finally(()=> {}
    )
  }
  #setLiveRegionText(text) {
    const liveRegion=this.refs.liveRegion;
    liveRegion.textContent=text
  }
  #clearLiveRegionText() {
    const liveRegion=this.refs.liveRegion;
    liveRegion.textContent=""
  }
  #onVariantUpdate=event=> {
    if(event.detail.data.newProduct)this.dataset.productId=event.detail.data.newProduct.id;
    else if(event.detail.data.productId !==this.dataset.productId)return;
    const {
      variantId,
      addToCartButtonContainer
    }
    =this.refs,
    currentAddToCartButton=addToCartButtonContainer?.refs.addToCartButton;
    if( !currentAddToCartButton)return;
    const variant=event.detail.resource,
    isAvailable=variant?.available?? !1,
    isSoldOut= !isAvailable&&variant&&variant.inventory_management==="shopify";
    isAvailable?(addToCartButtonContainer.enable(), this.refs.acceleratedCheckoutButtonContainer?.removeAttribute("hidden")):(addToCartButtonContainer.disable(), this.refs.acceleratedCheckoutButtonContainer?.setAttribute("hidden", "true")),
    this.#updateButtonTextOptimistic(currentAddToCartButton, isAvailable, isSoldOut),
    event.detail.resource?.id?variantId.value=event.detail.resource.id??"":variantId.value=""
  }
  ;
  #updateButtonTextOptimistic(button, isAvailable, isSoldOut= !1) {
    if( !button)return;
    const textElement=button.querySelector(".add-to-cart-text__content"),
    iconTextElement=button.querySelector(".btn__icon-text");
    if( !textElement)return;
    const availableText=button.dataset.addToCartText||"Add to cart",
    soldOutText=button.dataset.soldOutText||"Sold out",
    unavailableText=button.dataset.unavailableText||"Unavailable";
    let newText;
    isAvailable?newText=availableText: isSoldOut?newText=soldOutText:newText=unavailableText, textElement.textContent=newText, iconTextElement&&(iconTextElement.textContent=newText)
  }
  #onVariantSelected=()=> {
    this.refs.addToCartButtonContainer?.disable()
  }
}

customElements.get("product-form-component")||customElements.define("product-form-component", ProductFormComponent);
 