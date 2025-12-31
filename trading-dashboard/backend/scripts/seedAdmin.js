const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const Admin = require('../models/Admin');

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bull4x_trading', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@admin.com' });
    if (existingAdmin) {
      console.log('Admin already exists:', existingAdmin.email);
      process.exit(0);
    }

    // Create admin
    const admin = await Admin.create({
      email: 'admin@admin.com',
      password: 'admin123',
      username: 'admin',
      firstName: 'Super',
      lastName: 'Admin',
      role: 'superadmin',
      permissions: {
        users: true,
        trades: true,
        funds: true,
        ib: true,
        charges: true,
        copyTrade: true
      },
      isActive: true
    });

    console.log('Admin created successfully:');
    console.log('  Email:', admin.email);
    console.log('  Username:', admin.username);
    console.log('  Role:', admin.role);
    console.log('  Password: admin123');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();
