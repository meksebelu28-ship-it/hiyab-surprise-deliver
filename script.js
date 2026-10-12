
const $ = (selector) => document.querySelector(selector);

const cartKey = "hiyab-cart";

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(cartKey)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(cartKey, JSON.stringify(cart));
  renderCart();
}

function updateCartCount() {
  const count = getCart().reduce((sum, item) => sum + item.quantity, 0);
  const el = $("#cart-count");
  if (el) el.textContent = count;
}

function renderCart() {
  updateCartCount();

  const container = $("#cart-items");
  const totalEl = $("#cart-total");
  if (!container || !totalEl) return;

  const cart = getCart();

  if (!cart.length) {
    container.textContent = "Your cart is empty.";
    totalEl.textContent = "0.00";
    return;
  }

  container.replaceChildren();
  let total = 0;

  cart.forEach(item => {
    total += item.price * item.quantity;

    const row = document.createElement("div");
    row.className = "cart-row";

    const label = document.createElement("span");
    label.textContent = `${item.name} × ${item.quantity}`;

    const price = document.createElement("strong");
    price.textContent = `$${(item.price * item.quantity).toFixed(2)}`;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "−";
    remove.setAttribute("aria-label", `Remove one ${item.name}`);
    remove.addEventListener("click", () => {
      const next = getCart();
      const found = next.find(p => p.id === item.id);
      if (!found) return;

      found.quantity -= 1;
      saveCart(next.filter(p => p.quantity > 0));
    });

    row.append(label, price, remove);
    container.append(row);
  });

  totalEl.textContent = total.toFixed(2);
}

function addToCart(product) {
  const cart = getCart();
  const found = cart.find(item => item.id === product.id);

  if (found) {
    found.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1
    });
  }

  saveCart(cart);
}

async function loadProducts() {
  const grid = $("#product-grid");
  if (!grid) return;

  const status = $("#product-status");
  const empty = $("#no-products");
  const search = $("#product-search");
  const category = $("#category-filter");

  async function render() {
    grid.replaceChildren();
    empty.hidden = true;
    status.textContent = "Loading products...";

    const params = new URLSearchParams();
    if (search?.value.trim()) {
      params.set("search", search.value.trim());
    }
    if (category?.value) {
      params.set("category", category.value);
    }

    try {
      const response = await fetch(`/api/products?${params}`, {
        cache: "no-store"
      });

      if (!response.ok) throw new Error("Products request failed");

      const data = await response.json();
      const products = data.products || [];

      status.textContent = `${products.length} products found`;
      empty.hidden = products.length !== 0;

      products.forEach(product => {
        const card = document.createElement("article");
        card.className = "product-card";

        const img = document.createElement("img");
        img.src = product.image;
        img.alt = product.name;
        img.loading = "lazy";
        img.onerror = () => {
          img.onerror = null;
          img.src = "https://placehold.co/600x400/f4e8db/762a3a?text=Hiyab+Gift";
        };

        const info = document.createElement("div");
        info.className = "product-info";

        const categoryText = document.createElement("span");
        categoryText.className = "product-category";
        categoryText.textContent = product.category;

        const title = document.createElement("h3");
        title.textContent = product.name;

        const price = document.createElement("p");
        price.className = "product-price";
        price.textContent = `$${Number(product.price).toFixed(2)}`;

        const button = document.createElement("button");
        button.className = "btn";
        button.type = "button";
        button.textContent = "Add to Cart";
        button.addEventListener("click", () => {
          addToCart(product);
          button.textContent = "Added ✓";
          setTimeout(() => {
            button.textContent = "Add to Cart";
          }, 1200);
        });

        info.append(categoryText, title, price, button);
        card.append(img, info);
        grid.append(card);
      });
    } catch (error) {
      console.error(error);
      status.textContent =
        "Could not load products. Please check that the server is running.";
    }
  }

  search?.addEventListener("input", render);
  category?.addEventListener("change", render);

  // Allow category links from the Home page.
  const urlCategory = new URLSearchParams(location.search).get("category");
  if (urlCategory && category) {
    const option = [...category.options].find(
      item => item.value.toLowerCase() === urlCategory.toLowerCase()
    );
    if (option) category.value = option.value;
  }

  await render();
}

function setupAI() {
  const toggle = $("#ai-toggle");
  const panel = $("#ai-panel");
  const close = $("#ai-close");
  const form = $("#ai-form");
  const input = $("#ai-input");
  const messages = $("#ai-messages");

  if (!toggle || !panel || !form || !input || !messages) return;

  toggle.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) input.focus();
  });

  close?.addEventListener("click", () => {
    panel.hidden = true;
  });

  function addMessage(text, type) {
    const bubble = document.createElement("div");
    bubble.className = type === "user" ? "user-message" : "bot-message";
    bubble.textContent = text;
    messages.append(bubble);
    messages.scrollTop = messages.scrollHeight;
    return bubble;
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const message = input.value.trim();
    if (!message) return;

    addMessage(message, "user");
    input.value = "";
    input.disabled = true;

    const waiting = addMessage("One moment, please...", "bot");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "AI request failed");
      }

      waiting.textContent = data.reply;
    } catch (error) {
      waiting.textContent =
        "Sorry, I cannot connect right now. Please try again.";
      console.error("AI assistant:", error);
    } finally {
      input.disabled = false;
      input.focus();
      messages.scrollTop = messages.scrollHeight;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
  renderCart();
  loadProducts();
  setupAI();
});
