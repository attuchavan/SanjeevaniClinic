const http = require('http');
const os = require('os');
const app = require('./app');
const config = require('./config/env');
const { runMigrations } = require('./database/migrate');
const { initializeSocket } = require('./socket');

// Helper to find local LAN IPv4 addresses
function getLanIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (e.g. 127.0.0.1) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }

  return addresses;
}

async function startServer() {
  try {
    // 1. Ensure migrations are applied before accepting requests
    console.log('[System] Verifying SQLite database migrations...');
    runMigrations();

    // 2. Create HTTP & Socket.IO server
    const server = http.createServer(app);
    initializeSocket(server, config.corsOrigin);

    // 3. Start listening
    server.listen(config.port, config.host, () => {
      const lanIps = getLanIpAddresses();

      console.log('===========================================================');
      console.log(`🏥 ${config.clinicName}`);
      console.log('   Sharad Clinic Management System - Phase 1 Active');
      console.log('===========================================================');
      console.log(`✓ Local Workstation Access : http://localhost:${config.port}`);
      if (lanIps.length > 0) {
        lanIps.forEach((ip) => {
          console.log(`✓ LAN Terminal Access (PC 2): http://${ip}:${config.port}`);
        });
      } else {
        console.log(`✓ LAN Terminal Access (PC 2): http://<COMPUTER_1_IP>:${config.port}`);
      }
      console.log(`✓ Health Check Endpoint    : http://localhost:${config.port}/api/health`);
      console.log(`✓ Socket.IO Engine         : Ready on port ${config.port}`);
      console.log(`✓ SQLite Database          : ${config.dbPath}`);
      console.log('===========================================================');
    });

    // Graceful shutdown handling
    const gracefulShutdown = () => {
      console.log('\n[System] Gracefully shutting down server...');
      server.close(() => {
        console.log('[System] HTTP and Socket.IO server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);

  } catch (error) {
    console.error('[Fatal Error] Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

