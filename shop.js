// Global cart object
let cart = {};

// Configuration
const API_BASE_URL = window.location.origin; // Use current domain
let stripe;
let elements;
let cardElement;

// Initialize when page loads
document.addEventListener("DOMContentLoaded", async () => {
  try {
    console.log("Starting initialization...");

    // Initialize cart display first (this should work without Stripe)
    updateCartDisplay();
    validateForm();

    // Add event listeners for form validation
    ["fullName", "email", "phone", "Date"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("input", validateForm);
    });

    // Test backend connection
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();
      console.log("API connection OK:", data);
    } catch (err) {
      console.error("API connection failed:", err);
      showError(
        "Backend connection failed. Please check if your server is running."
      );
    }

    // Initialize Stripe
    try {
      // First get the publishable key from your backend
      const stripeResponse = await fetch(`${API_BASE_URL}/stripe-key`);
      const { publishableKey } = await stripeResponse.json();

      if (!publishableKey) {
        throw new Error("Failed to get Stripe key");
      }

      stripe = Stripe(publishableKey);
      elements = stripe.elements();

      const style = {
        base: {
          color: "#32325d",
          fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
          fontSmoothing: "antialiased",
          fontSize: "16px",
          "::placeholder": {
            color: "#aab7c4",
          },
        },
        invalid: {
          color: "#fa755a",
          iconColor: "#fa755a",
        },
      };

      cardElement = elements.create("card", { style });
      cardElement.mount("#card-element");

      cardElement.on("change", (event) => {
        const displayError = document.getElementById("card-errors");
        if (event.error) {
          displayError.textContent = event.error.message;
        } else {
          displayError.textContent = "";
        }
      });
      // For now, let's skip Stripe initialization to get the cart working
      // You can uncomment this when you have your Stripe keys
      /*
      stripe = Stripe('pk_test_your_stripe_publishable_key_here'); // Replace with your actual key
      elements = stripe.elements();
      cardElement = elements.create("card");
      cardElement.mount("#card-element");

      cardElement.on("change", ({ error }) => {
        document.getElementById("card-errors").textContent = error ? error.message : "";
      });
      */

      // Add checkout form listener (modified to handle missing Stripe)
      document
        .getElementById("checkout-form")
        .addEventListener("submit", handleCheckout);

      console.log("Initialization completed successfully");
    } catch (stripeError) {
      console.error("Stripe initialization failed:", stripeError);
      showError(
        "Payment system initialization failed. Cart functionality will still work."
      );
    }
  } catch (error) {
    console.error("Initialization error:", error);
    showError("Page initialization failed: " + error.message);
  }
});

// Toggle mobile navigation
function toggleNav() {
  const navMenu = document.getElementById("nav-menu");
  navMenu.classList.toggle("active");
}

// Add item to cart
function addToCart(name, price) {
  console.log(`Adding to cart: ${name} - R${price}`); // Debug log
  
  if (cart[name]) {
    cart[name].quantity++;
  } else {
    cart[name] = { price, quantity: 1 };
  }
  
  updateCartDisplay();
  validateForm();
  
  // Show feedback to user
  showTempMessage(`${name} added to cart!`);
}

// Remove item from cart
function removeFromCart(name) {
  console.log(`Removing from cart: ${name}`); // Debug log
  delete cart[name];
  updateCartDisplay();
  validateForm();
}

// Update item quantity
function updateQuantity(name, change) {
  console.log(`Updating quantity for ${name}: ${change}`); // Debug log
  
  if (cart[name]) {
    cart[name].quantity += change;
    if (cart[name].quantity <= 0) {
      delete cart[name];
    }
  }
  
  updateCartDisplay();
  validateForm();
}

// Update cart display
function updateCartDisplay() {
  const cartContent = document.getElementById("cart-content");
  const cartTotal = document.getElementById("cart-total");
  const totalSpan = document.getElementById("total");
  const checkoutBtn = document.getElementById("checkout-btn");

  if (!cartContent || !cartTotal || !totalSpan || !checkoutBtn) {
    console.error("Cart elements not found in DOM");
    return;
  }

  cartContent.innerHTML = "";
  const items = Object.entries(cart);

  if (items.length === 0) {
    cartContent.innerHTML = "<div class='cart-empty'>Your cart is empty</div>";
    cartTotal.style.display = "none";
    checkoutBtn.disabled = true;
    return;
  }

  let total = 0;
  const ul = document.createElement("ul");
  
  items.forEach(([name, { price, quantity }]) => {
    const itemTotal = price * quantity;
    total += itemTotal;
    
    const li = document.createElement("li");
    li.className = "cart-item";
    li.innerHTML = `
      <div class="item-info">
        <div class="item-name">${name}</div>
        <div class="item-price">R${price} each</div>
      </div>
      <div class="quantity-controls">
        <button class="quantity-btn" onclick="updateQuantity('${name}', -1)" ${quantity <= 1 ? "disabled" : ""}>-</button>
        <span class="quantity">${quantity}</span>
        <button class="quantity-btn" onclick="updateQuantity('${name}', 1)">+</button>
      </div>
      <div class="item-total">
        <div style="font-weight: bold; margin-bottom: 5px;">R${itemTotal}</div>
        <button class="remove-btn" onclick="removeFromCart('${name}')">Remove</button>
      </div>
    `;
    ul.appendChild(li);
  });

  cartContent.appendChild(ul);
  totalSpan.textContent = total.toFixed(2);
  cartTotal.style.display = "block";
  checkoutBtn.disabled = false;
}

// Show temporary message
function showTempMessage(message) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "temp-message";
  messageDiv.textContent = message;
  messageDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #28a745;
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    z-index: 1000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  `;
  document.body.appendChild(messageDiv);
  setTimeout(() => messageDiv.remove(), 2000);
}

// Show error message
function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.textContent = message;
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #dc3545;
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    z-index: 1000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  `;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 5000);
}

// Show success message
function showSuccessMessage(message) {
  const successDiv = document.getElementById("success-message");
  if (successDiv) {
    successDiv.textContent = message;
    successDiv.style.display = "block";
    setTimeout(() => {
      successDiv.style.display = "none";
    }, 5000);
  }
}

// Clear form and cart
function clearCart() {
  cart = {};
  updateCartDisplay();
  validateForm();
  
  const form = document.getElementById("checkout-form");
  if (form) {
    form.reset();
  }
}

// Form validation
function validateForm() {
  const fullName = document.getElementById("fullName")?.value.trim() || "";
  const email = document.getElementById("email")?.value.trim() || "";
  const phone = document.getElementById("phone")?.value.trim() || "";
  const collectDate = document.getElementById("Date")?.value.trim() || "";
  const hasItems = Object.keys(cart).length > 0;
  const checkoutBtn = document.getElementById("checkout-btn");

  if (checkoutBtn) {
    checkoutBtn.disabled = !(fullName && email && phone && collectDate && hasItems);
  }
}

// Handle checkout
async function handleCheckout(event) {
  event.preventDefault();

  if (Object.keys(cart).length === 0) {
    showError("Your cart is empty.");
    return;
  }

  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const collectDate = document.getElementById("Date").value.trim();

  if (!fullName || !email || !phone || !collectDate) {
    showError("Please fill in all required fields.");
    return;
  }

  const submitBtn = event.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Processing...";

  try {
    // Prepare cart items
    const cartItems = Object.entries(cart).map(([name, { price, quantity }]) => ({
      name,
      price,
      quantity,
    }));

    // Create payment intent
    const response = await fetch(`${API_BASE_URL}/create-payment-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        email,
        phone,
        collectDate,
        cartItems,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create payment");
    }

    const { clientSecret } = await response.json();

    // Confirm payment with Stripe
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: fullName,
          email: email,
          phone: phone,
        },
      },
    });

    if (error) {
      throw error;
    }

    if (paymentIntent.status === 'succeeded') {
      showSuccessMessage("Payment successful! Thank you for your order.");
      clearCart();
    } else {
      throw new Error("Payment not completed");
    }
  } catch (err) {
    console.error("Checkout error:", err);
    showError(err.message || "Payment failed. Please try again.");
  } finally {
    // Restore button state
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
  // Uncomment this section when you have Stripe properly configured
  /*
  const cartItems = Object.entries(cart).map(([name, { price, quantity }]) => ({
    name,
    price,
    quantity,
  }));

  try {
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Processing...";

    // Create payment intent
    const res = await fetch(`${API_BASE_URL}/create-payment-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        email,
        phone,
        collectDate,
        cartItems,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create payment intent");

    const { clientSecret } = data;

    // Confirm payment
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: fullName,
          email,
        },
      },
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    // Mark payment as completed
    await fetch(`${API_BASE_URL}/update-payment-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentIntentId: result.paymentIntent.id,
        status: "completed",
      }),
    });

    showSuccessMessage("Payment successful! Thank you for your order.");
    clearCart();

  } catch (err) {
    console.error("Checkout error:", err);
    showError(err.message || "Payment failed. Please try again.");
  } finally {
    // Restore button state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
  */
}