const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('./env');

// Ensure database directory exists
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db = null;

function getDatabase() {
  if (!db) {
    db = new Database(config.dbPath, {
      verbose: config.nodeEnv === 'development' && process.env.SQL_DEBUG === 'true' ? console.log : null,
    });

    // Enforce SQLite production best practices for offline-first LAN usage
    db.pragma('journal_mode = WAL');       // Write-Ahead Logging for high concurrency
    db.pragma('foreign_keys = ON');         // Enforce relational foreign key constraints
    db.pragma('synchronous = NORMAL');      // Faster transactions while safe in WAL mode
    db.pragma('busy_timeout = 5000');       // Wait up to 5s if locked before throwing error
    db.pragma('temp_store = MEMORY');       // Store temporary tables and indices in RAM
  }

  return db;
}

function checkDatabaseHealth() {
  try {
    const database = getDatabase();
    const result = database.prepare('SELECT 1 as is_alive').get();
    const journalMode = database.prepare('PRAGMA journal_mode').get()?.journal_mode;
    const foreignKeys = database.prepare('PRAGMA foreign_keys').get()?.foreign_keys;
    const tablesCount = database.prepare(
      "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).get()?.count || 0;

    return {
      connected: result?.is_alive === 1,
      journalMode,
      foreignKeys: foreignKeys === 1,
      tablesCount,
      path: config.dbPath,
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
      path: config.dbPath,
    };
  }
}

module.exports = {
  getDatabase,
  checkDatabaseHealth,
};

