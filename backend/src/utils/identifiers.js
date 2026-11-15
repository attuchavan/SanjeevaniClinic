const { getDatabase } = require('../config/database');

/**
 * Generate sequential Visit Number
 * Format: VN-YYYY-XXXX (e.g. VN-2026-0001)
 */
function generateNextVisitNumber() {
  const db = getDatabase();
  const currentYear = new Date().getFullYear();
  const prefix = `VN-${currentYear}-`;

  const lastVisit = db
    .prepare(
      `SELECT visit_number FROM visits 
       WHERE visit_number LIKE ? 
       ORDER BY id DESC LIMIT 1`
    )
    .get(`${prefix}%`);

  let nextSequence = 1;
  if (lastVisit && lastVisit.visit_number) {
    const parts = lastVisit.visit_number.split('-');
    if (parts.length === 3) {
      const seq = parseInt(parts[2], 10);
      if (!isNaN(seq)) nextSequence = seq + 1;
    }
  }

  return `${prefix}${String(nextSequence).padStart(4, '0')}`;
}

/**
 * Generate sequential Appointment Number
 * Format: APT-YYYY-XXXX (e.g. APT-2026-0001)
 */
function generateNextAppointmentNumber() {
  const db = getDatabase();
  const currentYear = new Date().getFullYear();
  const prefix = `APT-${currentYear}-`;

  const lastApt = db
    .prepare(
      `SELECT appointment_number FROM appointments 
       WHERE appointment_number LIKE ? 
       ORDER BY id DESC LIMIT 1`
    )
    .get(`${prefix}%`);

  let nextSequence = 1;
  if (lastApt && lastApt.appointment_number) {
    const parts = lastApt.appointment_number.split('-');
    if (parts.length === 3) {
      const seq = parseInt(parts[2], 10);
      if (!isNaN(seq)) nextSequence = seq + 1;
    }
  }

  return `${prefix}${String(nextSequence).padStart(4, '0')}`;
}

/**
 * Generate next daily sequential token number for given date (defaults to today)
 */
function getNextDailyToken(dateStr) {
  const db = getDatabase();
  const targetDate = dateStr || new Date().toISOString().split('T')[0];

  const maxTokenRow = db
    .prepare(
      `SELECT MAX(token_number) as max_token FROM visits 
       WHERE visit_date = ?`
    )
    .get(targetDate);

  const nextToken = (maxTokenRow?.max_token || 0) + 1;
  return nextToken;
}

module.exports = {
  generateNextVisitNumber,
  generateNextAppointmentNumber,
  getNextDailyToken,
};
