require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5005;

const startServer = async () => {
    // Connect to MongoDB
    await connectDB();

    app.listen(PORT, () => {
        console.log(`🚀 PeerFlow server running on port ${PORT}`);
    });
};

startServer();
