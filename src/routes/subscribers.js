const express = require('express');
const Subscriber = require('../models/Subscriber');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// POST /api/subscribers  { email }
router.post('/', async (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!EMAIL_RE.test(email) || email.length > 120) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    // Upsert so a repeat signup does not error and does not reveal who is already subscribed.
    await Subscriber.updateOne({ email }, { $setOnInsert: { email } }, { upsert: true });
    res.status(201).json({ message: 'Thanks, you are on the list.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
