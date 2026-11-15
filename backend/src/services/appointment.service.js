const { getDatabase } = require('../config/database');
const { generateNextAppointmentNumber } = require('../utils/identifiers');
const queueService = require('./queue.service');
const { broadcastQueueUpdate } = require('../socket');

class AppointmentService {
  /**
   * Book a new advance or same-day appointment
   */
  bookAppointment({ patientId, appointmentDate, appointmentTime, type = 'NEW', notes = '' }, userId, clientIp) {
    const db = getDatabase();

    const patient = db.prepare('SELECT id, uhid, full_name, mobile_number FROM patients WHERE id = ?').get(patientId);
    if (!patient) {
      throw new Error('Patient record not found');
    }

    // Check for existing appointment at same date and time
    const existingSlot = db.prepare(`
      SELECT id, appointment_number FROM appointments
      WHERE appointment_date = ? AND appointment_time = ? AND status = 'SCHEDULED'
    `).get(appointmentDate, appointmentTime);

    if (existingSlot) {
      throw new Error(`Time slot ${appointmentTime} on ${appointmentDate} is already booked (${existingSlot.appointment_number}). Please pick another time.`);
    }

    const appointmentNumber = generateNextAppointmentNumber();

    const result = db.transaction(() => {
      const insertStmt = db.prepare(`
        INSERT INTO appointments (
          appointment_number, patient_id, appointment_date,
          appointment_time, type, status, notes,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?,
          ?, ?, 'SCHEDULED', ?,
          datetime('now', 'localtime'), datetime('now', 'localtime')
        )
      `);

      const info = insertStmt.run(
        appointmentNumber,
        patientId,
        appointmentDate,
        appointmentTime,
        type,
        notes ? notes.trim() : null
      );

      const newAptId = info.lastInsertRowid;

      // Audit log
      try {
        db.prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
          VALUES (?, 'BOOK_APPOINTMENT', 'APPOINTMENT', ?, ?, ?)
        `).run(
          userId || null,
          String(newAptId),
          JSON.stringify({
            appointmentNumber,
            uhid: patient.uhid,
            patientName: patient.full_name,
            date: appointmentDate,
            time: appointmentTime,
          }),
          clientIp || 'local'
        );
      } catch (auditErr) {
        console.error('[Audit Error]', auditErr.message);
      }

      return this.getAppointmentById(newAptId);
    })();

    // Broadcast update
    broadcastQueueUpdate({
      action: 'APPOINTMENT_BOOKED',
      appointment: result,
    });

    return result;
  }

  /**
   * List appointments with optional date and status filters
   */
  getAppointments({ date, status }) {
    const db = getDatabase();
    let whereClauses = [];
    let params = [];

    if (date) {
      whereClauses.push('a.appointment_date = ?');
      params.push(date);
    }

    if (status) {
      whereClauses.push('a.status = ?');
      params.push(status);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const appointments = db.prepare(`
      SELECT 
        a.id, a.appointment_number, a.appointment_date,
        a.appointment_time, a.type, a.status, a.notes,
        a.created_at,
        p.id as patient_id, p.uhid, p.full_name, p.age, p.gender,
        p.mobile_number, p.blood_group, p.allergies
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      ${whereString}
      ORDER BY a.appointment_date ASC, a.appointment_time ASC
    `).all(...params);

    return appointments;
  }

  /**
   * Get single appointment by ID
   */
  getAppointmentById(appointmentId) {
    const db = getDatabase();
    const apt = db.prepare(`
      SELECT 
        a.id, a.appointment_number, a.appointment_date,
        a.appointment_time, a.type, a.status, a.notes,
        a.created_at,
        p.id as patient_id, p.uhid, p.full_name, p.age, p.gender,
        p.mobile_number, p.blood_group, p.allergies
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      WHERE a.id = ?
    `).get(appointmentId);

    if (!apt) {
      throw new Error('Appointment not found');
    }

    return apt;
  }

  /**
   * Convert an appointment into an active queue visit upon patient arrival
   */
  checkInAppointment(appointmentId, priority = 'NORMAL', userId, clientIp) {
    const apt = this.getAppointmentById(appointmentId);

    if (apt.status === 'CHECKED_IN') {
      throw new Error('This appointment has already been checked in.');
    }

    if (apt.status === 'CANCELLED') {
      throw new Error('Cannot check in a cancelled appointment.');
    }

    const newVisit = queueService.createVisit({
      patientId: apt.patient_id,
      appointmentId: apt.id,
      visitType: apt.type === 'NEW' ? 'NEW' : 'FOLLOW_UP',
      priority,
    }, userId, clientIp);

    return newVisit;
  }

  /**
   * Cancel an appointment
   */
  cancelAppointment(appointmentId, notes, userId, clientIp) {
    const db = getDatabase();
    const apt = this.getAppointmentById(appointmentId);

    if (apt.status === 'COMPLETED' || apt.status === 'CHECKED_IN') {
      throw new Error(`Cannot cancel appointment with status ${apt.status}`);
    }

    db.transaction(() => {
      db.prepare(`
        UPDATE appointments 
        SET status = 'CANCELLED', notes = COALESCE(?, notes), updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(notes ? `Cancelled: ${notes}` : null, appointmentId);

      // Audit log
      try {
        db.prepare(`
          INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
          VALUES (?, 'CANCEL_APPOINTMENT', 'APPOINTMENT', ?, ?, ?)
        `).run(
          userId || null,
          String(appointmentId),
          JSON.stringify({ appointmentNumber: apt.appointment_number, uhid: apt.uhid, reason: notes }),
          clientIp || 'local'
        );
      } catch (auditErr) {
        console.error('[Audit Error]', auditErr.message);
      }
    })();

    const updated = this.getAppointmentById(appointmentId);

    broadcastQueueUpdate({
      action: 'APPOINTMENT_CANCELLED',
      appointment: updated,
    });

    return updated;
  }
}

module.exports = new AppointmentService();

