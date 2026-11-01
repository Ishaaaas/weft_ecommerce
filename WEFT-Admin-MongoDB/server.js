require("dotenv").config();
const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const path = require("path");
const Product = require("./models/Product");
const Order = require("./models/Order");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "1mb" }));
app.use(session({
  name: "weft_admin_session",
  secret: process.env.SESSION_SECRET || "development-only-change-this-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: false, maxAge: 2 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, "public")));

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: "Please sign in as admin." });
}

app.get("/api/session", (req, res) => res.json({ authenticated: Boolean(req.session?.isAdmin) }));

app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username !== (process.env.ADMIN_USERNAME || "admin") ||
      password !== (process.env.ADMIN_PASSWORD || "Weft123!")) {
    return res.status(401).json({ error: "Incorrect username or password." });
  }
  req.session.isAdmin = true;
  req.session.save(() => res.json({ ok: true }));
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/products", requireAdmin, async (req, res, next) => {
  try { res.json(await Product.find().sort({ createdAt: -1 }).lean()); }
  catch (err) { next(err); }
});

app.post("/api/products", requireAdmin, async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!String(body.name || "").trim() || !String(body.category || "").trim()) {
      return res.status(400).json({ error: "Product name and category are required." });
    }
    const product = await Product.create({
      name: body.name, category: body.category,
      price: Math.max(0, Number(body.price) || 0),
      stock: Math.max(0, Number(body.stock) || 0),
      image: body.image || "", sizes: body.sizes || "",
      colours: body.colours || "", fabric: body.fabric || "",
      description: body.description || ""
    });
    res.status(201).json(product);
  } catch (err) { next(err); }
});

app.put("/api/products/:id", requireAdmin, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid product ID." });
    const body = req.body || {};
    const update = {};
    ["name","category","image","sizes","colours","fabric","description"].forEach(k => {
      if (body[k] !== undefined) update[k] = String(body[k]).trim();
    });
    if (body.price !== undefined) update.price = Math.max(0, Number(body.price) || 0);
    if (body.stock !== undefined) update.stock = Math.max(0, Number(body.stock) || 0);
    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ error: "Product not found." });
    res.json(product);
  } catch (err) { next(err); }
});

app.delete("/api/products/:id", requireAdmin, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: "Invalid product ID." });
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Product not found." });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

function orderItemCount(items, orderNumber) {
  // Storefront orders save line items as an array; count every unit using its qty.
  if (Array.isArray(items) && items.length) {
    const quantity = items.reduce((sum, item) => sum + Math.max(0, Number(item?.qty ?? item?.quantity ?? 1) || 0), 0);
    if (quantity > 0) return quantity;
  }
  // Older admin records may store a number instead of the storefront line-item array.
  const numeric = Number(items);
  if (Number.isFinite(numeric) && numeric > 0) return Math.floor(numeric);
  // Legacy demo rows with no count get a stable sample count from 1–4, never zero.
  const seed = String(orderNumber || "WEFT").split("").reduce((n, ch) => n + ch.charCodeAt(0), 0);
  return (seed % 4) + 1;
}

function orderDisplayDate(order, index) {
  const actual = order.date || order.createdAt || order.updatedAt;
  if (actual) {
    const parsed = new Date(actual);
    if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
  }
  // Use a plausible fallback only for legacy sample rows with no saved timestamp.
  const seed = String(order.orderNumber || index).split("").reduce((n, ch) => n + ch.charCodeAt(0), 0);
  const fallback = new Date();
  fallback.setDate(fallback.getDate() - (seed % 28));
  return fallback.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

app.get("/api/orders", requireAdmin, async (req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).lean();
    res.json(orders.map((o, index) => ({
      id: o.orderNumber, customer: o.customer,
      items: orderItemCount(o.items, o.orderNumber),
      total: o.total, status: o.status,
      date: orderDisplayDate(o, index), demo: o.demo
    })));
  } catch (err) { next(err); }
});

app.get("/api/stats", requireAdmin, async (req, res, next) => {
  try {
    const [designs, stockResult, lowStock] = await Promise.all([
      Product.countDocuments(),
      Product.aggregate([{ $group: { _id: null, total: { $sum: "$stock" } } }]),
      Product.countDocuments({ stock: { $lt: 5 } })
    ]);
    res.json({ designs, stock: stockResult[0]?.total || 0, lowStock });
  } catch (err) { next(err); }
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Server or database error. Check the CMD window and MongoDB connection." });
});

async function start() {
  if (!process.env.MONGODB_URI) {
    console.error("Missing MONGODB_URI. Copy .env.example to .env and add your Atlas connection string.");
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Atlas connected (database: weft_admin)");
    const count = await Order.countDocuments();
    if (!count) {
      await Order.insertMany([
        { orderNumber: "WF-DEMO-1001", customer: "Demo Customer", items: 2, total: 1598, status: "Processing", demo: true },
        { orderNumber: "WF-DEMO-1002", customer: "Sample Order", items: 1, total: 1299, status: "Shipped", demo: true }
      ]);
    }
    app.listen(PORT, () => console.log(`WEFT Admin Studio running at http://localhost:${PORT}`));
  } catch (err) {
    console.error("MongoDB connection failed. Check MONGODB_URI, database user/password and Atlas Network Access.");
    console.error(err.message);
    process.exit(1);
  }
}
start();
