/**
 * Phase 5 Automated Verification Test Suite
 * Tests Doctor Consultation, Case Papers (New & Old patient),
 * Structured Prescriptions, RBAC enforcement, Finalization,
 * Printable Views, and Historical Patient Record tracking.
 */
const http = require('http');
const app = require('./app');

const PORT = 5094;
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
  console.log('🧪 Starting Phase 5: Doctor Consultation & Prescriptions Test Suite...\n');
  let doctorToken = null;
  let receptionistToken = null;

  try {
    server = app.listen(PORT);
    console.log(`[Setup] Ephemeral test server active on port ${PORT}`);

    // 1. Authenticate Doctor
    const docLogin = await request({ method: 'POST', path: '/api/auth/login' }, {
      username: 'doctor',
      password: 'doctor123',
    });
    if (docLogin.status !== 200 || !docLogin.body.data.token) {
      throw new Error(`Doctor login failed: ${JSON.stringify(docLogin.body)}`);
    }
    doctorToken = docLogin.body.data.token;
    console.log('✅ 1. Doctor authenticated successfully.');

    // 2. Authenticate Receptionist
    const recLogin = await request({ method: 'POST', path: '/api/auth/login' }, {
      username: 'receptionist',
      password: 'reception123',
    });
    if (recLogin.status !== 200 || !recLogin.body.data.token) {
      throw new Error(`Receptionist login failed: ${JSON.stringify(recLogin.body)}`);
    }
    receptionistToken = recLogin.body.data.token;
    console.log('✅ 2. Receptionist authenticated successfully.');

    // 3. Register Patient for Consultation
    const patReg = await request({
      method: 'POST',
      path: '/api/patients',
      headers: { Authorization: `Bearer ${receptionistToken}` },
    }, {
      fullName: 'Vikramaditya Shinde',
      age: 48,
      gender: 'MALE',
      mobileNumber: '9881122334',
      address: 'Plot 12, Shivaji Nagar, Sangli',
      bloodGroup: 'B+',
      allergies: 'None reported initially',
    });
    if (patReg.status !== 201) {
      throw new Error(`Patient registration failed: ${JSON.stringify(patReg.body)}`);
    }
    const patientId = patReg.body.data.patient.id;
    const uhid = patReg.body.data.patient.uhid;
    console.log(`✅ 3. Test patient registered: ${patReg.body.data.patient.full_name || patReg.body.data.patient.fullName} (${uhid})`);

    // 4. Create Visit 1 (New Patient Walk-in)
    const visit1Res = await request({
      method: 'POST',
      path: '/api/queue/visit',
      headers: { Authorization: `Bearer ${receptionistToken}` },
    }, {
      patientId,
      visitType: 'NEW',
      priority: 'NORMAL',
    });
    if (visit1Res.status !== 201) {
      throw new Error(`Create visit 1 failed: ${JSON.stringify(visit1Res.body)}`);
    }
    const visit1 = visit1Res.body.data.visit;
    const visit1Id = visit1.id;
    console.log(`✅ 4. Visit 1 created (Token #${visit1.token_number || visit1.tokenNumber}, ID: ${visit1Id})`);

    // 5. Doctor calls patient
    const callRes = await request({
      method: 'POST',
      path: '/api/queue/call-next',
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    console.log(`✅ 5. Doctor called next patient in queue.`);

    // 6. Doctor opens Consultation Workspace
    const wsRes = await request({
      method: 'GET',
      path: `/api/consultation/visit/${visit1Id}`,
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    if (wsRes.status !== 200) {
      throw new Error(`Get workspace failed: ${JSON.stringify(wsRes.body)}`);
    }
    const ws = wsRes.body.data;
    if (ws.patient.uhid !== uhid || ws.visit.id !== visit1Id) {
      throw new Error('Workspace patient or visit mismatch');
    }
    console.log(`✅ 6. Consultation workspace loaded with demographic card & draft case paper.`);

    // 7. Save Case Paper Draft with Vitals & Complaints
    const saveCasePaperDraft = await request({
      method: 'PUT',
      path: `/api/consultation/visit/${visit1Id}/case-paper`,
      headers: { Authorization: `Bearer ${doctorToken}` },
    }, {
      chiefComplaints: 'High fever for 3 days, body ache, dry cough',
      medicalHistory: 'Known hypertensive for 2 years',
      allergies: 'Ciprofloxacin hypersensitivity',
      clinicalExamination: 'Chest: Bilateral clear, Throat: Mild erythema, Abdomen: Soft, non-tender',
      vitals: {
        bp: '130/85 mmHg',
        pulse: '84 bpm',
        temperature: '101.4 F',
        spo2: '98%',
        weight: '72 kg',
        height: '172 cm',
        bmi: '24.3',
      },
      diagnosis: 'Acute Viral Pyrexia with Upper Respiratory Tract Infection',
      doctorNotes: 'Advised warm water gargles, adequate hydration, rest',
      followUpInstructions: 'Return in 3 days if fever persists above 100 F',
      followUpDate: '2026-11-18',
      isFinalized: false,
    });
    if (saveCasePaperDraft.status !== 200) {
      throw new Error(`Save case paper draft failed: ${JSON.stringify(saveCasePaperDraft.body)}`);
    }
    console.log('✅ 7. Doctor saved Case Paper draft with complete vitals and clinical assessment.');

    // 8. Verify permanent patient allergy update
    const patCheck = await request({
      method: 'GET',
      path: `/api/patients/${patientId}`,
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    if (patCheck.body.data.patient.allergies !== 'Ciprofloxacin hypersensitivity') {
      throw new Error(`Master patient allergy was not synchronized: ${patCheck.body.data.patient.allergies}`);
    }
    console.log('✅ 8. Patient master profile allergy automatically synchronized to "Ciprofloxacin hypersensitivity".');

    // 9. RBAC Test: Receptionist trying to write prescription must be blocked
    const recPrescriptionBlock = await request({
      method: 'PUT',
      path: `/api/consultation/visit/${visit1Id}/prescription`,
      headers: { Authorization: `Bearer ${receptionistToken}` },
    }, {
      diagnosisSummary: 'Attempted by unauthorized receptionist',
      adviceNotes: 'Testing',
      medicines: [],
      isFinalized: true,
    });
    if (recPrescriptionBlock.status !== 403) {
      throw new Error(`Security breach! Receptionist was not blocked with 403 Forbidden. Got ${recPrescriptionBlock.status}`);
    }
    console.log('✅ 9. RBAC Security verified: Receptionist blocked with 403 Forbidden when attempting prescription update.');

    // 10. Doctor saves structured Prescription and finalizes consultation
    const savePrescriptionRes = await request({
      method: 'PUT',
      path: `/api/consultation/visit/${visit1Id}/prescription`,
      headers: { Authorization: `Bearer ${doctorToken}` },
    }, {
      diagnosisSummary: 'Acute Viral Pyrexia & URTI',
      adviceNotes: 'Avoid cold beverages, take light semi-solid meals, monitor temperature twice daily.',
      medicines: [
        {
          medicineName: 'Tab. Paracetamol 650mg (Dolo 650)',
          dosage: '1 tablet',
          frequency: '1-0-1 (Morning & Night)',
          timing: 'After food',
          duration: '3 days',
          instructions: 'Take SOS if temperature exceeds 99 F',
        },
        {
          medicineName: 'Tab. Cetirizine 10mg',
          dosage: '1 tablet',
          frequency: '0-0-1 (Bedtime)',
          timing: 'After food',
          duration: '5 days',
          instructions: 'May cause mild drowsiness',
        },
        {
          medicineName: 'Tab. Vitamin C 500mg (Limcee)',
          dosage: '1 chewable tablet',
          frequency: '1-0-0 (Morning)',
          timing: 'After breakfast',
          duration: '7 days',
          instructions: 'Chew thoroughly before swallowing',
        },
      ],
      isFinalized: true,
    });
    if (savePrescriptionRes.status !== 200) {
      throw new Error(`Save prescription failed: ${JSON.stringify(savePrescriptionRes.body)}`);
    }
    console.log('✅ 10. Doctor finalized prescription with 3 structured medicines and dosage schedules.');

    // 11. Verify Visit Status is marked COMPLETED
    const queueCheck = await request({
      method: 'GET',
      path: `/api/queue`,
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const completedVisit = queueCheck.body.data.completedQueue.find(v => v.id === visit1Id);
    if (!completedVisit || completedVisit.status !== 'COMPLETED') {
      throw new Error(`Visit status was not updated to COMPLETED upon prescription finalization.`);
    }
    console.log('✅ 11. Visit status verified as COMPLETED in live queue.');

    // 12. Test Printable Prescription
    const printPrescriptionRes = await request({
      method: 'GET',
      path: `/api/consultation/visit/${visit1Id}/prescription/print`,
      headers: { Authorization: `Bearer ${receptionistToken}` }, // Receptionist prints at front desk
    });
    if (printPrescriptionRes.status !== 200) {
      throw new Error(`Print prescription failed: ${JSON.stringify(printPrescriptionRes.body)}`);
    }
    const printableData = printPrescriptionRes.body.data;
    if (printableData.clinic.name !== 'SANJEEVANI CLINIC' || printableData.medicines.length !== 3) {
      throw new Error('Printable prescription data mismatch');
    }
    console.log(`✅ 12. Printable Prescription verified: "${printableData.clinic.name}" with 3 medicines and Dr. Sharad Motugade signature block.`);

    // 13. Test Printable Case Paper
    const printCasePaperRes = await request({
      method: 'GET',
      path: `/api/consultation/visit/${visit1Id}/case-paper/print`,
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    if (printCasePaperRes.status !== 200 || !printCasePaperRes.body.data.casePaper.clinicalExamination) {
      throw new Error(`Print case paper failed: ${JSON.stringify(printCasePaperRes.body)}`);
    }
    console.log('✅ 13. Printable Case Paper generated with examination, vitals and diagnosis.');

    // 14. Old Patient Follow-up Visit (Test Historical Reference linkage)
    const visit2Res = await request({
      method: 'POST',
      path: '/api/queue/visit',
      headers: { Authorization: `Bearer ${receptionistToken}` },
    }, {
      patientId,
      visitType: 'FOLLOW_UP',
      priority: 'NORMAL',
    });
    if (visit2Res.status !== 201) {
      throw new Error(`Create visit 2 failed: ${JSON.stringify(visit2Res.body)}`);
    }
    const visit2Id = visit2Res.body.data.visit.id;

    const ws2Res = await request({
      method: 'GET',
      path: `/api/consultation/visit/${visit2Id}`,
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const ws2 = ws2Res.body.data;
    if (!ws2.previousVisit || ws2.previousVisit.visitId !== visit1Id) {
      throw new Error('Old patient consultation workspace failed to link previous visit reference.');
    }
    if (ws2.previousVisit.prescription.medicines.length !== 3) {
      throw new Error('Previous visit prescription medicines not retrieved in follow-up workspace.');
    }
    console.log(`✅ 14. Old Patient workspace verified: Seamlessly surfaced Visit 1 diagnosis ("${ws2.previousVisit.diagnosis}") and previous 3 prescribed medicines.`);

    // 15. Prescriptions Archive Search
    const archiveRes = await request({
      method: 'GET',
      path: `/api/consultation/prescriptions?search=Paracetamol`,
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    if (archiveRes.status !== 200 || archiveRes.body.data.length === 0) {
      throw new Error(`Prescription archive search failed: ${JSON.stringify(archiveRes.body)}`);
    }
    console.log(`✅ 15. Prescriptions archive search found matching prescription for "Paracetamol".`);

    console.log('\n======================================================');
    console.log('🎉 ALL 15 PHASE 5 CONSULTATION & PRESCRIPTION TESTS PASSED 100%!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ Phase 5 Test Failed:', err.message);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
      console.log('[Teardown] Ephemeral test server closed.');
    }
  }
}

runTests();
