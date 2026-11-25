const { getDatabase } = require('../config/database');

/**
 * Generate next sequential Unique Health Identifier (UHID)
 * Format: SC-YYYY-XXXX (e.g., SC-2026-0001)
 */
function generateNextUHID() {
  const db = getDatabase();
  const currentYear = new Date().getFullYear();
  const prefix = `SC-${currentYear}-`;

  // Find the highest number for the current year
  const lastPatient = db
    .prepare(
      `SELECT uhid FROM patients 
       WHERE uhid LIKE ? 
       ORDER BY id DESC LIMIT 1`
    )
    .get(`${prefix}%`);

  let nextSequence = 1;
  if (lastPatient && lastPatient.uhid) {
    const parts = lastPatient.uhid.split('-');
    if (parts.length === 3) {
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        nextSequence = lastSeq + 1;
      }
    }
  }

  // Format with 4 digits padding (e.g. 0001, 0002)
  const paddedSeq = String(nextSequence).padStart(4, '0');
  return `${prefix}${paddedSeq}`;
}

module.exports = {
  generateNextUHID,
};
