document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".gift-grid").forEach((grid) => {
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
     OPEN PRODUCT POPUP
  ========================================== */

  async function openProduct(handle) {
    if (!handle) {
      console.error("No product handle found.");
      return;
    }

    try {
      const root =
        window.Shopify && window.Shopify.routes
          ? window.Shopify.routes.root
          : "/";

      console.log("Fetching product:", handle);

      const response = await fetch(
        `${root}products/${encodeURIComponent(handle)}.js`,
        {
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Product request failed: ${response.status}`);
      }

      const product = await response.json();

      console.log("Product received:", product);

      // Store product
      currentProduct = product;

      // Render EVERYTHING first
      renderProduct(product);

      // NOW open the popup
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");

      document.body.style.overflow = "hidden";
    } catch (error) {
      console.error("Product fetch error:", error);

      // Only open popup if there's actually an error
      modalTitle.textContent = "Unable to load product.";
      modalVendor.textContent = "";
      modalPrice.textContent = "";
      modalDescription.innerHTML = "";
      variantArea.innerHTML = "";
      modalImage.removeAttribute("src");

      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");

      document.body.style.overflow = "hidden";
    }
  }

  /* =========================================
     RENDER PRODUCT DETAILS
  ========================================== */

  function renderProduct(product) {
    // TITLE
    modalTitle.textContent = product.title || "";

    // VENDOR
    modalVendor.textContent = "";

    // PRICE
    if (product.price != null) {
      modalPrice.textContent = formatMoney(product.price);
    }

    // DESCRIPTION
    modalDescription.innerHTML = product.description || "";

    // IMAGE
    if (product.featured_image) {
      modalImage.src = product.featured_image;
      modalImage.alt = product.title || "";
    } else if (product.images && product.images.length) {
      modalImage.src = product.images[0];
      modalImage.alt = product.title || "";
    }

    // VARIANTS
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

    // Always show Color first, then Size
    const colorOption = product.options.find(
      (option) =>
        option.name.toLowerCase() === "color" ||
        option.name.toLowerCase() === "colour",
    );

    const sizeOption = product.options.find(
      (option) => option.name.toLowerCase() === "size",
    );

    /* =========================================
     COLOR
  ========================================== */

    if (colorOption && colorOption.values.length) {
      const group = document.createElement("div");

      group.className = "gift-grid__variant-group gift-grid__color-group";

      const label = document.createElement("label");

      label.className = "gift-grid__variant-label";
      label.textContent = "Color";

      const colorButtons = document.createElement("div");

      colorButtons.className = "gift-grid__color-buttons";

      colorOption.values.forEach((value) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "gift-grid__color-button";

        button.textContent = value;

        // Store the actual color for the visual swatch
        button.style.setProperty("--swatch-color", getColorValue(value));

        button.dataset.color = value;

        button.dataset.color = value;

        button.addEventListener("click", () => {
          const buttons = colorButtons.querySelectorAll(
            ".gift-grid__color-button",
          );

          buttons.forEach((item) => {
            item.classList.remove("is-selected");
          });

          button.classList.add("is-selected");

          // Tell the wrapper which button is selected
          const selectedIndex = Array.from(buttons).indexOf(button);

          colorButtons.classList.add("has-selection");

          colorButtons.style.setProperty("--selected-index", selectedIndex);
        });

        colorButtons.appendChild(button);
      });

      group.appendChild(label);
      group.appendChild(colorButtons);

      variantArea.appendChild(group);
    }

    function getColorValue(colorName) {
      const color = colorName.trim().toLowerCase();

      const colors = {
        black: "#000000",
        white: "#ffffff",
        red: "#c8102e",
        grey: "#808080",
        gray: "#808080",
        blue: "#174f9c",
        green: "#3f6b45",
        yellow: "#e6c229",
        orange: "#e67e22",
        pink: "#e7a9b8",
        purple: "#73508c",
        brown: "#795548",
        beige: "#d8c3a5",
        navy: "#1d3557",
      };

      return colors[color] || color;
    }

    /* =========================================
     SIZE
  ========================================== */

    if (sizeOption && sizeOption.values.length) {
      const group = document.createElement("div");

      group.className = "gift-grid__variant-group gift-grid__size-group";

      const label = document.createElement("label");

      label.className = "gift-grid__variant-label";
      label.textContent = "Size";

      const select = document.createElement("select");

      select.className = "gift-grid__variant-select";

      select.dataset.optionName = "Size";

      // Initial placeholder
      const placeholder = document.createElement("option");

      placeholder.value = "";
      placeholder.textContent = "Choose your size";
      placeholder.selected = true;
      placeholder.disabled = true;

      select.appendChild(placeholder);

      sizeOption.values.forEach((value) => {
        const optionElement = document.createElement("option");

        optionElement.value = value;
        optionElement.textContent = value;

        select.appendChild(optionElement);
      });

      group.appendChild(label);
      group.appendChild(select);

      variantArea.appendChild(group);
    }
  }

  /* =========================================
     GET SELECTED VARIANT
  ========================================== */

  function getSelectedVariant() {
    if (!currentProduct) {
      return null;
    }

    const selectedColor = variantArea.querySelector(
      ".gift-grid__color-button.is-selected",
    );

    const sizeSelect = variantArea.querySelector(".gift-grid__variant-select");

    const color = selectedColor ? selectedColor.dataset.color : null;

    const size = sizeSelect ? sizeSelect.value : null;

    // User must select both
    if (!color || !size) {
      return null;
    }

    return currentProduct.variants.find((variant) => {
      return variant.options.includes(color) && variant.options.includes(size);
    });
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
    message.textContent = "";

    try {
      await addCartItem(variant.id, 1);

      const shouldAddJacket =
        variant.options &&
        variant.options.includes("Black") &&
        variant.options.includes("Medium");

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
    const root =
      window.Shopify && window.Shopify.routes
        ? window.Shopify.routes.root
        : "/";

    const response = await fetch(`${root}cart/add.js`, {
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
    const root =
      window.Shopify && window.Shopify.routes
        ? window.Shopify.routes.root
        : "/";

    const response = await fetch(`${root}products/soft-winter-jacket.js`);

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
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
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
    const productTrigger = event.target.closest(".gift-grid__hotspot");

    if (productTrigger) {
      const handle = productTrigger.dataset.productHandle;

      console.log("HOTSPOT CLICKED:", handle);

      openProduct(handle);
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
     ESCAPE
  ========================================== */

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });
}
