const socketIo = require('socket.io');

let io = null;

const initSocket = (server) => {
  io = socketIo(server, {
    path: '/code-mind-socket.io',
    cors: {
      origin: '*', // Allow connections from Vite frontend
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`Socket client connected: ${socket.id}`);

    // Join room corresponding to a specific repository
    socket.on('join-repo', (repoId) => {
      socket.join(repoId.toString());
      console.log(`Client ${socket.id} joined room: ${repoId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
};

/**
 * Emits pipeline stage progress (cloning/parsing/indexing/ready/failed).
 */
const emitProgress = (repoId, status, progress, error = '') => {
  if (io) {
    io.to(repoId.toString()).emit('indexing-progress', {
      repoId,
      status,
      progress,
      error,
    });
  }
};

/**
 * Emits real-time git clone progress details.
 */
const emitCloneProgress = (repoId, data) => {
  if (io) {
    io.to(repoId.toString()).emit('clone-progress', { repoId, ...data });
  }
};

module.exports = {
  initSocket,
  emitProgress,
  emitCloneProgress,
};
