const bcrypt = require('bcryptjs');
const { getDatabase } = require('../config/database');

async function seedInitialUsers() {
  const db = getDatabase();

  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, full_name, role, is_active)
    VALUES (?, ?, ?, ?, 1)
  `);

  const checkUser = db.prepare('SELECT id, username, role FROM users WHERE username = ?');

  // 1. Doctor account
  const doctorExists = checkUser.get('doctor');
  if (!doctorExists) {
    const hash = await bcrypt.hash('doctor123', 10);
    insertUser.run('doctor', hash, 'Dr. Sharad Motugade', 'DOCTOR');
    console.log('[Seed] Created default DOCTOR account: username "doctor"');
  } else {
    console.log('[Seed] DOCTOR account "doctor" already exists.');
  }

  // 2. Receptionist account
  const recExists = checkUser.get('receptionist');
  if (!recExists) {
    const hash = await bcrypt.hash('reception123', 10);
    insertUser.run('receptionist', hash, 'Reception Desk', 'RECEPTIONIST');
    console.log('[Seed] Created default RECEPTIONIST account: username "receptionist"');
  } else {
    console.log('[Seed] RECEPTIONIST account "receptionist" already exists.');
  }
}

if (require.main === module) {
  seedInitialUsers()
    .then(() => {
      console.log('[Seed] Database seeding completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed Error]', err);
      process.exit(1);
    });
}

module.exports = { seedInitialUsers };

