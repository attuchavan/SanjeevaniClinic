const { getDatabase } = require('../config/database');
const { broadcastQueueUpdate } = require('../socket');

class ConsultationService {
  /**
   * Get complete consultation workspace for a visit
   * Returns current visit, patient profile, case paper draft/saved,
   * prescription draft/saved, and most recent previous visit reference (for Old Patient review).
   */
  getConsultationWorkspace(visitId) {
    const db = getDatabase();

    // 1. Fetch visit and patient profile
    const visit = db.prepare(`
      SELECT 
        v.id, v.visit_number, v.patient_id, v.appointment_id,
        v.visit_date, v.visit_time, v.visit_type, v.token_number,
        v.priority, v.status, v.called_at, v.completed_at, v.created_at,
        p.uhid, p.full_name, p.age, p.dob as date_of_birth, p.gender,
        p.mobile_number, p.address, p.allergies, p.blood_group,
        p.created_at as patient_registered_at
      FROM visits v
      JOIN patients p ON p.id = v.patient_id
      WHERE v.id = ?
    `).get(visitId);

    if (!visit) {
      const err = new Error('Visit record not found');
      err.statusCode = 404;
      throw err;
    }

    // 2. Fetch or initialize case paper
    let casePaper = db.prepare(`
      SELECT * FROM case_papers WHERE visit_id = ?
    `).get(visitId);

    if (!casePaper) {
      // Auto-initialize draft if not yet generated
      const insert = db.prepare(`
        INSERT INTO case_papers (
          visit_id, patient_id, case_paper_type, is_finalized,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, 0,
          datetime('now', 'localtime'), datetime('now', 'localtime')
        )
      `).run(visit.id, visit.patient_id, visit.visit_type === 'NEW' ? 'NEW' : 'OLD');

      casePaper = db.prepare('SELECT * FROM case_papers WHERE id = ?').get(insert.lastInsertRowid);
    }

    // Parse vitals JSON if available
    let parsedVitals = null;
    if (casePaper.vitals_json) {
      try {
        parsedVitals = JSON.parse(casePaper.vitals_json);
      } catch (e) {
        parsedVitals = null;
      }
    }

    // 3. Fetch prescription and medicines
    let prescription = db.prepare(`
      SELECT pr.*, u.full_name as doctor_name
      FROM prescriptions pr
      LEFT JOIN users u ON u.id = pr.doctor_id
      WHERE pr.visit_id = ?
    `).get(visitId);

    let medicines = [];
    if (prescription) {
      medicines = db.prepare(`
        SELECT id, prescription_id, medicine_name, dosage, frequency, timing, duration, instructions
        FROM prescription_medicines
        WHERE prescription_id = ?
        ORDER BY id ASC
      `).all(prescription.id);
    }

    // 4. Fetch previous visit reference (if any prior visit exists for this patient)
    const previousVisitRow = db.prepare(`
      SELECT 
        v.id, v.visit_number, v.visit_date, v.visit_type, v.status,
        cp.chief_complaints, cp.diagnosis, cp.doctor_notes,
        cp.clinical_examination, cp.vitals_json, cp.follow_up_instructions,
        pr.id as previous_prescription_id, pr.diagnosis_summary, pr.advice_notes
      FROM visits v
      LEFT JOIN case_papers cp ON cp.visit_id = v.id
      LEFT JOIN prescriptions pr ON pr.visit_id = v.id
      WHERE v.patient_id = ? AND v.id != ? AND v.status = 'COMPLETED'
      ORDER BY v.visit_date DESC, v.id DESC
      LIMIT 1
    `).get(visit.patient_id, visitId);

    let previousMedicines = [];
    let previousVitals = null;
    if (previousVisitRow) {
      if (previousVisitRow.previous_prescription_id) {
        previousMedicines = db.prepare(`
          SELECT medicine_name, dosage, frequency, timing, duration, instructions
          FROM prescription_medicines
          WHERE prescription_id = ?
          ORDER BY id ASC
        `).all(previousVisitRow.previous_prescription_id);
      }
      if (previousVisitRow.vitals_json) {
        try {
          previousVitals = JSON.parse(previousVisitRow.vitals_json);
        } catch (e) {
          previousVitals = null;
        }
      }
    }

    const previousVisit = previousVisitRow ? {
      visitId: previousVisitRow.id,
      visitNumber: previousVisitRow.visit_number,
      visitDate: previousVisitRow.visit_date,
      chiefComplaints: previousVisitRow.chief_complaints,
      diagnosis: previousVisitRow.diagnosis,
      doctorNotes: previousVisitRow.doctor_notes,
      clinicalExamination: previousVisitRow.clinical_examination,
      vitals: previousVitals,
      followUpInstructions: previousVisitRow.follow_up_instructions,
      prescription: {
        diagnosisSummary: previousVisitRow.diagnosis_summary,
        adviceNotes: previousVisitRow.advice_notes,
        medicines: previousMedicines,
      },
    } : null;

    return {
      visit: {
        id: visit.id,
        visitNumber: visit.visit_number,
        visitDate: visit.visit_date,
        visitTime: visit.visit_time,
        visitType: visit.visit_type,
        tokenNumber: visit.token_number,
        priority: visit.priority,
        status: visit.status,
        calledAt: visit.called_at,
        completedAt: visit.completed_at,
      },
      patient: {
        id: visit.patient_id,
        uhid: visit.uhid,
        fullName: visit.full_name,
        age: visit.age,
        dateOfBirth: visit.date_of_birth,
        gender: visit.gender,
        mobileNumber: visit.mobile_number,
        address: visit.address,
        allergies: visit.allergies,
        bloodGroup: visit.blood_group,
        registeredAt: visit.patient_registered_at,
      },
      casePaper: {
        id: casePaper.id,
        casePaperType: casePaper.case_paper_type,
        chiefComplaints: casePaper.chief_complaints || '',
        medicalHistory: casePaper.medical_history || '',
        allergies: casePaper.allergies || visit.allergies || '',
        clinicalExamination: casePaper.clinical_examination || '',
        vitals: parsedVitals,
        diagnosis: casePaper.diagnosis || '',
        doctorNotes: casePaper.doctor_notes || '',
        followUpInstructions: casePaper.follow_up_instructions || '',
        followUpDate: casePaper.follow_up_date || '',
        isFinalized: Boolean(casePaper.is_finalized),
        finalizedAt: casePaper.finalized_at,
        updatedAt: casePaper.updated_at,
      },
      prescription: prescription ? {
        id: prescription.id,
        doctorId: prescription.doctor_id,
        doctorName: prescription.doctor_name,
        diagnosisSummary: prescription.diagnosis_summary || '',
        adviceNotes: prescription.advice_notes || '',
        isFinalized: Boolean(prescription.is_finalized),
        finalizedAt: prescription.finalized_at,
        medicines: medicines.map(m => ({
          id: m.id,
          medicineName: m.medicine_name,
          dosage: m.dosage,
          frequency: m.frequency,
          timing: m.timing,
          duration: m.duration,
          instructions: m.instructions,
        })),
      } : null,
      previousVisit,
    };
  }

  /**
   * Save or update case paper for a visit (Doctor only)
   */
  saveCasePaper(visitId, data, doctorId, clientIp) {
    const db = getDatabase();

    const visit = db.prepare('SELECT id, patient_id, status FROM visits WHERE id = ?').get(visitId);
    if (!visit) {
      const err = new Error('Visit record not found');
      err.statusCode = 404;
      throw err;
    }

    const isFinalized = Boolean(data.isFinalized);
    const vitalsJson = data.vitals ? JSON.stringify(data.vitals) : null;

    db.transaction(() => {
      // 1. Check if case paper exists, insert or update
      const existing = db.prepare('SELECT id FROM case_papers WHERE visit_id = ?').get(visitId);

      if (existing) {
        db.prepare(`
          UPDATE case_papers SET
            chief_complaints = ?,
            medical_history = ?,
            allergies = ?,
            clinical_examination = ?,
            vitals_json = ?,
            diagnosis = ?,
            doctor_notes = ?,
            follow_up_instructions = ?,
            follow_up_date = ?,
            is_finalized = ?,
            finalized_at = CASE WHEN ? = 1 THEN datetime('now', 'localtime') ELSE finalized_at END,
            updated_at = datetime('now', 'localtime')
          WHERE id = ?
        `).run(
          data.chiefComplaints || null,
          data.medicalHistory || null,
          data.allergies || null,
          data.clinicalExamination || null,
          vitalsJson,
          data.diagnosis || null,
          data.doctorNotes || null,
          data.followUpInstructions || null,
          data.followUpDate || null,
          isFinalized ? 1 : 0,
          isFinalized ? 1 : 0,
          existing.id
        );
      } else {
        db.prepare(`
          INSERT INTO case_papers (
            visit_id, patient_id, case_paper_type, chief_complaints,
            medical_history, allergies, clinical_examination, vitals_json,
            diagnosis, doctor_notes, follow_up_instructions, follow_up_date,
            is_finalized, finalized_at, created_at, updated_at
          ) VALUES (
            ?, ?, 'NEW', ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, CASE WHEN ? = 1 THEN datetime('now', 'localtime') ELSE NULL END,
            datetime('now', 'localtime'), datetime('now', 'localtime')
          )
        `).run(
          visitId,
          visit.patient_id,
          data.chiefComplaints || null,
          data.medicalHistory || null,
          data.allergies || null,
          data.clinicalExamination || null,
          vitalsJson,
          data.diagnosis || null,
          data.doctorNotes || null,
          data.followUpInstructions || null,
          data.followUpDate || null,
          isFinalized ? 1 : 0,
          isFinalized ? 1 : 0
        );
      }

      // 2. If allergies provided, update master patient record so future visits preserve it
      if (data.allergies !== undefined && data.allergies !== null) {
        db.prepare(`
          UPDATE patients 
          SET allergies = ?, updated_at = datetime('now', 'localtime')
          WHERE id = ?
        `).run(data.allergies, visit.patient_id);
      }

      // 3. If visit is in WAITING or CALLED status, advance to IN_PROGRESS
      if (visit.status === 'WAITING' || visit.status === 'CALLED') {
        db.prepare(`
          UPDATE visits 
          SET status = 'IN_PROGRESS', updated_at = datetime('now', 'localtime')
          WHERE id = ?
        `).run(visitId);
        broadcastQueueUpdate();
      }

      // 4. Audit log
      try {
        db.prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
          VALUES (?, ?, 'CASE_PAPER', ?, ?, ?)
        `).run(
          doctorId,
          isFinalized ? 'FINALIZE_CASE_PAPER' : 'SAVE_CASE_PAPER_DRAFT',
          String(visitId),
          JSON.stringify({ visitId, isFinalized, hasDiagnosis: Boolean(data.diagnosis) }),
          clientIp || '127.0.0.1'
        );
      } catch (auditErr) {
        // Continue if audit logging fails
      }
    })();

    return this.getConsultationWorkspace(visitId);
  }

  /**
   * Save or finalize prescription for a visit (Strictly Doctor only)
   */
  savePrescription(visitId, data, doctorId, clientIp) {
    const db = getDatabase();

    const visit = db.prepare('SELECT id, patient_id, status FROM visits WHERE id = ?').get(visitId);
    if (!visit) {
      const err = new Error('Visit record not found');
      err.statusCode = 404;
      throw err;
    }

    const isFinalized = Boolean(data.isFinalized);

    db.transaction(() => {
      // 1. Upsert prescriptions row
      let prescription = db.prepare('SELECT id, is_finalized FROM prescriptions WHERE visit_id = ?').get(visitId);

      let prescriptionId;
      if (prescription) {
        db.prepare(`
          UPDATE prescriptions SET
            doctor_id = ?,
            diagnosis_summary = ?,
            advice_notes = ?,
            is_finalized = ?,
            finalized_at = CASE WHEN ? = 1 THEN datetime('now', 'localtime') ELSE finalized_at END,
            updated_at = datetime('now', 'localtime')
          WHERE id = ?
        `).run(
          doctorId,
          data.diagnosisSummary || null,
          data.adviceNotes || null,
          isFinalized ? 1 : 0,
          isFinalized ? 1 : 0,
          prescription.id
        );
        prescriptionId = prescription.id;
      } else {
        const insertPr = db.prepare(`
          INSERT INTO prescriptions (
            visit_id, patient_id, doctor_id, diagnosis_summary,
            advice_notes, is_finalized, finalized_at, created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?,
            ?, ?, CASE WHEN ? = 1 THEN datetime('now', 'localtime') ELSE NULL END,
            datetime('now', 'localtime'), datetime('now', 'localtime')
          )
        `).run(
          visitId,
          visit.patient_id,
          doctorId,
          data.diagnosisSummary || null,
          data.adviceNotes || null,
          isFinalized ? 1 : 0,
          isFinalized ? 1 : 0
        );
        prescriptionId = insertPr.lastInsertRowid;
      }

      // 2. Replace medicines
      db.prepare('DELETE FROM prescription_medicines WHERE prescription_id = ?').run(prescriptionId);

      if (Array.isArray(data.medicines) && data.medicines.length > 0) {
        const insertMed = db.prepare(`
          INSERT INTO prescription_medicines (
            prescription_id, medicine_name, dosage, frequency, timing, duration, instructions, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
        `);

        for (const med of data.medicines) {
          insertMed.run(
            prescriptionId,
            med.medicineName,
            med.dosage || '1 tablet',
            med.frequency || '1-0-1',
            med.timing || 'After food',
            med.duration || '5 days',
            med.instructions || null
          );
        }
      }

      // 3. If finalizing prescription:
      if (isFinalized) {
        // Also finalize case paper if exists
        db.prepare(`
          UPDATE case_papers 
          SET is_finalized = 1, finalized_at = datetime('now', 'localtime'), updated_at = datetime('now', 'localtime')
          WHERE visit_id = ?
        `).run(visitId);

        // Transition visit to COMPLETED
        db.prepare(`
          UPDATE visits 
          SET status = 'COMPLETED', completed_at = datetime('now', 'localtime'), updated_at = datetime('now', 'localtime')
          WHERE id = ?
        `).run(visitId);
      }

      // 4. Audit log
      try {
        db.prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
          VALUES (?, ?, 'PRESCRIPTION', ?, ?, ?)
        `).run(
          doctorId,
          isFinalized ? 'FINALIZE_PRESCRIPTION' : 'SAVE_PRESCRIPTION_DRAFT',
          String(prescriptionId),
          JSON.stringify({ visitId, medicineCount: (data.medicines || []).length, isFinalized }),
          clientIp || '127.0.0.1'
        );
      } catch (auditErr) {
        // Continue if audit logging fails
      }
    })();

    // Broadcast queue update if finalized so receptionist screen updates in real time
    if (isFinalized) {
      broadcastQueueUpdate();
    }

    return this.getConsultationWorkspace(visitId);
  }

  /**
   * Get printable prescription details for Dr. Sharad Motugade's Sanjeevani Clinic
   * Accessible by both Doctor and Receptionist (for printing at front desk)
   */
  getPrintablePrescription(visitId) {
    const db = getDatabase();

    const visit = db.prepare(`
      SELECT 
        v.id, v.visit_number, v.visit_date, v.visit_time, v.token_number, v.status,
        p.id as patient_id, p.uhid, p.full_name, p.age, p.gender,
        p.mobile_number, p.address, p.allergies, p.blood_group,
        u.full_name as doctor_name, u.role as doctor_role,
        cp.chief_complaints, cp.clinical_examination, cp.vitals_json, cp.diagnosis,
        cp.follow_up_date, cp.follow_up_instructions,
        pr.id as prescription_id, pr.diagnosis_summary, pr.advice_notes,
        pr.is_finalized, pr.finalized_at
      FROM visits v
      JOIN patients p ON p.id = v.patient_id
      LEFT JOIN prescriptions pr ON pr.visit_id = v.id
      LEFT JOIN users u ON u.id = pr.doctor_id
      LEFT JOIN case_papers cp ON cp.visit_id = v.id
      WHERE v.id = ?
    `).get(visitId);

    if (!visit) {
      const err = new Error('Visit record not found');
      err.statusCode = 404;
      throw err;
    }

    let medicines = [];
    if (visit.prescription_id) {
      medicines = db.prepare(`
        SELECT id, medicine_name, dosage, frequency, timing, duration, instructions
        FROM prescription_medicines
        WHERE prescription_id = ?
        ORDER BY id ASC
      `).all(visit.prescription_id);
    }

    let vitals = null;
    if (visit.vitals_json) {
      try {
        vitals = JSON.parse(visit.vitals_json);
      } catch (e) {
        vitals = null;
      }
    }

    return {
      clinic: {
        name: 'SANJEEVANI CLINIC',
        tagline: 'Family Health Care & General Medical Consultation',
        doctorName: visit.doctor_name || 'Dr. Sharad Motugade',
        qualifications: 'M.B.B.S., M.D. (Physician & Consultant)',
        regNo: 'MCI-1998-54321',
        phone: '+91 98765 43210',
        address: 'Main Road, Clinic Complex, Opp. Civil Hospital',
      },
      visit: {
        id: visit.id,
        visitNumber: visit.visit_number,
        visitDate: visit.visit_date,
        visitTime: visit.visit_time,
        tokenNumber: visit.token_number,
        status: visit.status,
      },
      patient: {
        id: visit.patient_id,
        uhid: visit.uhid,
        fullName: visit.full_name,
        age: visit.age,
        gender: visit.gender,
        mobileNumber: visit.mobile_number,
        address: visit.address,
        allergies: visit.allergies,
        bloodGroup: visit.blood_group,
      },
      vitals,
      diagnosis: visit.diagnosis || visit.diagnosis_summary || 'General Consultation',
      chiefComplaints: visit.chief_complaints || '',
      medicines: medicines.map(m => ({
        id: m.id,
        medicineName: m.medicine_name,
        dosage: m.dosage,
        frequency: m.frequency,
        timing: m.timing,
        duration: m.duration,
        instructions: m.instructions,
      })),
      adviceNotes: visit.advice_notes || '',
      followUpDate: visit.follow_up_date || null,
      followUpInstructions: visit.follow_up_instructions || '',
      isFinalized: Boolean(visit.is_finalized),
      finalizedAt: visit.finalized_at,
    };
  }

  /**
   * Get printable Case Paper (New and Old patient formats)
   */
  getPrintableCasePaper(visitId) {
    const db = getDatabase();

    const visit = db.prepare(`
      SELECT 
        v.id, v.visit_number, v.visit_date, v.visit_time, v.visit_type, v.token_number,
        p.id as patient_id, p.uhid, p.full_name, p.age, p.gender,
        p.mobile_number, p.address, p.allergies, p.blood_group,
        cp.id as case_paper_id, cp.case_paper_type, cp.chief_complaints,
        cp.medical_history, cp.allergies as cp_allergies,
        cp.clinical_examination, cp.vitals_json, cp.diagnosis,
        cp.doctor_notes, cp.follow_up_instructions, cp.follow_up_date,
        cp.is_finalized, cp.finalized_at
      FROM visits v
      JOIN patients p ON p.id = v.patient_id
      LEFT JOIN case_papers cp ON cp.visit_id = v.id
      WHERE v.id = ?
    `).get(visitId);

    if (!visit) {
      const err = new Error('Visit record not found');
      err.statusCode = 404;
      throw err;
    }

    let vitals = null;
    if (visit.vitals_json) {
      try {
        vitals = JSON.parse(visit.vitals_json);
      } catch (e) {
        vitals = null;
      }
    }

    // Previous visit summary if old patient
    let previousVisit = null;
    if (visit.visit_type === 'OLD' || visit.case_paper_type === 'OLD') {
      const prev = db.prepare(`
        SELECT v.visit_number, v.visit_date, cp.chief_complaints, cp.diagnosis, cp.doctor_notes
        FROM visits v
        LEFT JOIN case_papers cp ON cp.visit_id = v.id
        WHERE v.patient_id = ? AND v.id != ? AND v.status = 'COMPLETED'
        ORDER BY v.visit_date DESC, v.id DESC
        LIMIT 1
      `).get(visit.patient_id, visitId);

      if (prev) {
        previousVisit = prev;
      }
    }

    return {
      clinic: {
        name: 'SANJEEVANI CLINIC',
        doctorName: 'Dr. Sharad Motugade',
        qualifications: 'M.B.B.S., M.D. (Physician & Consultant)',
      },
      visit: {
        id: visit.id,
        visitNumber: visit.visit_number,
        visitDate: visit.visit_date,
        visitTime: visit.visit_time,
        visitType: visit.visit_type,
        tokenNumber: visit.token_number,
      },
      patient: {
        id: visit.patient_id,
        uhid: visit.uhid,
        fullName: visit.full_name,
        age: visit.age,
        gender: visit.gender,
        mobileNumber: visit.mobile_number,
        address: visit.address,
        allergies: visit.cp_allergies || visit.allergies,
        bloodGroup: visit.blood_group,
      },
      casePaper: {
        casePaperType: visit.case_paper_type || visit.visit_type,
        chiefComplaints: visit.chief_complaints,
        medicalHistory: visit.medical_history,
        clinicalExamination: visit.clinical_examination,
        vitals,
        diagnosis: visit.diagnosis,
        doctorNotes: visit.doctor_notes,
        followUpInstructions: visit.follow_up_instructions,
        followUpDate: visit.follow_up_date,
        isFinalized: Boolean(visit.is_finalized),
        finalizedAt: visit.finalized_at,
      },
      previousVisit,
    };
  }

  /**
   * Search / list past prescriptions for Dr. Sharad Motugade's archive
   */
  listPrescriptions({ search, date, page = 1, limit = 20 }) {
    const db = getDatabase();
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ` AND (
        p.full_name LIKE ? OR 
        p.uhid LIKE ? OR 
        v.visit_number LIKE ? OR 
        pr.diagnosis_summary LIKE ? OR
        EXISTS (
          SELECT 1 FROM prescription_medicines pm 
          WHERE pm.prescription_id = pr.id AND pm.medicine_name LIKE ?
        )
      )`;
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    if (date) {
      whereClause += ' AND v.visit_date = ?';
      params.push(date);
    }

    const countSql = `
      SELECT COUNT(DISTINCT pr.id) as total
      FROM prescriptions pr
      JOIN visits v ON v.id = pr.visit_id
      JOIN patients p ON p.id = pr.patient_id
      ${whereClause}
    `;
    const total = db.prepare(countSql).get(...params).total;

    const listSql = `
      SELECT 
        pr.id, pr.visit_id, pr.diagnosis_summary, pr.advice_notes,
        pr.is_finalized, pr.finalized_at, pr.created_at,
        v.visit_number, v.visit_date, v.token_number,
        p.id as patient_id, p.uhid, p.full_name, p.age, p.gender, p.mobile_number,
        (SELECT COUNT(*) FROM prescription_medicines pm WHERE pm.prescription_id = pr.id) as medicine_count
      FROM prescriptions pr
      JOIN visits v ON v.id = pr.visit_id
      JOIN patients p ON p.id = pr.patient_id
      ${whereClause}
      ORDER BY pr.id DESC
      LIMIT ? OFFSET ?
    `;
    const prescriptions = db.prepare(listSql).all(...params, Number(limit), offset);

    return {
      prescriptions: prescriptions.map(pr => ({
        id: pr.id,
        visitId: pr.visit_id,
        visitNumber: pr.visit_number,
        visitDate: pr.visit_date,
        tokenNumber: pr.token_number,
        patientId: pr.patient_id,
        uhid: pr.uhid,
        patientName: pr.full_name,
        age: pr.age,
        gender: pr.gender,
        mobileNumber: pr.mobile_number,
        diagnosisSummary: pr.diagnosis_summary,
        adviceNotes: pr.advice_notes,
        medicineCount: pr.medicine_count,
        isFinalized: Boolean(pr.is_finalized),
        finalizedAt: pr.finalized_at,
        createdAt: pr.created_at,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }
}

module.exports = new ConsultationService();
