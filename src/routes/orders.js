const crypto = require('crypto');
const express = require('express');
const Product = require('../models/Product');
const Order = require('../models/Order');

const router = express.Router();

const FREE_SHIPPING_OVER = 3000;
const SHIPPING_FEE = 99;
const MAX_QTY = 10;
const MAX_LINES = 30;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function str(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function validateCustomer(c) {
  const errors = [];
  const customer = {
    name: str(c && c.name),
    email: str(c && c.email).toLowerCase(),
    phone: str(c && c.phone).replace(/[\s-]/g, ''),
    address: str(c && c.address),
    city: str(c && c.city),
    pin: str(c && c.pin),
  };
  if (customer.name.length < 2 || customer.name.length > 80) errors.push('Enter your full name.');
  if (!EMAIL_RE.test(customer.email) || customer.email.length > 120) errors.push('Enter a valid email address.');
  if (!/^\+?\d{7,15}$/.test(customer.phone)) errors.push('Enter a valid phone number.');
  if (customer.address.length < 5 || customer.address.length > 200) errors.push('Enter your delivery address.');
  if (customer.city.length < 2 || customer.city.length > 60) errors.push('Enter your city.');
  if (!/^\d{6}$/.test(customer.pin)) errors.push('Enter a 6-digit PIN code.');
  return { customer, errors };
}

function makeOrderNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `WF-${stamp}${rand}`;
}

// POST /api/orders
// Body: { items: [{ productId, colorIndex, size, qty }], customer: { name, email, phone, address, city, pin } }
// Prices are always read from the database, never from the request.
router.post('/', async (req, res, next) => {
  try {
    const { items, customer: rawCustomer } = req.body || {};

    if (!Array.isArray(items) || items.length === 0 || items.length > MAX_LINES) {
      return res.status(400).json({ error: 'Your cart is empty or too large.' });
    }

    const { customer, errors } = validateCustomer(rawCustomer);
    if (errors.length) return res.status(400).json({ error: errors[0], details: errors });

    const ids = [...new Set(items.map((i) => Number(i && i.productId)))];
    if (ids.some((id) => !Number.isInteger(id))) {
      return res.status(400).json({ error: 'One of the items in your cart is invalid.' });
    }
    const products = await Product.find({ id: { $in: ids } }).lean();
    const byId = new Map(products.map((p) => [p.id, p]));

    const lines = [];
    for (const item of items) {
      const p = byId.get(Number(item.productId));
      const ci = Number(item.colorIndex);
      const qty = Number(item.qty);
      const size = str(item.size);

      if (!p) return res.status(400).json({ error: 'A product in your cart is no longer available.' });
      if (!Number.isInteger(ci) || ci < 0 || ci >= p.colors.length) {
        return res.status(400).json({ error: `Pick a valid colour for ${p.name}.` });
      }
      if (!p.sizes.includes(size)) return res.status(400).json({ error: `Pick a valid size for ${p.name}.` });
      if (p.out.includes(size)) return res.status(409).json({ error: `${p.name} in size ${size} is sold out.` });
      if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
        return res.status(400).json({ error: `Quantity for ${p.name} must be between 1 and ${MAX_QTY}.` });
      }

      lines.push({
        productId: p.id,
        name: p.name,
        color: p.colors[ci].name,
        size,
        qty,
        unitPrice: p.price,
      });
    }

    const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
    const shipping = subtotal >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FEE;
    const total = subtotal + shipping;

    const order = await Order.create({
      orderNumber: makeOrderNumber(),
      items: lines,
      customer,
      subtotal,
      shipping,
      total,
    });

    res.status(201).json({
      orderNumber: order.orderNumber,
      subtotal: order.subtotal,
      shipping: order.shipping,
      total: order.total,
      paymentStatus: order.paymentStatus,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/WF-XXXX?email=customer@example.com
// The email must match the one on the order, so numbers cannot be guessed.
router.get('/:orderNumber', async (req, res, next) => {
  try {
    const email = str(req.query.email).toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email is required to look up an order.' });
    const order = await Order.findOne({
      orderNumber: str(req.params.orderNumber).toUpperCase(),
      'customer.email': email,
    })
      .select('-_id -__v -customer.phone -customer.address')
      .lean();
    if (!order) return res.status(404).json({ error: 'No order found with those details.' });
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
