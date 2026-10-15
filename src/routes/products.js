const express = require('express');
const Product = require('../models/Product');

const router = express.Router();

const CATEGORIES = ['Shirts', 'Tees', 'Knitwear', 'Bottoms', 'Outerwear'];
const SORTS = {
  featured: { id: 1 },
  low: { price: 1, id: 1 },
  high: { price: -1, id: 1 },
  rating: { rating: -1, id: 1 },
};

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/products?cat=Shirts&q=linen&sort=low
router.get('/', async (req, res, next) => {
  try {
    const { cat, q, sort } = req.query;
    const filter = {};

    if (typeof cat === 'string' && CATEGORIES.includes(cat)) filter.cat = cat;

    if (typeof q === 'string' && q.trim()) {
      const rx = new RegExp(escapeRegex(q.trim().slice(0, 60)), 'i');
      filter.$or = [{ name: rx }, { cat: rx }, { spec: rx }, { 'colors.name': rx }];
    }

    const order = SORTS[typeof sort === 'string' ? sort : 'featured'] || SORTS.featured;
    const products = await Product.find(filter).sort(order).select('-_id -__v -createdAt -updatedAt').lean();
    res.json({ products });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/5
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid product id' });
    const product = await Product.findOne({ id }).select('-_id -__v -createdAt -updatedAt').lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
