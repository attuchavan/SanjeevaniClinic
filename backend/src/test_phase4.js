const http = require('http');
const app = require('./app');
const { getDatabase } = require('./config/database');
const { seedInitialUsers } = require('./database/seed');
const patientService = require('./services/patient.service');

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

async function testPhase4() {
  console.log('--- STARTING PHASE 4 AUTOMATED QUEUE & APPOINTMENTS VERIFICATION ---');

  await seedInitialUsers();

  const testPort = 5095;
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(testPort, '127.0.0.1', resolve));
  console.log(`✓ Test Server listening on port ${testPort}`);

  try {
    // 1. Authenticate Doctor and Receptionist
    console.log('\n[Test 1] Authenticating Doctor and Receptionist...');
    const docLogin = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { username: 'doctor', password: 'doctor123' });

    const recLogin = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { username: 'receptionist', password: 'reception123' });

    const doctorToken = docLogin.body.data.token;
    const recToken = recLogin.body.data.token;
    console.log('✓ Both roles authenticated.');

    // Ensure we have test patients
    const patient1 = patientService.registerPatient({
      fullName: 'Vikram Joshi',
      mobileNumber: '9822111122',
      gender: 'MALE',
      age: 45,
    }, 1, 'test');

    const patient2 = patientService.registerPatient({
      fullName: 'Pooja Kadam',
      mobileNumber: '9822333344',
      gender: 'FEMALE',
      age: 28,
      allergies: 'Cefixime',
    }, 1, 'test');

    // 2. Create walk-in visits
    console.log('\n[Test 2] Creating walk-in visits and issuing tokens...');
    // Normal visit for patient 1
    const visit1Res = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: '/api/queue/visit',
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${recToken}`,
      },
    }, {
      patientId: patient1.id,
      visitType: 'NEW',
      priority: 'NORMAL',
    });

    if (visit1Res.statusCode !== 201) {
      throw new Error(`Visit 1 creation failed: ${JSON.stringify(visit1Res.body)}`);
    }
    const visit1 = visit1Res.body.data.visit;
    console.log(`✓ Walk-in Token #${visit1.token_number} assigned to ${patient1.full_name} (${visit1.visit_number})`);

    // Emergency visit for patient 2
    const visit2Res = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: '/api/queue/visit',
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${recToken}`,
      },
    }, {
      patientId: patient2.id,
      visitType: 'NEW',
      priority: 'EMERGENCY',
    });

    if (visit2Res.statusCode !== 201) {
      throw new Error(`Visit 2 creation failed: ${JSON.stringify(visit2Res.body)}`);
    }
    const visit2 = visit2Res.body.data.visit;
    console.log(`✓ EMERGENCY Token #${visit2.token_number} assigned to ${patient2.full_name}`);

    // 3. Book appointment and check-in
    console.log('\n[Test 3] Booking appointment and converting to queue token...');
    const todayStr = new Date().toISOString().split('T')[0];
    const aptRes = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: '/api/appointments',
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${recToken}`,
      },
    }, {
      patientId: patient1.id,
      appointmentDate: todayStr,
      appointmentTime: '17:30',
      type: 'FOLLOW_UP',
      notes: 'Follow up on blood pressure',
    });

    if (aptRes.statusCode !== 201) {
      throw new Error(`Appointment booking failed: ${JSON.stringify(aptRes.body)}`);
    }
    const apt = aptRes.body.data.appointment;
    console.log(`✓ Appointment booked: ${apt.appointment_number} at 17:30`);

    // Convert appointment to visit token
    const checkInRes = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: `/api/appointments/${apt.id}/check-in`,
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${recToken}`,
      },
    }, { priority: 'NORMAL' });

    if (checkInRes.statusCode !== 201) {
      throw new Error(`Appointment check-in failed: ${JSON.stringify(checkInRes.body)}`);
    }
    const visit3 = checkInRes.body.data.visit;
    console.log(`✓ Appointment ${apt.appointment_number} checked in! Assigned Token #${visit3.token_number}`);

    // Try checking in again -> must reject to avoid duplicate visits
    const dupCheckIn = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: `/api/appointments/${apt.id}/check-in`,
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${recToken}`,
      },
    });
    if (dupCheckIn.statusCode !== 400) {
      throw new Error('Duplicate appointment check-in was not blocked!');
    }
    console.log('✓ Duplicate check-in correctly blocked with 400 error.');

    // 4. Test Live Queue & Emergency Triage Sorting
    console.log('\n[Test 4] Querying live queue & verifying emergency triage...');
    const queueRes = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: '/api/queue',
      method: 'GET',
      headers: { Authorization: `Bearer ${docLogin.body.data.token}` },
    });

    const queueData = queueRes.body.data;
    console.log(`✓ Live Queue retrieved: ${queueData.summary.total} total visits, ${queueData.summary.waiting} waiting, ${queueData.summary.emergency} emergency`);

    // Among waiting patients, emergency patient MUST be first!
    const waitingPatients = queueData.activeQueue.filter(v => v.status === 'WAITING');
    if (!waitingPatients[0] || waitingPatients[0].priority !== 'EMERGENCY') {
      throw new Error(`Triage failure: Emergency patient should be at top of waiting list, got priority ${waitingPatients[0]?.priority}`);
    }
    console.log(`✓ Emergency Triage Verified: Emergency patient (Token #${waitingPatients[0].token_number}) ranked #1 in waiting list.`);

    // 5. Test Doctor "Call Next Patient"
    console.log('\n[Test 5] Doctor calls next patient (Emergency triage first)...');
    
    // Receptionist tries calling next patient -> should get 403 Forbidden
    const recCall = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: '/api/queue/call-next',
      method: 'POST',
      headers: { Authorization: `Bearer ${recToken}` },
    });
    if (recCall.statusCode !== 403) {
      throw new Error(`Receptionist should be blocked from calling next patient, got ${recCall.statusCode}`);
    }
    console.log('✓ Receptionist strictly blocked from doctor call-next action (403 Forbidden).');

    // Doctor calls next patient
    const docCall = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: '/api/queue/call-next',
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    if (docCall.statusCode !== 200 || !docCall.body.data.visit || docCall.body.data.visit.priority !== 'EMERGENCY') {
      throw new Error(`Doctor call next failed or did not prioritize emergency: ${JSON.stringify(docCall.body)}`);
    }
    const calledPatient = docCall.body.data.visit;
    console.log(`✓ Doctor called next patient! Token #${calledPatient.token_number} (${calledPatient.full_name}) is now CALLED.`);

    // 6. Test Status progression to IN_PROGRESS and COMPLETED
    console.log('\n[Test 6] Transitioning visit to IN_PROGRESS and COMPLETED...');
    const startRes = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: `/api/queue/visit/${calledPatient.id}/status`,
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${doctorToken}`,
      },
    }, { status: 'IN_PROGRESS' });

    if (startRes.body.data.visit.status !== 'IN_PROGRESS') {
      throw new Error('Failed to transition to IN_PROGRESS');
    }
    console.log('✓ Status changed to IN_PROGRESS (Consultation Active).');

    const completeRes = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: `/api/queue/visit/${calledPatient.id}/status`,
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${doctorToken}`,
      },
    }, { status: 'COMPLETED' });

    if (completeRes.body.data.visit.status !== 'COMPLETED') {
      throw new Error('Failed to transition to COMPLETED');
    }
    console.log('✓ Status changed to COMPLETED (Consultation Finished).');

    // Doctor calls next patient again
    const docCall2 = await makeRequest({
      hostname: '127.0.0.1',
      port: testPort,
      path: '/api/queue/call-next',
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    console.log(`✓ Next patient called: Token #${docCall2.body.data.visit.token_number} (${docCall2.body.data.visit.full_name}).`);

    // 7. Check audit logs
    console.log('\n[Test 7] Checking audit logs...');
    const db = getDatabase();
    const visitLogs = db.prepare("SELECT count(*) as count FROM audit_logs WHERE action IN ('CREATE_VISIT', 'UPDATE_VISIT_STATUS', 'BOOK_APPOINTMENT')").get();
    if (visitLogs.count < 3) {
      throw new Error(`Expected at least 3 visit audit records, got ${visitLogs.count}`);
    }
    console.log(`✓ Audit logs verified: ${visitLogs.count} visit/queue events recorded.`);

    console.log('\n================================================================');
    console.log('🎉 ALL PHASE 4 BACKEND QUEUE & APPOINTMENTS TESTS PASSED!');
    console.log('================================================================');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

testPhase4()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Phase 4 Test Failed:', err);
    process.exit(1);
  });
