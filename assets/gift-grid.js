document.addEventListener("DOMContentLoaded", () => {
  const grids = document.querySelectorAll(".gift-grid");

  grids.forEach((grid) => {
    initGiftGrid(grid);
  });
});

function initGiftGrid(grid) {
  const modal = grid.querySelector(".gift-grid__modal");
  const overlay = grid.querySelector(".gift-grid__modal-overlay");
  const closeButton = grid.querySelector(".gift-grid__modal-close");

  const modalImage = grid.querySelector(".gift-grid__modal-image");
  const modalVendor = grid.querySelector(".gift-grid__modal-vendor");
  const modalTitle = grid.querySelector(".gift-grid__modal-title");
  const modalPrice = grid.querySelector(".gift-grid__modal-price");
  const modalDescription = grid.querySelector(".gift-grid__modal-description");

  const variantArea = grid.querySelector(".gift-grid__variant-area");
  const addButton = grid.querySelector(".gift-grid__add-button");
  const message = grid.querySelector(".gift-grid__modal-message");

  let currentProduct = null;

  /* =========================================
     OPEN PRODUCT
  ========================================== */

  async function openProduct(handle) {
    if (!handle) return;

    message.textContent = "";
    variantArea.innerHTML = "";

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";

    modalTitle.textContent = "Loading...";
    modalVendor.textContent = "";
    modalPrice.textContent = "";
    modalDescription.innerHTML = "";
    modalImage.removeAttribute("src");

    try {
      const response = await fetch(`/products/${handle}.js`);

      if (!response.ok) {
        throw new Error("Product could not be loaded.");
      }

      const product = await response.json();

      currentProduct = product;

      renderProduct(product);
    } catch (error) {
      console.error(error);

      modalTitle.textContent = "Unable to load product.";
      message.textContent = "Please try again.";
    }
  }

  /* =========================================
     RENDER PRODUCT
  ========================================== */

  function renderProduct(product) {
    modalTitle.textContent = product.title;

    modalVendor.textContent = product.vendor || "";

    modalPrice.textContent = formatMoney(product.price);

    modalDescription.innerHTML = product.description || "";

    if (product.featured_image) {
      modalImage.src = product.featured_image;
      modalImage.alt = product.title;
    }

    renderVariants(product);
  }

  /* =========================================
     VARIANTS
  ========================================== */

  function renderVariants(product) {
    variantArea.innerHTML = "";

    if (!product.options || product.options.length === 0) {
      return;
    }

    product.options.forEach((option, optionIndex) => {
      if (!option.values || option.values.length === 0) {
        return;
      }

      const group = document.createElement("div");

      group.className = "gift-grid__variant-group";

      const label = document.createElement("label");

      label.className = "gift-grid__variant-label";

      label.textContent = option.name;

      const select = document.createElement("select");

      select.className = "gift-grid__variant-select";

      select.dataset.optionIndex = optionIndex;

      option.values.forEach((value) => {
        const optionElement = document.createElement("option");

        optionElement.value = value;
        optionElement.textContent = value;

        select.appendChild(optionElement);
      });

      group.appendChild(label);
      group.appendChild(select);

      variantArea.appendChild(group);
    });
  }

  /* =========================================
     GET SELECTED VARIANT
  ========================================== */

  function getSelectedVariant() {
    if (!currentProduct) {
      return null;
    }

    const selects = variantArea.querySelectorAll(".gift-grid__variant-select");

    const selectedValues = Array.from(selects).map((select) => select.value);

    const variant = currentProduct.variants.find((item) => {
      return item.options.every(
        (value, index) => value === selectedValues[index],
      );
    });

    return variant || null;
  }

  /* =========================================
     ADD TO CART
  ========================================== */

  async function addToCart() {
    if (!currentProduct) {
      return;
    }

    const variant = getSelectedVariant();

    if (!variant) {
      message.textContent = "Please select a valid variant.";

      return;
    }

    if (!variant.available) {
      message.textContent = "This variant is unavailable.";

      return;
    }

    addButton.disabled = true;

    message.textContent = "Adding to cart...";

    try {
      await addCartItem(variant.id, 1);

      /* =====================================
         SPECIAL CART RULE

         Black + Medium
         → Soft Winter Jacket
      ====================================== */

      const shouldAddJacket =
        variant.options.includes("Black") && variant.options.includes("Medium");

      if (shouldAddJacket) {
        await addSoftWinterJacket();
      }

      message.textContent = "Added to cart!";

      setTimeout(() => {
        closeModal();
      }, 700);
    } catch (error) {
      console.error(error);

      message.textContent = "Something went wrong. Please try again.";
    } finally {
      addButton.disabled = false;
    }
  }

  /* =========================================
     CART REQUEST
  ========================================== */

  async function addCartItem(variantId, quantity) {
    const response = await fetch("/cart/add.js", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },

      body: JSON.stringify({
        items: [
          {
            id: variantId,
            quantity: quantity,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error("Unable to add item to cart.");
    }

    return response.json();
  }

  /* =========================================
     SPECIAL PRODUCT
  ========================================== */

  async function addSoftWinterJacket() {
    const response = await fetch("/products/soft-winter-jacket.js");

    if (!response.ok) {
      throw new Error("Soft Winter Jacket not found.");
    }

    const jacket = await response.json();

    const availableVariant = jacket.variants.find(
      (variant) => variant.available,
    );

    if (!availableVariant) {
      return;
    }

    await addCartItem(availableVariant.id, 1);
  }

  /* =========================================
     MONEY
  ========================================== */

  function formatMoney(cents) {
    return new Intl.NumberFormat(document.documentElement.lang || "en", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(cents / 100);
  }

  /* =========================================
     CLOSE MODAL
  ========================================== */

  function closeModal() {
    modal.classList.remove("is-open");

    modal.setAttribute("aria-hidden", "true");

    document.body.style.overflow = "";
  }

  /* =========================================
     CLICK EVENTS
  ========================================== */

  grid.addEventListener("click", (event) => {
    const productTrigger = event.target.closest("[data-product-handle]");

    if (productTrigger && grid.contains(productTrigger)) {
      openProduct(productTrigger.dataset.productHandle);

      return;
    }

    if (event.target.closest(".gift-grid__modal-close")) {
      closeModal();

      return;
    }

    if (event.target.closest(".gift-grid__modal-overlay")) {
      closeModal();

      return;
    }

    if (event.target.closest(".gift-grid__add-button")) {
      addToCart();
    }
  });

  /* =========================================
     ESCAPE KEY
  ========================================== */

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });
}
