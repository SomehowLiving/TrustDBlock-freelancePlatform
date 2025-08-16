// scripts/backup-database.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function backupDatabase() {
  try {
    console.log('💾 Starting database backup...');

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/freelance-platform';
    const backupDir = process.env.BACKUP_STORAGE_PATH || './backups';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}`);

    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Create mongodump command
    const command = `mongodump --uri="${mongoUri}" --out="${backupPath}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Backup failed:', error);
        return;
      }

      if (stderr) {
        console.warn('⚠️  Backup warnings:', stderr);
      }

      console.log(`✅ Database backup completed: ${backupPath}`);
      console.log('📊 Backup details:', stdout);

      // Clean up old backups (keep last 30 days)
      const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || '30');
      const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

      fs.readdir(backupDir, (err, files) => {
        if (err) return;

        files.forEach(file => {
          const filePath = path.join(backupDir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.isDirectory() && stats.birthtime.getTime() < cutoffTime) {
            fs.rmSync(filePath, { recursive: true, force: true });
            console.log(`🗑️  Removed old backup: ${file}`);
          }
        });
      });
    });

  } catch (error) {
    console.error('❌ Backup process failed:', error);
  }
}

if (require.main === module) {
  backupDatabase();
}

module.exports = backupDatabase;

