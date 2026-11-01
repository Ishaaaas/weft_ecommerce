require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../src/models/Product');
const products = require('../src/data/products');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/weft';

async function run() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  await Product.deleteMany({});
  await Product.insertMany(products);
  await Product.syncIndexes();
  console.log(`Seeded ${products.length} products into ${mongoose.connection.name}`);
}

run()
  .catch((err) => {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
