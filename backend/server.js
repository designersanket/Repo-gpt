const path = require('path');
const fs = require('fs');

// Load environment variables from current or parent directory
const localEnv = path.join(process.cwd(), '.env');
const parentEnv = path.join(process.cwd(), '../.env');

if (fs.existsSync(localEnv)) {
  require('dotenv').config({ path: localEnv });
} else if (fs.existsSync(parentEnv)) {
  require('dotenv').config({ path: parentEnv });
} else {
  require('dotenv').config();
}

const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDB = require('./config/db');
const { initSocket } = require('./websocket/socketHandler');

const authRoutes = require('./routes/authRoutes');
const repoRoutes = require('./routes/repoRoutes');
const chatRoutes = require('./routes/chatRoutes');

// 1. Connect MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// 2. Middleware
app.use(cors({
  origin: '*', // In production, replace with specific domain
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/repos', repoRoutes);
app.use('/api/chat', chatRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'repogpt-backend',
    timestamp: new Date()
  });
});

// 4. Initialize WebSockets
initSocket(server);

// 5. Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`RepoGPT Backend running on port ${PORT}`);
});
