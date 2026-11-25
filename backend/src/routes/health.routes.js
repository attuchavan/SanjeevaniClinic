const express = require('express');
const { checkDatabaseHealth } = require('../config/database');
const config = require('../config/env');

const router = express.Router();

router.get('/health', (req, res) => {
  const dbHealth = checkDatabaseHealth();
  const memoryUsage = process.memoryUsage();

  const isHealthy = dbHealth.connected;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'OK' : 'DEGRADED',
    clinic: config.clinicName,
    environment: config.nodeEnv,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: dbHealth,
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      memory: {
        rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
        heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      },
    },
  });
});

module.exports = router;

