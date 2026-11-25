const { Server } = require('socket.io');

let io = null;

function initializeSocket(httpServer, corsOrigin) {
  io = new Server(httpServer, {
    cors: {
      origin: corsOrigin === '*' ? '*' : corsOrigin.split(','),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 10000,
    pingInterval: 5000,
  });

  io.on('connection', (socket) => {
    const clientIp = socket.handshake.address;
    console.log(`[Socket.IO] Client connected: ${socket.id} (IP: ${clientIp})`);

    // Allow client to join role room: 'doctor', 'receptionist', or 'queue'
    socket.on('join:room', (roomName) => {
      if (['doctor', 'receptionist', 'queue'].includes(roomName)) {
        socket.join(roomName);
        console.log(`[Socket.IO] Client ${socket.id} joined room: ${roomName}`);
        socket.emit('room:joined', { room: roomName, status: 'success' });
      }
    });

    // Handle Phase 1 diagnostic test ping
    socket.on('system:ping', (payload) => {
      console.log(`[Socket.IO] Received ping from ${socket.id}:`, payload);
      socket.emit('system:pong', {
        replyTo: payload?.seq || 1,
        serverTime: new Date().toISOString(),
        status: 'OK',
        message: 'Socket connection healthy',
      });
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (Reason: ${reason})`);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.IO has not been initialized yet.');
  }
  return io;
}

// Helper to broadcast queue updates in real-time to all connected doctor & receptionist terminals
function broadcastQueueUpdate(eventPayload) {
  if (io) {
    io.emit('queue:update', {
      timestamp: new Date().toISOString(),
      ...eventPayload,
    });
  }
}

module.exports = {
  initializeSocket,
  getIO,
  broadcastQueueUpdate,
};

