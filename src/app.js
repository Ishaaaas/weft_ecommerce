const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const subscribersRouter = require('./routes/subscribers');
const authRouter = require('./routes/auth');

const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);

// Security headers. The CSP allows only our own scripts, Google Fonts, and inline
// style attributes (used for colour swatches and the shipping progress bar).
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", 'https://checkout.razorpay.com'],
        'style-src': ["'self'", 'https://fonts.googleapis.com'],
        'style-src-attr': ["'unsafe-inline'"],
        'font-src': ['https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:'],
        'connect-src': ["'self'", 'https://api.razorpay.com'],
        'frame-src': ['https://api.razorpay.com', 'https://checkout.razorpay.com'],
        'upgrade-insecure-requests': null,
      },
    },
  })
);

app.use(express.json({ limit: '20kb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in a few minutes.' },
});
const writeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => req.method !== 'POST',
  message: { error: 'Too many submissions. Please try again later.' },
});

app.use('/api', apiLimiter);
app.use('/api/orders', writeLimiter);
app.use('/api/subscribers', writeLimiter);
app.use('/api/auth', writeLimiter);

app.get('/api/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({ ok: connected });
});
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/subscribers', subscribersRouter);
app.use('/api/auth', authRouter);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.use(express.static(path.join(__dirname, '..', 'public')));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

module.exports = app;
