require('dotenv').config();
const mongoose = require('mongoose');

const testConn = async () => {
    const uri = process.env.MONGODB_URI;
    console.log(`Attempting to connect to: ${uri.replace(/:([^@]+)@/, ':****@')}`);
    try {
        await mongoose.connect(uri);
        console.log("✅ Database connection successful!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Database connection failed:");
        console.error(error.message);
        process.exit(1);
    }
};

testConn();
