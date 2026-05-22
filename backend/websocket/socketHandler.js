const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'codemind-super-secret-key-123';

let io = null;

const initSocket = (server) => {
  io = socketIo(server, {
    path: '/code-mind-socket.io',
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  // Authenticate socket connection via JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Each user automatically joins their private room
    socket.join(socket.userId);
    console.log(`Socket connected: ${socket.id} → user room: ${socket.userId}`);

    // Also allow joining a repo-specific room for granular subscriptions
    socket.on('join-repo', (repoId) => {
      socket.join(`${socket.userId}:${repoId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

// Emit pipeline stage progress to the specific user only
const emitProgress = (userId, repoId, status, progress, error = '') => {
  if (!io) return;
  io.to(userId.toString()).emit('indexing-progress', { repoId, status, progress, error });
};

// Emit granular git clone progress to the specific user only
const emitCloneProgress = (userId, repoId, data) => {
  if (!io) return;
  io.to(userId.toString()).emit('clone-progress', { repoId, ...data });
};

module.exports = { initSocket, emitProgress, emitCloneProgress };
