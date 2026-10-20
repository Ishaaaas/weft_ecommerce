# Weft Clothing

A clothing store with a Node.js and Express backend, MongoDB for data, and a plain JavaScript front end.
Products, orders and newsletter signups are stored in MongoDB. Garments are drawn in the browser as SVG with fabric textures, so there are no image files.

## What you need

- Node.js 18 or newer
- MongoDB, either installed locally or a free cluster on MongoDB Atlas

## Run it

```bash
npm install
cp .env.example .env     # then set MONGODB_URI if you are not using local MongoDB
npm run seed             # loads the 12 products into MongoDB
npm start                # http://localhost:3000
```

Use `npm run dev` to restart the server automatically while you edit.

## Project layout

```
server.js                 starts the server and connects to MongoDB
src/app.js                Express app: security headers, rate limits, routes, static files
src/models/               Product, Order, Subscriber (Mongoose schemas)
src/routes/               products, orders, subscribers
src/data/products.js      the catalogue that `npm run seed` loads
scripts/seed.js           seed script
public/index.html         page markup
public/styles.css         styling, light and dark mode
public/garments.js        draws each garment as SVG with fabric texture
public/app.js             storefront logic: filters, cart, checkout, API calls
```

## API

| Method | Path | What it does |
| --- | --- | --- |
| GET | `/api/products?cat=&q=&sort=` | List products. `cat` is a category, `q` searches name, fabric and colour, `sort` is `featured`, `low`, `high` or `rating`. |
| GET | `/api/products/:id` | One product. |
| POST | `/api/orders` | Place an order. Body: `{ items: [{ productId, colorIndex, size, qty }], customer: { name, email, phone, address, city, pin } }`. Prices are read from MongoDB, never from the request. |
| GET | `/api/orders/:orderNumber?email=` | Look up an order. The email must match the one on the order. |
| POST | `/api/subscribers` | Newsletter signup: `{ email }`. |
| GET | `/api/health` | Returns 200 when MongoDB is connected. |

## Things to know before going live

- **Payments use Razorpay.** Configure `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in your host environment. Start with test-mode credentials and test the full flow before switching to live keys. The server verifies payment signatures before marking orders paid. For production, also configure a Razorpay webhook and reconcile payments server-side.
- **There is no admin area yet.** Change products by editing `src/data/products.js` and running `npm run seed` again (this replaces all products), or edit documents in MongoDB Atlas or Compass. Orders can be viewed the same way.
- **Stock is tracked per size, not per unit.** A size listed in a product's `out` array cannot be ordered. For real inventory counts, add a quantity per size and reduce it when an order is created.
- **Emails are not sent.** The order confirmation tells the customer they will be emailed, so connect a mail service (for example Resend, SendGrid or Amazon SES) before launch, or change that wording in `public/app.js`.
- **Set `TRUST_PROXY=1`** when you deploy behind a host such as Render, Railway or Nginx, so rate limiting counts each visitor separately.
- Keep `.env` private. It holds your database password.


## Checkout options and customer accounts
- Checkout offers **Razorpay** (online) and **Cash on Delivery (COD)**. COD orders are stored in MongoDB as placed orders with payment status `pending`; customers see an order confirmation and pay when the parcel arrives. Razorpay orders are verified server-side before being marked paid.
- The top-right **Create account / Log in** control supports MongoDB-backed customer accounts. Passwords are stored as salted scrypt hashes; the session is an HTTP-only signed cookie.
- Add `AUTH_SECRET` to your local `.env` and Render environment variables. Use a long random secret in production. Keep `RAZORPAY_KEY_SECRET` private and use Test Mode keys while testing.
- Accounts are optional; checkout still works without logging in.
