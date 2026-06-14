const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const root = path.join(__dirname, "..");
const dataDir = path.join(root, "data");
const backupDir = path.join(root, "backups");
const dbPath = path.join(dataDir, "deutschquest.sqlite");

if (!fs.existsSync(dbPath)) {
  console.error(`SQLite database not found: ${dbPath}`);
  process.exit(1);
}

fs.mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(backupDir, `deutschquest-${stamp}.sqlite`);
const escapedBackupPath = backupPath.replaceAll("'", "''");
const db = new DatabaseSync(dbPath);

db.exec(`VACUUM INTO '${escapedBackupPath}'`);
db.close();

console.log(backupPath);
