const { getDatabase } = require('../config/database');
const { generateNextUHID } = require('../utils/uhid');

class PatientService {
  /**
   * Register a new patient profile
   */
  registerPatient(patientData, userId, clientIp) {
    const db = getDatabase();

    // Auto-calculate age or dob if one is missing
    let finalAge = patientData.age;
    let finalDob = patientData.dob || null;

    if (!finalAge && finalDob) {
      const birthYear = new Date(finalDob).getFullYear();
      const currentYear = new Date().getFullYear();
      finalAge = Math.max(0, currentYear - birthYear);
    } else if (finalAge !== null && finalAge !== undefined && !finalDob) {
      const estimatedYear = new Date().getFullYear() - finalAge;
      finalDob = `${estimatedYear}-01-01`;
    }

    const uhid = generateNextUHID();

    const insertStmt = db.prepare(`
      INSERT INTO patients (
        uhid, full_name, age, dob, gender, mobile_number,
        address, blood_group, allergies, emergency_contact,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        datetime('now', 'localtime'), datetime('now', 'localtime')
      )
    `);

    const result = db.transaction(() => {
      const info = insertStmt.run(
        uhid,
        patientData.fullName.trim(),
        finalAge,
        finalDob,
        patientData.gender,
        patientData.mobileNumber.trim(),
        patientData.address ? patientData.address.trim() : null,
        patientData.bloodGroup || 'UNKNOWN',
        patientData.allergies ? patientData.allergies.trim() : null,
        patientData.emergencyContact ? patientData.emergencyContact.trim() : null
      );

      const newPatientId = info.lastInsertRowid;

      // Log in audit_logs
      try {
        db.prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
          VALUES (?, 'CREATE_PATIENT', 'PATIENT', ?, ?, ?)
        `).run(
          userId || null,
          String(newPatientId),
          JSON.stringify({ uhid, name: patientData.fullName, mobile: patientData.mobileNumber }),
          clientIp || 'local'
        );
      } catch (auditErr) {
        console.error('[Audit Error]', auditErr.message);
      }

      return this.getPatientById(newPatientId);
    })();

    return result;
  }

  /**
   * Check for duplicate patients by mobile number
   */
  checkDuplicateMobile(mobileNumber) {
    const db = getDatabase();
    const cleanMobile = String(mobileNumber).trim();
    if (!cleanMobile) return [];

    const existing = db.prepare(`
      SELECT id, uhid, full_name, age, gender, mobile_number, created_at
      FROM patients
      WHERE mobile_number = ?
      ORDER BY id DESC
    `).all(cleanMobile);

    return existing;
  }

  /**
   * Search and list patients with pagination
   */
  searchPatients({ query = '', page = 1, limit = 20 }) {
    const db = getDatabase();
    const offset = (Math.max(1, page) - 1) * limit;
    const trimmed = String(query).trim();

    let whereClause = '';
    let params = [];

    if (trimmed) {
      whereClause = `
        WHERE uhid LIKE ? 
           OR mobile_number LIKE ? 
           OR full_name LIKE ?
      `;
      const searchPattern = `%${trimmed}%`;
      params = [searchPattern, searchPattern, searchPattern];
    }

    const countRow = db.prepare(`
      SELECT count(*) as total FROM patients ${whereClause}
    `).get(...params);

    const total = countRow?.total || 0;

    const patients = db.prepare(`
      SELECT 
        p.id, p.uhid, p.full_name, p.age, p.dob, p.gender, 
        p.mobile_number, p.address, p.blood_group, p.allergies,
        p.created_at, p.updated_at,
        (SELECT count(*) FROM visits WHERE patient_id = p.id) as total_visits,
        (SELECT max(visit_date) FROM visits WHERE patient_id = p.id) as last_visit_date
      FROM patients p
      ${whereClause}
      ORDER BY p.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return {
      patients,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get single patient profile with clinical visit history
   */
  getPatientById(patientId) {
    const db = getDatabase();

    const patient = db.prepare(`
      SELECT 
        p.id, p.uhid, p.full_name, p.age, p.dob, p.gender, 
        p.mobile_number, p.address, p.blood_group, p.allergies,
        p.emergency_contact, p.created_at, p.updated_at
      FROM patients p
      WHERE p.id = ?
    `).get(patientId);

    if (!patient) {
      throw new Error('Patient not found');
    }

    // Retrieve lifetime visits history
    const visits = db.prepare(`
      SELECT 
        v.id, v.visit_number, v.visit_date, v.visit_time,
        v.visit_type, v.token_number, v.priority, v.status,
        v.called_at, v.completed_at,
        cp.diagnosis, cp.is_finalized as case_paper_finalized,
        pr.is_finalized as prescription_finalized
      FROM visits v
      LEFT JOIN case_papers cp ON cp.visit_id = v.id
      LEFT JOIN prescriptions pr ON pr.visit_id = v.id
      WHERE v.patient_id = ?
      ORDER BY v.id DESC
    `).all(patientId);

    return {
      ...patient,
      visits,
      totalVisits: visits.length,
    };
  }

  /**
   * Update patient demographics
   */
  updatePatient(patientId, updateData, userId, clientIp) {
    const db = getDatabase();
    const existing = db.prepare('SELECT id, uhid, full_name FROM patients WHERE id = ?').get(patientId);
    if (!existing) {
      throw new Error('Patient not found');
    }

    // Build dynamic UPDATE query
    const fields = [];
    const values = [];

    if (updateData.fullName !== undefined) {
      fields.push('full_name = ?');
      values.push(updateData.fullName.trim());
    }
    if (updateData.mobileNumber !== undefined) {
      fields.push('mobile_number = ?');
      values.push(updateData.mobileNumber.trim());
    }
    if (updateData.gender !== undefined) {
      fields.push('gender = ?');
      values.push(updateData.gender);
    }
    if (updateData.age !== undefined) {
      fields.push('age = ?');
      values.push(updateData.age);
    }
    if (updateData.dob !== undefined) {
      fields.push('dob = ?');
      values.push(updateData.dob || null);
    }
    if (updateData.address !== undefined) {
      fields.push('address = ?');
      values.push(updateData.address ? updateData.address.trim() : null);
    }
    if (updateData.bloodGroup !== undefined) {
      fields.push('blood_group = ?');
      values.push(updateData.bloodGroup);
    }
    if (updateData.allergies !== undefined) {
      fields.push('allergies = ?');
      values.push(updateData.allergies ? updateData.allergies.trim() : null);
    }
    if (updateData.emergencyContact !== undefined) {
      fields.push('emergency_contact = ?');
      values.push(updateData.emergencyContact ? updateData.emergencyContact.trim() : null);
    }

    if (fields.length === 0) {
      return this.getPatientById(patientId);
    }

    fields.push("updated_at = datetime('now', 'localtime')");
    values.push(patientId);

    const updateQuery = `UPDATE patients SET ${fields.join(', ')} WHERE id = ?`;

    db.transaction(() => {
      db.prepare(updateQuery).run(...values);

      // Audit log
      try {
        db.prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
          VALUES (?, 'UPDATE_PATIENT', 'PATIENT', ?, ?, ?)
        `).run(
          userId || null,
          String(patientId),
          JSON.stringify({ uhid: existing.uhid, updatedFields: Object.keys(updateData) }),
          clientIp || 'local'
        );
      } catch (auditErr) {
        console.error('[Audit Error]', auditErr.message);
      }
    })();

    return this.getPatientById(patientId);
  }
}

module.exports = new PatientService();

