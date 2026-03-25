require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5005;

const startServer = async () => {
    // Connect to MongoDB
    await connectDB();

    const server = http.createServer(app);

    // ---------- Socket.io will be attached here in Part 8 ----------
    // const { Server } = require('socket.io');
    // const io = new Server(server, { cors: { origin: process.env.CLIENT_URL } });

    server.listen(PORT, () => {
        console.log(`🚀 PeerFlow server running on port ${PORT}`);
    });
};

startServer();
