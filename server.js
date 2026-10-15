require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./src/app');

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/weft';

async function main() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  console.log('MongoDB connected');

  const server = app.listen(PORT, () => {
    console.log(`Weft is running at http://localhost:${PORT}`);
  });

  const shutdown = () => {
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Could not start the server:', err.message);
  console.error('Check that MongoDB is running and MONGODB_URI in .env is correct.');
  process.exit(1);
});
