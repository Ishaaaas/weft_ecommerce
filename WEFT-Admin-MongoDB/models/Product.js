const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0, default: 0 },
  stock: { type: Number, min: 0, default: 0 },
  image: { type: String, trim: true, default: "" },
  sizes: { type: String, trim: true, default: "" },
  colours: { type: String, trim: true, default: "" },
  fabric: { type: String, trim: true, default: "" },
  description: { type: String, trim: true, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
