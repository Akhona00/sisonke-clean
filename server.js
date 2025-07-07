require("dotenv").config();
const express = require("express");
const path = require("path");
const { Pool } = require("pg");
const Stripe = require("stripe");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Set the environment to production if not set
if (NODE_ENV !== "production") {
  process.env.NODE_ENV = "development";
} else {
  process.env.NODE_ENV = "production";
}

// Validate environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("STRIPE_SECRET_KEY is required in environment variables");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required in environment variables");
  process.exit(1);
}

// server.js
app.get("/stripe-key", (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY, // ✅ Correct key is sent
  });
});

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Database connection with better error handling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// Test database connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("Database connected successfully");
  }
});

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || ["http://localhost:5000", "http://127.0.0.1:5000"],
    credentials: true,
  })
);

// Stripe webhook endpoint (must be before body parsers)
app.post(
  "/stripe-webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      console.log("Webhook secret not configured");
      return res.status(400).send("Webhook secret not configured");
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.log(`Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        await pool.query(
          "UPDATE orders SET payment_status = 'completed' WHERE stripe_payment_intent_id = $1",
          [paymentIntent.id]
        );
        console.log(`Payment succeeded for ${paymentIntent.id}`);
        break;
      case "payment_intent.payment_failed":
        const failedPayment = event.data.object;
        await pool.query(
          "UPDATE orders SET payment_status = 'failed' WHERE stripe_payment_intent_id = $1",
          [failedPayment.id]
        );
        console.log(`Payment failed for ${failedPayment.id}`);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  }
);

// Apply body parsers after webhook
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve static files
app.use("/static", express.static(path.join(__dirname, "templates", "static")));
app.use(express.static(path.join(__dirname, "templates")));

// Routes for serving HTML pages
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "home.html"));
});

app.get("/shop", (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "shop.html"));
});

app.get("/service", (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "service.html"));
});

app.get("/about", (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "about.html"));
});

app.get("/contact", (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "contact.html"));
});

app.get("/portfolio", (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "portfolio.html"));
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// Create database tables if not exists
async function createTables() {
  try {
    // Create orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        collect_date DATE NOT NULL,
        items JSON NOT NULL,
        total_amount NUMERIC(10, 2) NOT NULL,
        stripe_payment_intent_id VARCHAR(255),
        payment_status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create contacts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        service VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending'
      );
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
      CREATE INDEX IF NOT EXISTS idx_contacts_service ON contacts(service);
      CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);
      CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
    `);

    console.log("Database tables created/verified");
  } catch (error) {
    console.error("Error creating tables:", error);
  }
}

// Input validation middleware for orders
function validateOrderInput(req, res, next) {
  const { fullName, email, phone, collectDate, cartItems } = req.body;

  if (!fullName || fullName.trim().length < 2) {
    return res.status(400).json({
      error: "Full name is required and must be at least 2 characters",
    });
  }

  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email address is required" });
  }

  if (!phone || phone.trim().length < 10) {
    return res.status(400).json({ error: "Valid phone number is required" });
  }

  if (!collectDate || isNaN(Date.parse(collectDate))) {
    return res.status(400).json({ error: "Valid collection date is required" });
  }

  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ error: "Cart items are required" });
  }

  // Validate each cart item
  for (const item of cartItems) {
    if (
      !item.name ||
      !item.price ||
      !item.quantity ||
      typeof item.price !== "number" ||
      typeof item.quantity !== "number" ||
      item.price <= 0 ||
      item.quantity <= 0
    ) {
      return res.status(400).json({ error: "Invalid cart item data" });
    }
  }

  next();
}

// Input validation middleware for contacts
function validateContactInput(req, res, next) {
  const { name, email, service, message } = req.body;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: "Name is required and must be at least 2 characters",
    });
  }

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address",
    });
  }

  // Valid services list
  const validServices = [
    "logo-design",
    "tshirt-printing",
    "flyers",
    "branding",
    "social-media",
    "other",
  ];

  if (!service || !validServices.includes(service)) {
    return res.status(400).json({
      success: false,
      message: "Invalid service selected",
    });
  }

  if (!message || message.trim().length < 10) {
    return res.status(400).json({
      success: false,
      message: "Message is required and must be at least 10 characters",
    });
  }

  next();
}

// ========================= CONTACT FORM ROUTES =========================

// Handle contact form submission
app.post("/contact", validateContactInput, async (req, res) => {
  const { name, email, service, message } = req.body;

  try {
    // Insert contact into database
    const query = `
      INSERT INTO contacts (name, email, service, message)
      VALUES ($1, $2, $3, $4)
      RETURNING id, created_at
    `;

    const result = await pool.query(query, [name, email, service, message]);
    const newContact = result.rows[0];

    console.log("New contact saved:", {
      id: newContact.id,
      name,
      email,
      service,
      timestamp: newContact.created_at,
    });

    // Send success response as pop up
  

    res.status(201).json({
      success: true,
      message: "Contact information saved successfully",
      contact_id: newContact.id,
      timestamp: newContact.created_at,
    });
  } catch (err) {
    console.error("Error saving contact:", err);
    res.status(500).json({
      success: false,
      message: "Error saving contact information. Please try again.",
    });
  }
}); 

// Get all contacts (for admin purposes)
app.get("/api/contacts", async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT id, name, email, service, message, created_at, status
      FROM contacts
    `;
    let params = [];

    if (status) {
      query += " WHERE status = $1";
      params.push(status);
    }

    query +=
      " ORDER BY created_at DESC LIMIT $" +
      (params.length + 1) +
      " OFFSET $" +
      (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);

 // Get total count
    const countQuery = status
      ? "SELECT COUNT(*) FROM contacts WHERE status = $1"
      : "SELECT COUNT(*) FROM contacts";
    const countParams = status ? [status] : [];
    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      contacts: result.rows,
      totalCount,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (err) {
    console.error("Error fetching contacts:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching contacts",
    });
  }
});

// Get specific contact by ID
app.get("/api/contacts/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      SELECT id, name, email, service, message, created_at, status
      FROM contacts
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    res.json({
      success: true,
      contact: result.rows[0],
    });
  } catch (err) {
    console.error("Error fetching contact:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching contact",
    });
  }
});

// Update contact status
app.patch("/api/contacts/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ["pending", "contacted", "completed", "cancelled"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid status. Must be one of: pending, contacted, completed, cancelled",
    });
  }

  try {
    const query = `
      UPDATE contacts
      SET status = $1
      WHERE id = $2
      RETURNING id, status
    `;

    const result = await pool.query(query, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    res.json({
      success: true,
      message: "Contact status updated successfully",
      contact: result.rows[0],
    });
  } catch (err) {
    console.error("Error updating contact status:", err);
    res.status(500).json({
      success: false,
      message: "Error updating contact status",
    });
  }
}); 

// Delete contact
app.delete("/api/contacts/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const query = "DELETE FROM contacts WHERE id = $1 RETURNING id";
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    res.json({
      success: true,
      message: "Contact deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting contact:", err);
    res.status(500).json({
      success: false,
      message: "Error deleting contact",
    });
  }
});

// ========================= EXISTING STRIPE/ORDER ROUTES =========================

// Create payment intent endpoint
app.post("/create-payment-intent", validateOrderInput, async (req, res) => {
  try {
    const { fullName, email, phone, collectDate, cartItems } = req.body;

    // Calculate total amount with validation
    const totalAmount = cartItems.reduce((acc, item) => {
      return acc + item.price * item.quantity;
    }, 0);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: "zar",
      receipt_email: email,
      description: `Order for ${fullName}`,
      metadata: {
        customer_name: fullName,
        customer_email: email,
        customer_phone: phone,
        collect_date: collectDate,
        items_count: cartItems.length,
      },
      shipping: {
        name: fullName,
        phone: phone,
        address: {
          line1: "N/A", // You can collect this if needed
          city: "Pietermaritzburg",
          postal_code: "3201",
          country: "ZA",
        },
      },
    });

    // Save order to database
    const result = await pool.query(
      `INSERT INTO orders (full_name, email, phone, collect_date, items, total_amount, stripe_payment_intent_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        fullName,
        email,
        phone,
        collectDate,
        JSON.stringify(cartItems),
        totalAmount,
        paymentIntent.id,
      ]
    );

    res.json({
      clientSecret: paymentIntent.client_secret,
      orderId: result.rows[0].id,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);

    if (error.type === "StripeCardError") {
      res.status(400).json({ error: error.message });
    } else if (error.type === "StripeInvalidRequestError") {
      res.status(400).json({ error: "Invalid payment request" });
    } else {
      res.status(500).json({ error: "Failed to create payment intent" });
    }
  }
});

// Update payment status endpoint
app.post("/update-payment-status", async (req, res) => {
  try {
    const { paymentIntentId, status } = req.body;

    if (!paymentIntentId || !status) {
      return res
        .status(400)
        .json({ error: "Payment intent ID and status are required" });
    }

    if (!["pending", "completed", "failed", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid payment status" });
    }

    const result = await pool.query(
      "UPDATE orders SET payment_status = $1 WHERE stripe_payment_intent_id = $2 RETURNING id",
      [status, paymentIntentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    console.log(
      `Updated payment status for order ${result.rows[0].id} to ${status}`
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({ error: "Failed to update payment status" });
  }
});

// Get order status endpoint
app.get("/order-status/:paymentIntentId", async (req, res) => {
  try {
    const { paymentIntentId } = req.params;

    if (!paymentIntentId) {
      return res.status(400).json({ error: "Payment intent ID is required" });
    }

    const result = await pool.query(
      "SELECT id, full_name, email, phone, collect_date, items, total_amount, payment_status, created_at FROM orders WHERE stripe_payment_intent_id = $1",
      [paymentIntentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching order status:", error);
    res.status(500).json({ error: "Failed to fetch order status" });
  }
});

// Get all orders endpoint (for admin)
app.get("/orders", async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    let query = "SELECT * FROM orders";
    let params = [];

    if (status) {
      query += " WHERE payment_status = $1";
      params.push(status);
    }

    query +=
      " ORDER BY created_at DESC LIMIT $" +
      (params.length + 1) +
      " OFFSET $" +
      (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    const countQuery = status
      ? "SELECT COUNT(*) FROM orders WHERE payment_status = $1"
      : "SELECT COUNT(*) FROM orders";
    const countParams = status ? [status] : [];
    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      orders: result.rows,
      totalCount,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  pool.end(() => {
    console.log("Database pool closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  pool.end(() => {
    console.log("Database pool closed");
    process.exit(0);
  });
});

// Initialize database and start server
createTables()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Visit http://localhost:${PORT} to view the application`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      /* console.log(
        `Contact API available at: http://localhost:${PORT}/api/contacts`
      ); */
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  });

module.exports = app;
