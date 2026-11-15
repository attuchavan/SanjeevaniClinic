/**
 * Phase 6 Automated Verification Test Suite
 * Tests Billing & Payment Collections Module:
 * - Consultation fee recording
 * - Sequential Receipt Numbers (REC-YYYY-XXXX)
 * - Cash, UPI, and Partial payments
 * - Pending dues tracking
 * - Printable receipt generation with Sanjeevani Clinic branding
 * - Daily collections accounting & reconciliation
 * - SQLite audit logging
 */
const http = require('http');
const app = require('./app');

const PORT = 5093;
let server;

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (err) {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Phase 6: Billing & Payment Collections Test Suite...\n');
  let doctorToken = null;
  let receptionistToken = null;

  try {
    server = app.listen(PORT);
    console.log(`[Setup] Ephemeral test server active on port ${PORT}`);

    // 1. Authenticate Receptionist & Doctor
    const recLogin = await request({ method: 'POST', path: '/api/auth/login' }, {
      username: 'receptionist',
      password: 'reception123',
    });
    if (recLogin.status !== 200 || !recLogin.body.data.token) {
      throw new Error(`Receptionist login failed: ${JSON.stringify(recLogin.body)}`);
    }
    receptionistToken = recLogin.body.data.token;

    const docLogin = await request({ method: 'POST', path: '/api/auth/login' }, {
      username: 'doctor',
      password: 'doctor123',
    });
    doctorToken = docLogin.body.data.token;
    console.log('✅ 1. Receptionist & Doctor authenticated successfully.');

    // 2. Register Test Patient
    const patRes = await request({
      method: 'POST',
      path: '/api/patients',
      headers: { Authorization: `Bearer ${receptionistToken}` },
    }, {
      fullName: 'Rameshwar G. Kulkarni',
      age: 54,
      gender: 'MALE',
      mobileNumber: '9822998877',
      address: 'Near Ganpati Temple, Sangli',
      bloodGroup: 'O+',
    });
    if (patRes.status !== 201) {
      throw new Error(`Patient registration failed: ${JSON.stringify(patRes.body)}`);
    }
    const patient = patRes.body.data.patient;
    console.log(`✅ 2. Patient registered: ${patient.full_name || patient.fullName} (${patient.uhid})`);

    // 3. Create Visit 1 (Token)
    const visitRes = await request({
      method: 'POST',
      path: '/api/queue/visit',
      headers: { Authorization: `Bearer ${receptionistToken}` },
    }, {
      patientId: patient.id,
      visitType: 'NEW',
      priority: 'NORMAL',
    });
    if (visitRes.status !== 201) {
      throw new Error(`Visit creation failed: ${JSON.stringify(visitRes.body)}`);
    }
    const visit1 = visitRes.body.data.visit;
    console.log(`✅ 3. Visit 1 created (Token #${visit1.token_number || visit1.tokenNumber}, ID: ${visit1.id})`);

    // 4. Record Full Consultation Fee Payment (CASH - ₹300)
    const pay1Res = await request({
      method: 'POST',
      path: '/api/billing/payments',
      headers: { Authorization: `Bearer ${receptionistToken}` },
    }, {
      visitId: visit1.id,
      patientId: patient.id,
      amountCharged: 300,
      amountPaid: 300,
      paymentMode: 'CASH',
      notes: 'Standard general consultation fee',
    });
    if (pay1Res.status !== 201) {
      throw new Error(`Payment 1 recording failed: ${JSON.stringify(pay1Res.body)}`);
    }
    const payment1 = pay1Res.body.data;
    if (!payment1.receiptNumber.startsWith('REC-')) {
      throw new Error(`Receipt number format invalid: ${payment1.receiptNumber}`);
    }
    if (payment1.paymentStatus !== 'PAID' || payment1.balancePending !== 0) {
      throw new Error(`Payment status mismatch: expected PAID with 0 balance, got ${payment1.paymentStatus}`);
    }
    console.log(`✅ 4. Full Cash payment recorded: Receipt ${payment1.receiptNumber} (Charged: ₹300, Paid: ₹300, Status: PAID).`);

    // 5. Create Visit 2 for Partial UPI Payment test
    const visit2Res = await request({
      method: 'POST',
      path: '/api/queue/visit',
      headers: { Authorization: `Bearer ${receptionistToken}` },
    }, {
      patientId: patient.id,
      visitType: 'FOLLOW_UP',
      priority: 'NORMAL',
    });
    const visit2 = visit2Res.body.data.visit;

    // 6. Record Partial UPI Payment (Charged: ₹500, Paid: ₹200)
    const pay2Res = await request({
      method: 'POST',
      path: '/api/billing/payments',
      headers: { Authorization: `Bearer ${receptionistToken}` },
    }, {
      visitId: visit2.id,
      patientId: patient.id,
      amountCharged: 500,
      amountPaid: 200,
      paymentMode: 'UPI',
      transactionReference: 'UPI-UTR-99881122',
      notes: 'Partial advance payment for consultation & diagnostic test',
    });
    if (pay2Res.status !== 201) {
      throw new Error(`Payment 2 recording failed: ${JSON.stringify(pay2Res.body)}`);
    }
    const payment2 = pay2Res.body.data;
    if (payment2.paymentStatus !== 'PARTIAL') {
      throw new Error(`Payment status mismatch: expected PARTIAL, got ${payment2.paymentStatus}`);
    }
    if (payment2.balancePending !== 300) {
      throw new Error(`Balance pending mismatch: expected 300, got ${payment2.balancePending}`);
    }
    console.log(`✅ 5. Partial UPI payment recorded: Receipt ${payment2.receiptNumber} (Charged: ₹500, Paid: ₹200, Balance Pending: ₹300).`);

    // 7. Verify Sequential Receipt Numbering
    const seq1 = parseInt(payment1.receiptNumber.split('-')[2], 10);
    const seq2 = parseInt(payment2.receiptNumber.split('-')[2], 10);
    if (seq2 !== seq1 + 1) {
      throw new Error(`Receipt numbering sequence mismatch: ${payment1.receiptNumber} -> ${payment2.receiptNumber}`);
    }
    console.log(`✅ 6. Sequential Receipt Numbering verified: ${payment1.receiptNumber} -> ${payment2.receiptNumber}`);

    // 8. Test Visit Billing Breakdown endpoint
    const visitBillingRes = await request({
      method: 'GET',
      path: `/api/billing/visit/${visit2.id}`,
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    if (visitBillingRes.status !== 200) {
      throw new Error(`Get visit billing failed: ${JSON.stringify(visitBillingRes.body)}`);
    }
    const vb = visitBillingRes.body.data;
    if (vb.totalCharged !== 500 || vb.totalPaid !== 200 || vb.balancePending !== 300 || vb.overallStatus !== 'PARTIAL') {
      throw new Error(`Visit billing aggregation error: ${JSON.stringify(vb)}`);
    }
    console.log('✅ 7. Visit billing breakdown verified (Total Charged: ₹500, Paid: ₹200, Balance: ₹300, Status: PARTIAL).');

    // 9. Test Printable Receipt Endpoint
    const printRes = await request({
      method: 'GET',
      path: `/api/billing/payments/${payment1.id}/print`,
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    if (printRes.status !== 200) {
      throw new Error(`Printable receipt endpoint failed: ${JSON.stringify(printRes.body)}`);
    }
    const prData = printRes.body.data;
    if (prData.clinic.name !== 'SANJEEVANI CLINIC' || prData.clinic.doctorName !== 'Dr. Sharad Motugade') {
      throw new Error(`Printable receipt clinic branding mismatch: ${JSON.stringify(prData.clinic)}`);
    }
    if (!prData.billing.amountInWords || !prData.billing.amountInWords.includes('Rupees')) {
      throw new Error(`Amount in words error: ${prData.billing.amountInWords}`);
    }
    console.log(`✅ 8. Printable Receipt Layout verified: "${prData.clinic.name}" with amount in words ("${prData.billing.amountInWords}").`);

    // 10. Search Payments by mode and status
    const searchUPI = await request({
      method: 'GET',
      path: '/api/billing/payments?paymentMode=UPI',
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    if (searchUPI.status !== 200 || searchUPI.body.data.length === 0) {
      throw new Error('Search by payment mode UPI failed');
    }
    const foundUPI = searchUPI.body.data.find(p => p.receiptNumber === payment2.receiptNumber);
    if (!foundUPI) {
      throw new Error('Payment 2 not found in UPI filter query');
    }
    console.log(`✅ 9. Payment search and mode filtering verified: Found receipt ${foundUPI.receiptNumber} under UPI.`);

    // 11. Collections Accounting Summary & Reconciliation
    const summaryRes = await request({
      method: 'GET',
      path: '/api/billing/summary',
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    if (summaryRes.status !== 200) {
      throw new Error(`Collections summary failed: ${JSON.stringify(summaryRes.body)}`);
    }
    const sum = summaryRes.body.data;
    if (sum.today.cashCollected < 300 || sum.today.upiCollected < 200) {
      throw new Error(`Collections breakdown mismatch: ${JSON.stringify(sum.today)}`);
    }
    if (sum.today.pendingDues < 300) {
      throw new Error(`Pending dues mismatch: ${JSON.stringify(sum.today)}`);
    }
    console.log(`✅ 10. Daily Collections Summary verified: Cash: ₹${sum.today.cashCollected}, UPI: ₹${sum.today.upiCollected}, Total: ₹${sum.today.totalCollected}, Pending Dues: ₹${sum.today.pendingDues}.`);

    // 12. Check SQLite Audit Logs
    const db = require('./config/database').getDatabase();
    const auditRows = db.prepare(`SELECT * FROM audit_logs WHERE action = 'CREATE_PAYMENT' ORDER BY id DESC LIMIT 2`).all();
    if (auditRows.length < 2) {
      throw new Error('Audit logs missing CREATE_PAYMENT records in SQLite');
    }
    console.log('✅ 11. SQLite audit logs verified: Payment creation actions immutably tracked.');

    console.log('\n======================================================');
    console.log('🎉 ALL 11 PHASE 6 BILLING & PAYMENT TESTS PASSED 100%!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ Phase 6 Test Failed:', err.message);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
      console.log('[Teardown] Ephemeral test server closed.');
    }
  }
}

runTests();
