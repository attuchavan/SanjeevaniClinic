const http = require('http');
const app = require('./app');
const { getDatabase } = require('./config/database');
const { seedInitialUsers } = require('./database/seed');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
          });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function testPhase2() {
  console.log('--- STARTING PHASE 2 AUTOMATED AUTH & RBAC VERIFICATION ---');

  // Ensure accounts are seeded
  await seedInitialUsers();

  const testPort = 5097;
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(testPort, '127.0.0.1', resolve));
  console.log(`✓ Test Server started on port ${testPort}`);

  try {
    // 1. Test Login with invalid credentials
    console.log('\n[Test 1] Testing invalid credentials rejection...');
    const failRes = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { username: 'doctor', password: 'wrongpassword' });

    if (failRes.statusCode !== 401) {
      throw new Error(`Expected 401 for wrong password, got ${failRes.statusCode}`);
    }
    console.log('✓ Invalid password correctly rejected with 401 Unauthorized.');

    // 2. Test Doctor Login
    console.log('\n[Test 2] Testing Doctor login (doctor / doctor123)...');
    const doctorLoginRes = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { username: 'doctor', password: 'doctor123' });

    if (doctorLoginRes.statusCode !== 200 || !doctorLoginRes.body.data.token) {
      throw new Error(`Doctor login failed: ${JSON.stringify(doctorLoginRes.body)}`);
    }
    const doctorToken = doctorLoginRes.body.data.token;
    const doctorUser = doctorLoginRes.body.data.user;
    if (doctorUser.role !== 'DOCTOR') {
      throw new Error(`Expected DOCTOR role, got ${doctorUser.role}`);
    }
    console.log(`✓ Doctor authenticated successfully! User: ${doctorUser.fullName}, Role: ${doctorUser.role}`);

    // 3. Test Receptionist Login
    console.log('\n[Test 3] Testing Receptionist login (receptionist / reception123)...');
    const recLoginRes = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { username: 'receptionist', password: 'reception123' });

    if (recLoginRes.statusCode !== 200 || !recLoginRes.body.data.token) {
      throw new Error(`Receptionist login failed: ${JSON.stringify(recLoginRes.body)}`);
    }
    const recToken = recLoginRes.body.data.token;
    const recUser = recLoginRes.body.data.user;
    if (recUser.role !== 'RECEPTIONIST') {
      throw new Error(`Expected RECEPTIONIST role, got ${recUser.role}`);
    }
    console.log(`✓ Receptionist authenticated successfully! User: ${recUser.fullName}, Role: ${recUser.role}`);

    // 4. Test Token Verification on /api/auth/me
    console.log('\n[Test 4] Verifying /api/auth/me profile retrieval...');
    const meRes = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: '/api/auth/me',
      method: 'GET',
      headers: { Authorization: `Bearer ${doctorToken}` },
    });

    if (meRes.statusCode !== 200 || meRes.body.data.user.username !== 'doctor') {
      throw new Error(`Profile retrieval failed: ${JSON.stringify(meRes.body)}`);
    }
    console.log(`✓ Protected profile returned: ${meRes.body.data.user.fullName} (${meRes.body.data.user.role})`);

    // 5. Test Role-Based Access Control (RBAC)
    console.log('\n[Test 5] Testing RBAC Permissions Enforcement...');
    
    // Doctor accesses Doctor route -> 200 OK
    const docToDoc = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: '/api/auth/doctor-only',
      method: 'GET',
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    if (docToDoc.statusCode !== 200) {
      throw new Error(`Doctor should access doctor-only route, got ${docToDoc.statusCode}`);
    }
    console.log('✓ Doctor granted access to Doctor-only route (200 OK).');

    // Receptionist accesses Doctor route -> 403 Forbidden
    const recToDoc = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: '/api/auth/doctor-only',
      method: 'GET',
      headers: { Authorization: `Bearer ${recToken}` },
    });
    if (recToDoc.statusCode !== 403) {
      throw new Error(`Receptionist must be denied doctor-only route with 403, got ${recToDoc.statusCode}`);
    }
    console.log('✓ Receptionist strictly blocked from Doctor-only route (403 Forbidden).');

    // Receptionist accesses Receptionist route -> 200 OK
    const recToRec = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: '/api/auth/receptionist-only',
      method: 'GET',
      headers: { Authorization: `Bearer ${recToken}` },
    });
    if (recToRec.statusCode !== 200) {
      throw new Error(`Receptionist should access receptionist route, got ${recToRec.statusCode}`);
    }
    console.log('✓ Receptionist granted access to Receptionist-only route (200 OK).');

    // Doctor accesses Receptionist route -> 403 Forbidden
    const docToRec = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: '/api/auth/receptionist-only',
      method: 'GET',
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    if (docToRec.statusCode !== 403) {
      throw new Error(`Doctor should be blocked from Receptionist-only route with 403, got ${docToRec.statusCode}`);
    }
    console.log('✓ Doctor strictly blocked from Receptionist-only route (403 Forbidden).');

    // 6. Test Audit Log
    console.log('\n[Test 6] Checking Audit Logs table in SQLite...');
    const db = getDatabase();
    const logs = db.prepare("SELECT action, entity_type, details FROM audit_logs WHERE action = 'LOGIN'").all();
    if (logs.length < 2) {
      throw new Error(`Expected at least 2 login audit records, got ${logs.length}`);
    }
    console.log(`✓ Audit log verified: ${logs.length} login events securely recorded in SQLite.`);

    console.log('\n=============================================================');
    console.log('🎉 ALL PHASE 2 BACKEND AUTH & RBAC TESTS PASSED SUCCESSFULLY!');
    console.log('=============================================================');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

testPhase2()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Phase 2 Test Failed:', err);
    process.exit(1);
  });

