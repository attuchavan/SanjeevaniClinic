const http = require('http');
const { io: ioClient } = require('socket.io-client');
const app = require('./app');
const config = require('./config/env');
const { runMigrations } = require('./database/migrate');
const { initializeSocket } = require('./socket');

async function testPhase1() {
  console.log('--- STARTING PHASE 1 AUTOMATED VERIFICATION ---');

  // 1. Run migrations
  console.log('Test 1: Running migrations...');
  const migrationResult = runMigrations();
  if (!migrationResult.success) {
    throw new Error('Migration failed');
  }
  console.log('✓ Test 1 Passed: Migrations executed successfully.');

  // 2. Start test server on ephemeral port (e.g. 5099)
  const testPort = 5099;
  const server = http.createServer(app);
  initializeSocket(server, '*');

  await new Promise((resolve) => server.listen(testPort, '127.0.0.1', resolve));
  console.log(`✓ Test 2 Passed: Server listening on http://127.0.0.1:${testPort}`);

  // 3. Health check API test
  console.log('Test 3: Calling /api/health endpoint...');
  const healthData = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${testPort}/api/health`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });

  if (healthData.statusCode !== 200 || healthData.body.status !== 'OK') {
    throw new Error(`Health check returned unexpected payload: ${JSON.stringify(healthData)}`);
  }
  console.log('✓ Test 3 Passed: /api/health returned 200 OK:');
  console.log(`   - Clinic: ${healthData.body.clinic}`);
  console.log(`   - SQLite connected: ${healthData.body.database.connected}`);
  console.log(`   - Journal Mode: ${healthData.body.database.journalMode}`);
  console.log(`   - Foreign Keys: ${healthData.body.database.foreignKeys}`);
  console.log(`   - Migrated Tables Count: ${healthData.body.database.tablesCount}`);

  // 4. Socket.IO ping/pong test
  console.log('Test 4: Verifying Socket.IO connectivity and ping/pong event...');
  const client = ioClient(`http://127.0.0.1:${testPort}`, {
    transports: ['websocket'],
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Socket.IO ping/pong timed out after 5s'));
    }, 5000);

    client.on('connect', () => {
      client.emit('system:ping', { seq: 101, source: 'TestRunner' });
    });

    client.on('system:pong', (pongData) => {
      clearTimeout(timeout);
      if (pongData.status === 'OK' && pongData.replyTo === 101) {
        console.log('✓ Test 4 Passed: Socket.IO received pong successfully.');
        resolve();
      } else {
        reject(new Error(`Invalid pong data: ${JSON.stringify(pongData)}`));
      }
    });

    client.on('connect_error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  client.disconnect();
  await new Promise((resolve) => server.close(resolve));

  console.log('===================================================');
  console.log('🎉 ALL PHASE 1 CHECKS PASSED SUCCESSFULLY!');
  console.log('===================================================');
}

testPhase1()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  });

