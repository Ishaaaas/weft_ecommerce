const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true },
    name: { type: String, required: true },
    color: { type: String, required: true },
    size: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    items: { type: [itemSchema], validate: (v) => v.length > 0 },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true, lowercase: true, index: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      pin: { type: String, required: true },
    },
    subtotal: { type: Number, required: true },
    shipping: { type: Number, required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['placed', 'packed', 'shipped', 'delivered', 'cancelled'],
      default: 'placed',
    },
    // No payment gateway is connected yet, so every order starts as pending.
    paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
