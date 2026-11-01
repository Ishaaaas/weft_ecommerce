const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  customer: { type: String, required: true },
  items: { type: Number, default: 1 },
  total: { type: Number, default: 0 },
  status: { type: String, default: "Processing" },
  date: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  demo: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
