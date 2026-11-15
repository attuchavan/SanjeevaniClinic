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

async function testPhase3() {
  console.log('--- STARTING PHASE 3 AUTOMATED PATIENT MANAGEMENT VERIFICATION ---');

  await seedInitialUsers();

  const testPort = 5096;
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(testPort, '127.0.0.1', resolve));
  console.log(`✓ Test Server running on port ${testPort}`);

  try {
    // 1. Authenticate as Receptionist
    console.log('\n[Test 1] Logging in as receptionist...');
    const loginRes = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { username: 'receptionist', password: 'reception123' });

    if (loginRes.statusCode !== 200) {
      throw new Error(`Login failed with status ${loginRes.statusCode}`);
    }
    const token = loginRes.body.data.token;
    console.log('✓ Receptionist authenticated successfully.');

    // 2. Validate input rejection (invalid mobile & missing age/dob)
    console.log('\n[Test 2] Testing validation rejection on invalid input...');
    const invalidRes = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: '/api/patients',
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }, {
      fullName: 'A',
      mobileNumber: '12345', // invalid
      gender: 'MALE',
    });

    if (invalidRes.statusCode !== 400) {
      throw new Error(`Expected 400 on invalid input, got ${invalidRes.statusCode}`);
    }
    console.log('✓ Invalid input rejected with 400 Validation Error.');

    // 3. Register First Patient
    console.log('\n[Test 3] Registering new patient with auto-generated UHID...');
    const patient1Data = {
      fullName: 'Sunil R. Patil',
      mobileNumber: '9822334455',
      gender: 'MALE',
      age: 42,
      bloodGroup: 'B+',
      allergies: 'Dust allergy, Sulfa drugs',
      emergencyContact: 'Ramesh Patil (Brother) - 9822000000',
      address: 'Plot 14, Shivaji Nagar, Sangli',
    };

    const reg1Res = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: '/api/patients',
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }, patient1Data);

    if (reg1Res.statusCode !== 201 || !reg1Res.body.data.patient) {
      throw new Error(`Patient registration failed: ${JSON.stringify(reg1Res.body)}`);
    }
    const patient1 = reg1Res.body.data.patient;
    console.log(`✓ Patient 1 registered! UHID: ${patient1.uhid}, ID: ${patient1.id}, Name: ${patient1.full_name}`);
    if (!patient1.uhid.startsWith('SC-')) {
      throw new Error(`Invalid UHID format: ${patient1.uhid}`);
    }

    // 4. Duplicate Mobile Detection Check
    console.log('\n[Test 4] Testing duplicate mobile number lookup...');
    const dupRes = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: '/api/patients/check-duplicate?mobile=9822334455',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (dupRes.statusCode !== 200 || dupRes.body.count === 0) {
      throw new Error(`Duplicate detection failed: ${JSON.stringify(dupRes.body)}`);
    }
    console.log(`✓ Duplicate detection working! Found ${dupRes.body.count} existing patient(s) with mobile 9822334455.`);

    // 5. Register Second Patient to check sequential UHID
    console.log('\n[Test 5] Registering second patient for sequential UHID...');
    const patient2Data = {
      fullName: 'Anita S. Deshmukh',
      mobileNumber: '9421556677',
      gender: 'FEMALE',
      dob: '1990-05-15',
      bloodGroup: 'O+',
      address: 'Near Civil Hospital, Miraj',
    };

    const reg2Res = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: '/api/patients',
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }, patient2Data);

    const patient2 = reg2Res.body.data.patient;
    console.log(`✓ Patient 2 registered! UHID: ${patient2.uhid}, Age calculated: ${patient2.age} years`);

    // 6. Test Search API
    console.log('\n[Test 6] Testing patient search by name, mobile, and UHID...');
    // Search by mobile
    const searchMobile = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: '/api/patients?q=9822334455',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (searchMobile.body.data.patients.length === 0) {
      throw new Error('Search by mobile returned no results');
    }
    console.log('✓ Search by mobile number returned matching patient.');

    // Search by name
    const searchName = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: '/api/patients?q=Deshmukh',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (searchName.body.data.patients.length === 0) {
      throw new Error('Search by name returned no results');
    }
    console.log('✓ Search by name returned matching patient.');

    // 7. Test Patient Profile & Demographics Update
    console.log('\n[Test 7] Updating patient demographics...');
    const updateRes = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: `/api/patients/${patient1.id}`,
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }, {
      address: 'Updated Address, Sangli Main Road',
      allergies: 'Penicillin, Dust allergy, Sulfa drugs',
    });

    if (updateRes.statusCode !== 200 || updateRes.body.data.patient.address !== 'Updated Address, Sangli Main Road') {
      throw new Error(`Patient update failed: ${JSON.stringify(updateRes.body)}`);
    }
    console.log('✓ Patient profile updated successfully.');

    // 8. Verify Audit Logs
    console.log('\n[Test 8] Checking audit logs for patient events...');
    const db = getDatabase();
    const createLogs = db.prepare("SELECT count(*) as count FROM audit_logs WHERE action = 'CREATE_PATIENT'").get();
    const updateLogs = db.prepare("SELECT count(*) as count FROM audit_logs WHERE action = 'UPDATE_PATIENT'").get();

    if (createLogs.count < 2 || updateLogs.count < 1) {
      throw new Error(`Audit log count mismatch: create=${createLogs.count}, update=${updateLogs.count}`);
    }
    console.log(`✓ Audit logs verified: ${createLogs.count} patient creations and ${updateLogs.count} update(s) recorded.`);

    console.log('\n================================================================');
    console.log('🎉 ALL PHASE 3 BACKEND PATIENT MANAGEMENT TESTS PASSED!');
    console.log('================================================================');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

testPhase3()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Phase 3 Test Failed:', err);
    process.exit(1);
  });

