const mongoose = require('mongoose');

const colorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    hex: { type: String, required: true, match: /^#[0-9a-fA-F]{6}$/ },
  },
  { _id: false }
);

const factSchema = new mongoose.Schema(
  { label: { type: String, required: true }, value: { type: String, required: true } },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    cat: {
      type: String,
      required: true,
      enum: ['Shirts', 'Tees', 'Knitwear', 'Bottoms', 'Outerwear'],
      index: true,
    },
    // How the garment is drawn on the front end.
    type: {
      type: String,
      required: true,
      enum: ['tee', 'shirt', 'overshirt', 'hoodie', 'sweater', 'chino', 'jeans', 'shorts'],
    },
    tex: {
      type: String,
      required: true,
      enum: ['oxford', 'linen', 'jersey', 'fleece', 'knit', 'denim', 'twill', 'wool'],
    },
    options: { type: mongoose.Schema.Types.Mixed, default: {} },

    price: { type: Number, required: true, min: 0 },
    was: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    n: { type: Number, default: 0, min: 0 },
    tag: { type: String, default: '' },
    colors: { type: [colorSchema], validate: (v) => v.length > 0 },
    sizes: { type: [String], validate: (v) => v.length > 0 },
    out: { type: [String], default: [] },

    spec: { type: String, required: true },
    desc: { type: String, required: true },
    facts: { type: [factSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
