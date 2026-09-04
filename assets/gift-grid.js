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

  /*
  ============================================================
  PRODUCT CACHE
  ============================================================
  */

  const productCache = new Map();

  /*
  ============================================================
  FETCH PRODUCT
  ============================================================
  */

  async function fetchProduct(handle) {
    if (!handle) {
      throw new Error("No product handle found.");
    }

    /*
      If the product is already being loaded or has
      already been loaded, reuse the same promise.
    */
    if (productCache.has(handle)) {
      return await productCache.get(handle);
    }

    const root =
      window.Shopify && window.Shopify.routes
        ? window.Shopify.routes.root
        : "/";

    console.log("Fetching product:", handle);

    const productPromise = fetch(
      `${root}products/${encodeURIComponent(handle)}.js`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Product request failed: ${response.status}`);
        }

        return response.json();
      })
      .catch((error) => {
        /*
          Remove failed requests from cache so a future
          attempt can try again.
        */
        productCache.delete(handle);
        throw error;
      });

    /*
      Store the promise immediately.
      This prevents duplicate requests when the same
      product is clicked multiple times quickly.
    */
    productCache.set(handle, productPromise);

    return await productPromise;
  }

  /*
  ============================================================
  PRELOAD PRODUCTS
  ============================================================
  */

  function preloadProducts() {
    const handles = [
      ...grid.querySelectorAll(".gift-grid__hotspot"),
    ]
      .map((hotspot) => hotspot.dataset.productHandle)
      .filter(Boolean);

    /*
      Remove duplicate product handles.
    */
    const uniqueHandles = [...new Set(handles)];

    uniqueHandles.forEach((handle) => {
      if (productCache.has(handle)) {
        return;
      }

      /*
        Load product data in the background.
      */
      fetchProduct(handle)
        .then((product) => {
          /*
            Preload the product image as well.
          */
          const imageUrl =
            product.featured_image ||
            (product.images && product.images.length
              ? product.images[0]
              : null);

          if (imageUrl) {
            const image = new Image();
            image.src = imageUrl;
          }
        })
        .catch((error) => {
          console.error(
            "Product preload failed:",
            handle,
            error,
          );
        });
    });
  }

  /*
  ============================================================
  OPEN PRODUCT
  ============================================================
  */

  async function openProduct(handle) {
    if (!handle) {
      console.error("No product handle found.");
      return;
    }

    /*
      Always clear old message before opening
      another product.
    */
    message.textContent = "";

    try {
      const product = await fetchProduct(handle);

      console.log("Product received:", product);

      currentProduct = product;

      renderProduct(product);

      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");

      document.body.style.overflow = "hidden";
    } catch (error) {
      console.error("Product fetch error:", error);

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

  /*
  ============================================================
  RENDER PRODUCT
  ============================================================
  */

  function renderProduct(product) {
    modalTitle.textContent = product.title || "";

    /*
      Vendor intentionally left alone.
    */
    modalVendor.textContent = "";

    if (product.price != null) {
      modalPrice.textContent = formatMoney(product.price);
    } else {
      modalPrice.textContent = "";
    }

    modalDescription.innerHTML = product.description || "";

    if (product.featured_image) {
      modalImage.src = product.featured_image;
      modalImage.alt = product.title || "";
    } else if (product.images && product.images.length) {
      modalImage.src = product.images[0];
      modalImage.alt = product.title || "";
    } else {
      modalImage.removeAttribute("src");
      modalImage.alt = "";
    }

    renderVariants(product);
  }

  /*
  ============================================================
  RENDER VARIANTS
  ============================================================
  */

  function renderVariants(product) {
    variantArea.innerHTML = "";

    if (!product.options || product.options.length === 0) {
      return;
    }

    const colorOption = product.options.find(
      (option) =>
        option.name.toLowerCase() === "color" ||
        option.name.toLowerCase() === "colour",
    );

    const sizeOption = product.options.find(
      (option) =>
        option.name.toLowerCase() === "size",
    );

    /*
    ============================================================
    COLOR
    ============================================================
    */

    if (colorOption && colorOption.values.length) {
      const group = document.createElement("div");

      group.className =
        "gift-grid__variant-group gift-grid__color-group";

      const label = document.createElement("label");

      label.className = "gift-grid__variant-label";
      label.textContent = "Color";

      const colorButtons = document.createElement("div");

      colorButtons.className =
        "gift-grid__color-buttons";

      /*
        Keep White first and Black second when available.
      */
      const colorValues = [...colorOption.values].sort(
        (a, b) => {
          const order = {
            white: 0,
            black: 1,
          };

          return (
            (order[a.toLowerCase()] ?? 2) -
            (order[b.toLowerCase()] ?? 2)
          );
        },
      );

      colorValues.forEach((value) => {
        const button = document.createElement("button");

        button.type = "button";

        button.className =
          "gift-grid__color-button";

        button.textContent = value;

        button.style.setProperty(
          "--swatch-color",
          getColorValue(value),
        );

        button.dataset.color = value;

        button.addEventListener("click", () => {
          const buttons =
            colorButtons.querySelectorAll(
              ".gift-grid__color-button",
            );

          buttons.forEach((item) => {
            item.classList.remove("is-selected");
          });

          button.classList.add("is-selected");

          const selectedIndex =
            Array.from(buttons).indexOf(button);

          colorButtons.classList.add(
            "has-selection",
          );

          colorButtons.style.setProperty(
            "--selected-index",
            selectedIndex,
          );
        });

        colorButtons.appendChild(button);
      });

      group.appendChild(label);
      group.appendChild(colorButtons);

      variantArea.appendChild(group);
    }

    /*
    ============================================================
    SIZE — CUSTOM DROPDOWN
    ============================================================
    */

    if (sizeOption && sizeOption.values.length) {
      const group = document.createElement("div");

      group.className =
        "gift-grid__variant-group gift-grid__size-group";

      const label = document.createElement("label");

      label.className =
        "gift-grid__variant-label";

      label.textContent = "Size";

      /*
        Main dropdown wrapper.
      */
      const dropdown = document.createElement("div");

      dropdown.className =
        "gift-grid__size-dropdown";

      /*
        Selected size.
      */
      dropdown.dataset.selectedValue = "";

      /*
        Dropdown trigger.
      */
      const trigger = document.createElement("button");

      trigger.type = "button";

      trigger.className =
        "gift-grid__size-dropdown-trigger";

      trigger.setAttribute(
        "aria-haspopup",
        "listbox",
      );

      trigger.setAttribute(
        "aria-expanded",
        "false",
      );

      /*
        Visible selected value.
      */
      const valueDisplay =
        document.createElement("span");

      valueDisplay.className =
        "gift-grid__size-dropdown-value";

      valueDisplay.textContent =
        "Choose your size";

      /*
        Dropdown arrow.
      */
      const arrow =
        document.createElement("span");

      arrow.className =
        "gift-grid__size-dropdown-arrow";

      arrow.setAttribute(
        "aria-hidden",
        "true",
      );

      trigger.appendChild(valueDisplay);
      trigger.appendChild(arrow);

      /*
        Options container.
      */
      const optionsContainer =
        document.createElement("div");

      optionsContainer.className =
        "gift-grid__size-dropdown-options";

      optionsContainer.setAttribute(
        "role",
        "listbox",
      );

      /*
        Create size options.
      */
      sizeOption.values.forEach((value) => {
        const optionButton =
          document.createElement("button");

        optionButton.type = "button";

        optionButton.className =
          "gift-grid__size-dropdown-option";

        optionButton.textContent = value;

        optionButton.dataset.value = value;

        optionButton.setAttribute(
          "role",
          "option",
        );

        optionButton.setAttribute(
          "aria-selected",
          "false",
        );

        optionButton.addEventListener(
          "click",
          (event) => {
            event.stopPropagation();

            /*
              Store selected size.
            */
            dropdown.dataset.selectedValue =
              value;

            /*
              Update visible text.
            */
            valueDisplay.textContent =
              value;

            /*
              Remove previous selected state.
            */
            optionsContainer
              .querySelectorAll(
                ".gift-grid__size-dropdown-option",
              )
              .forEach((option) => {
                option.classList.remove(
                  "is-selected",
                );

                option.setAttribute(
                  "aria-selected",
                  "false",
                );
              });

            /*
              Mark current option selected.
            */
            optionButton.classList.add(
              "is-selected",
            );

            optionButton.setAttribute(
              "aria-selected",
              "true",
            );

            /*
              Close dropdown.
            */
            dropdown.classList.remove(
              "is-open",
            );

            trigger.setAttribute(
              "aria-expanded",
              "false",
            );
          },
        );

        optionsContainer.appendChild(
          optionButton,
        );
      });

      /*
        Toggle dropdown.
      */
      trigger.addEventListener(
        "click",
        (event) => {
          event.stopPropagation();

          const isOpen =
            dropdown.classList.contains(
              "is-open",
            );

          /*
            Reset every time dropdown is opened.
          */
          if (!isOpen) {
            dropdown.dataset.selectedValue =
              "";

            valueDisplay.textContent =
              "Choose your size";

            optionsContainer
              .querySelectorAll(
                ".gift-grid__size-dropdown-option",
              )
              .forEach((option) => {
                option.classList.remove(
                  "is-selected",
                );

                option.setAttribute(
                  "aria-selected",
                  "false",
                );
              });
          }

          /*
            Close other open dropdowns.
          */
          grid
            .querySelectorAll(
              ".gift-grid__size-dropdown.is-open",
            )
            .forEach((openDropdown) => {
              if (
                openDropdown !== dropdown
              ) {
                openDropdown.classList.remove(
                  "is-open",
                );

                const openTrigger =
                  openDropdown.querySelector(
                    ".gift-grid__size-dropdown-trigger",
                  );

                if (openTrigger) {
                  openTrigger.setAttribute(
                    "aria-expanded",
                    "false",
                  );
                }
              }
            });

          /*
            Toggle this dropdown.
          */
          dropdown.classList.toggle(
            "is-open",
            !isOpen,
          );

          trigger.setAttribute(
            "aria-expanded",
            String(!isOpen),
          );
        },
      );

      dropdown.appendChild(trigger);
      dropdown.appendChild(
        optionsContainer,
      );

      group.appendChild(label);
      group.appendChild(dropdown);

      variantArea.appendChild(group);
    }
  }

  /*
  ============================================================
  COLOR HELPER
  ============================================================
  */

  function getColorValue(colorName) {
    const color =
      colorName.trim().toLowerCase();

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

  /*
  ============================================================
  GET SELECTED VARIANT
  ============================================================
  */

  function getSelectedVariant() {
    if (!currentProduct) {
      return null;
    }

    /*
      Selected color.
    */
    const selectedColor =
      variantArea.querySelector(
        ".gift-grid__color-button.is-selected",
      );

    /*
      Selected size.
    */
    const sizeDropdown =
      variantArea.querySelector(
        ".gift-grid__size-dropdown",
      );

    const color = selectedColor
      ? selectedColor.dataset.color
      : null;

    const size = sizeDropdown
      ? sizeDropdown.dataset.selectedValue
      : null;

    /*
      Both are required.
    */
    if (!color || !size) {
      return null;
    }

    /*
      Find matching Shopify variant.
    */
    return currentProduct.variants.find(
      (variant) => {
        return (
          variant.options.includes(color) &&
          variant.options.includes(size)
        );
      },
    );
  }

  /*
  ============================================================
  ADD TO CART
  ============================================================
  */

  async function addToCart() {
    if (!currentProduct) {
      return;
    }

    const variant =
      getSelectedVariant();

    if (!variant) {
      message.textContent =
        "Please select a valid variant.";

      return;
    }

    if (!variant.available) {
      message.textContent =
        "This variant is unavailable.";

      return;
    }

    addButton.disabled = true;

    message.textContent = "";

    try {
      /*
        Black + M automatically adds
        the Soft Winter Jacket.
      */
      const shouldAddJacket =
        variant.options &&
        variant.options.includes("Black") &&
        variant.options.includes("M");

      /*
        For Black + M, add both products
        at the same time.
      */
      if (shouldAddJacket) {
        await Promise.all([
          addCartItem(variant.id, 1),
          addSoftWinterJacket(),
        ]);
      } else {
        await addCartItem(variant.id, 1);
      }

      message.textContent =
        "Added to cart!";

      /*
        Close after a short confirmation.
      */
      setTimeout(() => {
        closeModal();
      }, 700);
    } catch (error) {
      console.error(error);

      message.textContent =
        "Something went wrong. Please try again.";
    } finally {
      addButton.disabled = false;
    }
  }

  /*
  ============================================================
  SHOPIFY CART
  ============================================================
  */

  async function addCartItem(
    variantId,
    quantity,
  ) {
    const root =
      window.Shopify && window.Shopify.routes
        ? window.Shopify.routes.root
        : "/";

    const response = await fetch(
      `${root}cart/add.js`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Accept:
            "application/json",
        },
        body: JSON.stringify({
          items: [
            {
              id: variantId,
              quantity: quantity,
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        "Unable to add item to cart.",
      );
    }

    return response.json();
  }

  /*
  ============================================================
  SOFT WINTER JACKET
  ============================================================
  */

  async function addSoftWinterJacket() {
    /*
      Use cached jacket data.
      It is preloaded when the page starts.
    */
    const jacket =
      await fetchProduct(
        "dark-winter-jacket",
      );

    const availableVariant =
      jacket.variants.find(
        (variant) =>
          variant.available,
      );

    if (!availableVariant) {
      return;
    }

    await addCartItem(
      availableVariant.id,
      1,
    );
  }

  /*
  ============================================================
  MONEY
  ============================================================
  */

  function formatMoney(cents) {
    return (
      (cents / 10000)
        .toFixed(2)
        .replace(".", ",") +
      "€"
    );
  }

  /*
  ============================================================
  CLOSE MODAL
  ============================================================
  */

  function closeModal() {
    modal.classList.remove(
      "is-open",
    );

    modal.setAttribute(
      "aria-hidden",
      "true",
    );

    /*
      Clear the old success/error message.
      This prevents "Added to cart!" from
      appearing on the next popup.
    */
    message.textContent = "";

    /*
      Close any open size dropdown.
    */
    grid
      .querySelectorAll(
        ".gift-grid__size-dropdown.is-open",
      )
      .forEach((dropdown) => {
        dropdown.classList.remove(
          "is-open",
        );

        const trigger =
          dropdown.querySelector(
            ".gift-grid__size-dropdown-trigger",
          );

        if (trigger) {
          trigger.setAttribute(
            "aria-expanded",
            "false",
          );
        }
      });

    document.body.style.overflow =
      "";
  }

  /*
  ============================================================
  CLICK HANDLING
  ============================================================
  */

  grid.addEventListener(
    "click",
    (event) => {
      const productTrigger =
        event.target.closest(
          ".gift-grid__hotspot",
        );

      if (productTrigger) {
        const handle =
          productTrigger.dataset
            .productHandle;

        console.log(
          "HOTSPOT CLICKED:",
          handle,
        );

        openProduct(handle);

        return;
      }

      if (
        event.target.closest(
          ".gift-grid__modal-close",
        )
      ) {
        closeModal();

        return;
      }

      if (
        event.target.closest(
          ".gift-grid__modal-overlay",
        )
      ) {
        closeModal();

        return;
      }

      if (
        event.target.closest(
          ".gift-grid__add-button",
        )
      ) {
        addToCart();
      }
    },
  );

  /*
  ============================================================
  CLOSE SIZE DROPDOWN OUTSIDE
  ============================================================
  */

  document.addEventListener(
    "click",
    (event) => {
      const openDropdown =
        grid.querySelector(
          ".gift-grid__size-dropdown.is-open",
        );

      if (!openDropdown) {
        return;
      }

      if (
        !openDropdown.contains(
          event.target,
        )
      ) {
        openDropdown.classList.remove(
          "is-open",
        );

        const trigger =
          openDropdown.querySelector(
            ".gift-grid__size-dropdown-trigger",
          );

        if (trigger) {
          trigger.setAttribute(
            "aria-expanded",
            "false",
          );
        }
      }
    },
  );

  /*
  ============================================================
  ESCAPE KEY
  ============================================================
  */

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape") {
        return;
      }

      /*
        Close dropdown first.
      */
      const openDropdown =
        grid.querySelector(
          ".gift-grid__size-dropdown.is-open",
        );

      if (openDropdown) {
        openDropdown.classList.remove(
          "is-open",
        );

        const trigger =
          openDropdown.querySelector(
            ".gift-grid__size-dropdown-trigger",
          );

        if (trigger) {
          trigger.setAttribute(
            "aria-expanded",
            "false",
          );
        }

        return;
      }

      /*
        Otherwise close modal.
      */
      if (
        modal.classList.contains(
          "is-open",
        )
      ) {
        closeModal();
      }
    },
  );

  /*
  ============================================================
  PRELOAD ALL PRODUCTS
  ============================================================
  */

  setTimeout(() => {
    /*
      Preload all six Gift Guide products.
    */
    preloadProducts();

    /*
      Preload Soft Winter Jacket because
      Black + M automatically adds it.
    */
    fetchProduct(
      "dark-winter-jacket",
    )
      .then((jacket) => {
        const imageUrl =
          jacket.featured_image ||
          (jacket.images &&
          jacket.images.length
            ? jacket.images[0]
            : null);

        if (imageUrl) {
          const image =
            new Image();

          image.src = imageUrl;
        }
      })
      .catch((error) => {
        console.error(
          "Soft Winter Jacket preload failed:",
          error,
        );
      });
  }, 500);
}