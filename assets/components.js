export function initButtons(root = document) {
  root.querySelectorAll(".btn").forEach(btn => {
    if (btn.classList.contains("is-ready")) return;
    const hasIconVariant = [...btn.classList].some(c => c.includes("btn--icon"));
    if (hasIconVariant) {
      const el = btn.querySelector(".btn__content");
      const textEl = el?.querySelector(".btn__text");
      if (!el) return;
      const iconEl = el.querySelector(".btn__icon");
      const icon = iconEl?.querySelector(".icon")?.outerHTML || "";
      btn.insertAdjacentHTML("beforeend", `
        <span class="btn__hover">
          <span class="btn__hover-circle">
            ${textEl ? `<span class="btn__hover-text">${textEl.textContent}</span>` : ""}
            ${icon ? `<span class="btn__hover-icons">
              <span class="btn__hover-icon">${icon}</span>
              <span class="btn__hover-icon">${icon}</span>
            </span>` : ""}
          </span>
        </span>
      `);
    }
    btn.classList.add("is-ready");
  });
}


export function initCards(root = document) {
  // card logic
}

export function initModals(root = document) {
  // modal logic
}



 