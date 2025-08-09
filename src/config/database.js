const mongoose = require('mongoose');

const connectDB = async () => {
  try {
  const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('Database connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Database disconnected');
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('Database connection closed due to app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;