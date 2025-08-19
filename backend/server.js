// server.js - Entry point
require('dotenv').config();
const { createApp } = require('./src/app');

const PORT = process.env.PORT || 3001;

(async () => {
  try {
    const { platform } = await createApp();
    await platform.start(PORT);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
})();