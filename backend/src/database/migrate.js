const fs = require('fs');
const path = require('path');
const { getDatabase } = require('../config/database');

function runMigrations() {
  const db = getDatabase();

  // Create migrations table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  const migrationsDir = path.resolve(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.log('[Migration] No migrations directory found.');
    return { success: true, count: 0 };
  }

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const appliedRows = db.prepare('SELECT name FROM _migrations').all();
  const appliedNames = new Set(appliedRows.map((r) => r.name));

  let appliedCount = 0;

  for (const file of migrationFiles) {
    if (!appliedNames.has(file)) {
      console.log(`[Migration] Applying ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      // Execute migration inside a transaction
      const applyTx = db.transaction(() => {
        db.exec(sql);
        db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
      });

      applyTx();
      appliedCount++;
      console.log(`[Migration] Successfully applied ${file}`);
    }
  }

  if (appliedCount === 0) {
    console.log('[Migration] Database is already up to date.');
  } else {
    console.log(`[Migration] Applied ${appliedCount} new migration(s).`);
  }

  return { success: true, count: appliedCount };
}

// Allow running directly from command line: node src/database/migrate.js
if (require.main === module) {
  try {
    runMigrations();
    process.exit(0);
  } catch (err) {
    console.error('[Migration Error]', err);
    process.exit(1);
  }
}

module.exports = { runMigrations };

