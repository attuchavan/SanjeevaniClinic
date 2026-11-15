const { getDatabase } = require('../config/database');
const { generateNextVisitNumber, getNextDailyToken } = require('../utils/identifiers');
const { broadcastQueueUpdate } = require('../socket');

class QueueService {
  /**
   * Get today's full live queue & summary metrics
   */
  getTodayQueue(targetDate) {
    const db = getDatabase();
    const queryDate = targetDate || new Date().toISOString().split('T')[0];

    const visits = db.prepare(`
      SELECT 
        v.id, v.visit_number, v.visit_date, v.visit_time,
        v.visit_type, v.token_number, v.priority, v.status,
        v.called_at, v.completed_at, v.created_at,
        p.id as patient_id, p.uhid, p.full_name, p.age, p.gender,
        p.mobile_number, p.blood_group, p.allergies,
        cp.id as case_paper_id, cp.diagnosis, cp.chief_complaints,
        cp.is_finalized as case_paper_finalized,
        pr.id as prescription_id, pr.is_finalized as prescription_finalized
      FROM visits v
      JOIN patients p ON p.id = v.patient_id
      LEFT JOIN case_papers cp ON cp.visit_id = v.id
      LEFT JOIN prescriptions pr ON pr.visit_id = v.id
      WHERE v.visit_date = ?
      ORDER BY 
        CASE 
          WHEN v.status = 'IN_PROGRESS' THEN 1
          WHEN v.status = 'CALLED' THEN 2
          WHEN v.priority = 'EMERGENCY' AND v.status = 'WAITING' THEN 3
          WHEN v.status = 'WAITING' THEN 4
          WHEN v.status = 'COMPLETED' THEN 5
          ELSE 6
        END,
        v.token_number ASC
    `).all(queryDate);

    // Calculate live summary counters
    let waiting = 0;
    let inProgress = 0;
    let called = 0;
    let completed = 0;
    let emergency = 0;

    for (const v of visits) {
      if (v.status === 'WAITING') waiting++;
      else if (v.status === 'IN_PROGRESS') inProgress++;
      else if (v.status === 'CALLED') called++;
      else if (v.status === 'COMPLETED') completed++;

      if (v.priority === 'EMERGENCY' && (v.status === 'WAITING' || v.status === 'CALLED')) {
        emergency++;
      }
    }

    const activeVisits = visits.filter(v => ['WAITING', 'CALLED', 'IN_PROGRESS'].includes(v.status));
    const completedVisits = visits.filter(v => ['COMPLETED', 'CANCELLED'].includes(v.status));

    // Currently active patient (in consultation or called)
    const currentPatient = visits.find(v => v.status === 'IN_PROGRESS') || 
                           visits.find(v => v.status === 'CALLED') || null;

    return {
      date: queryDate,
      summary: {
        total: visits.length,
        waiting,
        inProgress,
        called,
        completed,
        emergency,
      },
      currentPatient,
      activeQueue: activeVisits,
      completedQueue: completedVisits,
      allVisits: visits,
    };
  }

  /**
   * Create a walk-in visit or convert appointment into a queue token
   */
  createVisit({ patientId, appointmentId, visitType = 'NEW', priority = 'NORMAL' }, userId, clientIp) {
    const db = getDatabase();

    // Verify patient exists
    const patient = db.prepare('SELECT id, uhid, full_name, mobile_number FROM patients WHERE id = ?').get(patientId);
    if (!patient) {
      throw new Error('Patient record not found');
    }

    // If an appointment is specified, ensure it isn't already checked in
    if (appointmentId) {
      const apt = db.prepare('SELECT id, status FROM appointments WHERE id = ?').get(appointmentId);
      if (!apt) {
        throw new Error('Appointment not found');
      }
      if (apt.status === 'CHECKED_IN' || apt.status === 'COMPLETED') {
        throw new Error('This appointment has already been checked in to avoid duplicate visits.');
      }
    }

    const todayDate = new Date().toISOString().split('T')[0];
    const visitNumber = generateNextVisitNumber();
    const tokenNumber = getNextDailyToken(todayDate);

    const result = db.transaction(() => {
      // 1. Insert Visit
      const insertVisitStmt = db.prepare(`
        INSERT INTO visits (
          visit_number, patient_id, appointment_id,
          visit_date, visit_time, visit_type,
          token_number, priority, status,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?,
          ?, time('now', 'localtime'), ?,
          ?, ?, 'WAITING',
          datetime('now', 'localtime'), datetime('now', 'localtime')
        )
      `);

      const visitInfo = insertVisitStmt.run(
        visitNumber,
        patientId,
        appointmentId || null,
        todayDate,
        visitType,
        tokenNumber,
        priority
      );

      const newVisitId = visitInfo.lastInsertRowid;

      // 2. Mark appointment as checked in if provided
      if (appointmentId) {
        db.prepare(`
          UPDATE appointments 
          SET status = 'CHECKED_IN', updated_at = datetime('now', 'localtime')
          WHERE id = ?
        `).run(appointmentId);
      }

      // 3. Create initial Case Paper draft for this visit
      db.prepare(`
        INSERT INTO case_papers (
          visit_id, patient_id, case_paper_type, is_finalized,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, 0,
          datetime('now', 'localtime'), datetime('now', 'localtime')
        )
      `).run(newVisitId, patientId, visitType === 'NEW' ? 'NEW' : 'OLD');

      // 4. Record in audit_logs
      try {
        db.prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
          VALUES (?, 'CREATE_VISIT', 'VISIT', ?, ?, ?)
        `).run(
          userId || null,
          String(newVisitId),
          JSON.stringify({
            visitNumber,
            tokenNumber,
            uhid: patient.uhid,
            patientName: patient.full_name,
            priority,
          }),
          clientIp || 'local'
        );
      } catch (auditErr) {
        console.error('[Audit Error]', auditErr.message);
      }

      return this.getVisitById(newVisitId);
    })();

    // Broadcast queue update to all doctor and receptionist terminals via Socket.IO
    broadcastQueueUpdate({
      action: 'VISIT_CREATED',
      visit: result,
      queueSummary: this.getTodayQueue().summary,
    });

    return result;
  }

  /**
   * Get single visit by ID with patient details
   */
  getVisitById(visitId) {
    const db = getDatabase();
    const visit = db.prepare(`
      SELECT 
        v.id, v.visit_number, v.visit_date, v.visit_time,
        v.visit_type, v.token_number, v.priority, v.status,
        v.called_at, v.completed_at, v.created_at,
        p.id as patient_id, p.uhid, p.full_name, p.age, p.dob, p.gender,
        p.mobile_number, p.blood_group, p.allergies,
        cp.id as case_paper_id, cp.diagnosis, cp.chief_complaints,
        cp.is_finalized as case_paper_finalized
      FROM visits v
      JOIN patients p ON p.id = v.patient_id
      LEFT JOIN case_papers cp ON cp.visit_id = v.id
      WHERE v.id = ?
    `).get(visitId);

    if (!visit) {
      throw new Error('Visit not found');
    }

    return visit;
  }

  /**
   * Doctor calls the next patient in queue
   * Triage order: EMERGENCY waiting patients first, then lowest token number
   */
  callNextPatient(userId, clientIp) {
    const db = getDatabase();
    const todayDate = new Date().toISOString().split('T')[0];

    // Find next waiting patient
    const nextVisit = db.prepare(`
      SELECT id, visit_number, token_number, priority, patient_id
      FROM visits
      WHERE visit_date = ? AND status = 'WAITING'
      ORDER BY 
        CASE WHEN priority = 'EMERGENCY' THEN 1 ELSE 2 END,
        token_number ASC
      LIMIT 1
    `).get(todayDate);

    if (!nextVisit) {
      throw new Error('No waiting patients in queue to call.');
    }

    const updatedVisit = this.updateVisitStatus(
      nextVisit.id,
      { status: 'CALLED' },
      userId,
      clientIp
    );

    return updatedVisit;
  }

  /**
   * Update status or priority of a visit
   */
  updateVisitStatus(visitId, { status, priority }, userId, clientIp) {
    const db = getDatabase();
    const current = this.getVisitById(visitId);

    const fields = [];
    const values = [];

    if (status) {
      fields.push('status = ?');
      values.push(status);

      if (status === 'CALLED') {
        fields.push("called_at = datetime('now', 'localtime')");
      } else if (status === 'COMPLETED') {
        fields.push("completed_at = datetime('now', 'localtime')");
      }
    }

    if (priority) {
      fields.push('priority = ?');
      values.push(priority);
    }

    if (fields.length === 0) {
      return current;
    }

    fields.push("updated_at = datetime('now', 'localtime')");
    values.push(visitId);

    const updateQuery = `UPDATE visits SET ${fields.join(', ')} WHERE id = ?`;

    db.transaction(() => {
      db.prepare(updateQuery).run(...values);

      // Audit log
      try {
        db.prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
          VALUES (?, 'UPDATE_VISIT_STATUS', 'VISIT', ?, ?, ?)
        `).run(
          userId || null,
          String(visitId),
          JSON.stringify({
            visitNumber: current.visit_number,
            oldStatus: current.status,
            newStatus: status || current.status,
            priority: priority || current.priority,
          }),
          clientIp || 'local'
        );
      } catch (auditErr) {
        console.error('[Audit Error]', auditErr.message);
      }
    })();

    const updated = this.getVisitById(visitId);

    // Broadcast real-time update
    broadcastQueueUpdate({
      action: 'STATUS_UPDATED',
      visit: updated,
      queueSummary: this.getTodayQueue().summary,
    });

    return updated;
  }
}

module.exports = new QueueService();
