// scripts/monitor.js
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

class PlatformMonitor {
  constructor() {
    this.baseUrl = `http://localhost:${process.env.PORT || 3000}`;
    this.checks = [
      { name: 'Health Check', endpoint: '/health', critical: true },
      { name: 'API Docs', endpoint: '/api/docs', critical: false },
      { name: 'Project List', endpoint: '/api/projects?limit=1', critical: true },
      { name: 'Platform Stats', endpoint: '/api/platform/analytics', critical: false }
    ];
    this.alertThreshold = 3; // Alert after 3 consecutive failures
    this.failures = new Map();
  }

  async runChecks() {
    console.log(`🔍 Running platform health checks... (${new Date().toISOString()})`);
    
    const results = [];
    
    for (const check of this.checks) {
      try {
        const start = Date.now();
        const response = await axios.get(`${this.baseUrl}${check.endpoint}`, {
          timeout: 10000,
          headers: { 'x-monitor': 'true' }
        });
        
        const duration = Date.now() - start;
        const result = {
          name: check.name,
          status: 'healthy',
          duration: `${duration}ms`,
          statusCode: response.status,
          critical: check.critical
        };
        
        results.push(result);
        console.log(`✅ ${check.name}: ${duration}ms`);
        
        // Reset failure count on success
        this.failures.delete(check.name);
        
      } catch (error) {
        const result = {
          name: check.name,
          status: 'failed',
          error: error.message,
          critical: check.critical
        };
        
        results.push(result);
        console.log(`❌ ${check.name}: ${error.message}`);
        
        // Track failures
        const currentFailures = this.failures.get(check.name) || 0;
        this.failures.set(check.name, currentFailures + 1);
        
        // Send alert if threshold reached
        if (currentFailures + 1 >= this.alertThreshold && check.critical) {
          await this.sendAlert(check.name, error.message);
        }
      }
    }
    
    // Log summary
    const healthy = results.filter(r => r.status === 'healthy').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const criticalFailed = results.filter(r => r.status === 'failed' && r.critical).length;
    
    console.log(`\n📊 Health Check Summary:`);
    console.log(`   ✅ Healthy: ${healthy}/${results.length}`);
    console.log(`   ❌ Failed: ${failed}/${results.length}`);
    console.log(`   🚨 Critical Failed: ${criticalFailed}`);
    
    // Write results to file
    const logEntry = {
      timestamp: new Date().toISOString(),
      summary: { healthy, failed, criticalFailed, total: results.length },
      checks: results
    };
    
    this.writeLogEntry(logEntry);
    
    return results;
  }

  async sendAlert(checkName, error) {
    try {
      const webhookUrl = process.env.ALERT_WEBHOOK_URL;
      if (!webhookUrl) return;

      const message = {
        text: `🚨 Platform Alert: ${checkName} has failed ${this.failures.get(checkName)} times in a row`,
        attachments: [
          {
            color: 'danger',
            fields: [
              {
                title: 'Error',
                value: error,
                short: false
              },
              {
                title: 'Platform',
                value: 'Hybrid Freelance Platform',
                short: true
              },
              {
                title: 'Environment',
                value: process.env.NODE_ENV || 'development',
                short: true
              }
            ],
            timestamp: Date.now()
          }
        ]
      };

      await axios.post(webhookUrl, message);
      console.log(`📢 Alert sent for ${checkName}`);
      
    } catch (alertError) {
      console.error('❌ Failed to send alert:', alertError.message);
    }
  }

  writeLogEntry(logEntry) {
    try {
      const logsDir = './logs';
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      const logFile = path.join(logsDir, 'monitor.log');
      const logLine = JSON.stringify(logEntry) + '\n';
      
      fs.appendFileSync(logFile, logLine);
      
    } catch (error) {
      console.error('❌ Failed to write log entry:', error);
    }
  }

  startMonitoring(intervalMinutes = 5) {
    console.log(`🚀 Starting platform monitoring (every ${intervalMinutes} minutes)...`);
    
    // Run initial check
    this.runChecks();
    
    // Schedule recurring checks
    const interval = intervalMinutes * 60 * 1000;
    setInterval(() => {
      this.runChecks();
    }, interval);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n📤 Stopping platform monitor...');
      process.exit(0);
    });
  }
}

if (require.main === module) {
  const monitor = new PlatformMonitor();
  const intervalMinutes = parseInt(process.argv[2]) || 5;
  monitor.startMonitoring(intervalMinutes);
}

module.exports = PlatformMonitor;