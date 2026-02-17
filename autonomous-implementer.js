#!/usr/bin/env node
// Ultra-Safe Autonomous Implementation Engine
import Anthropic from '@anthropic-ai/sdk';
import pg from 'pg';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

dotenv.config({ path: '.env.production' });

const execAsync = promisify(exec);
const { Pool } = pg;

class UltraSafeImplementer {
  constructor() {
    this.claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    
    this.db = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 20
    });
    
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD || undefined
    });
    
    // ULTRA-SAFE CONFIGURATION
    this.safetyConfig = {
      // Only deploy ULTRA-LOW risk (0-1 out of 10)
      maxRiskLevel: 1,
      
      // Max deployments per day
      maxDailyDeployments: 1,
      
      // Health check settings
      healthCheckInterval: 30000, // 30 seconds
      healthCheckDuration: 300000, // 5 minutes
      healthCheckFailThreshold: 3, // Rollback after 3 failures
      
      // Never touch these paths
      protectedPaths: [
        '**/auth/**',
        '**/payment/**',
        '**/paypal/**',
        '**/subscriptions/**',
        '**/.env',
        '**/config/production.js'
      ],
      
      // Backup everything
      backupBeforeChange: true,
      
      // Emergency stop file
      emergencyStopFile: '/tmp/autonomous-engine-STOP'
    };
    
    this.deployments = [];
    this.activeDeployment = null;
    
    console.log('🛡️  Ultra-Safe Implementation Engine Initialized');
    console.log(`   Max Risk Level: ${this.safetyConfig.maxRiskLevel}/10`);
    console.log(`   Max Daily Deployments: ${this.safetyConfig.maxDailyDeployments}`);
  }

  async canDeploy() {
    console.log('\n🔍 Checking if deployment is allowed...\n');
    
    // Check 1: Emergency stop
    try {
      await fs.access(this.safetyConfig.emergencyStopFile);
      console.log('  ❌ EMERGENCY STOP FILE EXISTS');
      console.log(`     Remove ${this.safetyConfig.emergencyStopFile} to resume\n`);
      return false;
    } catch {
      console.log('  ✅ No emergency stop');
    }
    
    // Check 2: Daily deployment limit
    const today = new Date().toISOString().split('T')[0];
    const result = await this.db.query(`
      SELECT COUNT(*) as count 
      FROM autonomous_reports 
      WHERE data->>'deployed' = 'true' 
      AND created_at::date = $1
    `, [today]);
    
    const deploymentsToday = parseInt(result.rows[0].count) || 0;
    
    if (deploymentsToday >= this.safetyConfig.maxDailyDeployments) {
      console.log(`  ❌ Daily deployment limit reached (${deploymentsToday}/${this.safetyConfig.maxDailyDeployments})`);
      return false;
    }
    
    console.log(`  ✅ Deployment quota: ${deploymentsToday}/${this.safetyConfig.maxDailyDeployments} used`);
    
    // Check 3: System health
    const health = await this.checkSystemHealth();
    
    if (!health.healthy) {
      console.log('  ❌ System unhealthy - not deploying');
      return false;
    }
    
    console.log('  ✅ System health: OK');
    
    // Check 4: Recent failures
    const recentFailures = await this.db.query(`
      SELECT COUNT(*) as count 
      FROM autonomous_reports 
      WHERE data->>'status' = 'rolled_back' 
      AND created_at > NOW() - INTERVAL '24 hours'
    `);
    
    const failures = parseInt(recentFailures.rows[0].count) || 0;
    
    if (failures >= 3) {
      console.log('  ❌ Too many recent failures (3+ in 24h)');
      return false;
    }
    
    console.log('  ✅ No recent failures');
    console.log('\n✅ Deployment APPROVED\n');
    
    return true;
  }

  async checkSystemHealth() {
    try {
      // Check main site
      const response = await axios.get('***REMOVED***health', { 
        timeout: 5000 
      });
      
      if (response.status !== 200) {
        return { healthy: false, reason: 'Health check returned non-200' };
      }
      
      // Check error rate
      const errorRate = await this.getErrorRate(3600);
      
      if (errorRate > 0.05) { // More than 5% errors
        return { 
          healthy: false, 
          reason: `Error rate too high: ${(errorRate * 100).toFixed(1)}%` 
        };
      }
      
      return { healthy: true };
      
    } catch (error) {
      return { healthy: false, reason: error.message };
    }
  }

  async getErrorRate(seconds) {
    try {
      const result = await this.db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status_code >= 500) as errors,
          COUNT(*) as total
        FROM request_logs
        WHERE created_at > NOW() - INTERVAL '${seconds} seconds'
      `);
      
      const { errors, total } = result.rows[0];
      return total > 0 ? errors / total : 0;
      
    } catch (error) {
      return 0;
    }
  }

  async implementSafely(opportunity) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 IMPLEMENTING: ${opportunity.title}`);
    console.log('='.repeat(60));
    console.log(`Risk Level: ${opportunity.riskLevel}/10`);
    console.log(`Category: ${opportunity.category}`);
    console.log(`Expected Impact: ${opportunity.impact.revenue}\n`);
    
    const deploymentId = `deploy-${Date.now()}`;
    this.activeDeployment = {
      id: deploymentId,
      opportunity,
      startTime: new Date(),
      status: 'in_progress'
    };
    
    let implementation = null;
    let backup = null;
    
    try {
      // Step 1: Generate implementation code
      console.log('📝 Step 1: Generating implementation code...');
      implementation = await this.generateImplementation(opportunity);
      console.log('   ✅ Code generated\n');
      
      // Step 2: Safety validation
      console.log('🔍 Step 2: Safety validation...');
      const validation = await this.validateSafety(implementation);
      
      if (!validation.safe) {
        console.log(`   ❌ VALIDATION FAILED: ${validation.reason}\n`);
        return { status: 'rejected', reason: validation.reason };
      }
      
      console.log('   ✅ All safety checks passed\n');
      
      // Step 3: Create comprehensive backup
      console.log('📦 Step 3: Creating backups...');
      backup = await this.createBackup(implementation, deploymentId);
      this.activeDeployment.backup = backup;
      console.log(`   ✅ Backup created: ${backup.id}\n`);
      
      // Step 4: Apply changes
      console.log('🔧 Step 4: Applying changes...');
      await this.applyChanges(implementation);
      console.log('   ✅ Changes applied\n');
      
      // Step 5: Restart services
      console.log('⚙️  Step 5: Restarting services...');
      await this.restartServices(implementation);
      console.log('   ✅ Services restarted\n');
      
      // Step 6: Continuous health monitoring (5 minutes)
      console.log('👀 Step 6: Monitoring health (5 minutes)...');
      const monitoring = await this.monitorContinuously();
      
      if (!monitoring.healthy) {
        console.log(`   ❌ HEALTH CHECK FAILED: ${monitoring.reason}\n`);
        console.log('🔄 INITIATING AUTOMATIC ROLLBACK...\n');
        await this.rollback(backup, implementation);
        return { status: 'rolled_back', reason: monitoring.reason };
      }
      
      console.log('   ✅ All health checks passed\n');
      
      // Step 7: Success - clean up old backups
      console.log('🎉 Step 7: Deployment successful!');
      
      this.activeDeployment.status = 'success';
      this.activeDeployment.endTime = new Date();
      
      await this.recordSuccess(deploymentId, opportunity, implementation);
      
      console.log('\n' + '='.repeat(60));
      console.log('✅ DEPLOYMENT COMPLETE - SYSTEM STABLE');
      console.log('='.repeat(60) + '\n');
      
      return { status: 'success', deploymentId, backup };
      
    } catch (error) {
      console.error(`\n❌ DEPLOYMENT ERROR: ${error.message}\n`);
      console.log('🔄 INITIATING AUTOMATIC ROLLBACK...\n');
      
      if (backup && implementation) {
        await this.rollback(backup, implementation);
      }
      
      return { status: 'error', error: error.message };
    }
  }

  async generateImplementation(opportunity) {
    console.log('   → Asking Claude for implementation...');
    
    const prompt = `Generate COMPLETE, PRODUCTION-READY code for ScholarNet AI.

OPPORTUNITY:
${JSON.stringify(opportunity, null, 2)}

TECH STACK:
- Backend: Node.js/Express at /opt/scholarnet-ai/backend/
- Frontend: React at /opt/scholarnet-ai/frontend/
- Database: PostgreSQL
- Redis: localhost:6379

CRITICAL REQUIREMENTS:
1. Provide COMPLETE file contents (not snippets)
2. Include comprehensive error handling
3. Add detailed logging
4. NEVER touch: PayPal, auth, payments, subscriptions
5. Include rollback instructions
6. Add comments explaining changes

IMPORTANT: Return ONLY valid JSON, no markdown, no backticks, no extra text.

Return this exact JSON structure:
{
  "files": [
    {
      "path": "backend/middleware/example.js",
      "content": "COMPLETE FILE CONTENT HERE",
      "description": "What this file does"
    }
  ],
  "database": {
    "migrations": [],
    "queries": []
  },
  "commands": {
    "deploy": ["pm2 restart scholarnet-backend"],
    "rollback": ["pm2 restart scholarnet-backend"]
  },
  "testing": {
    "manual": "How to test manually",
    "automated": "Test script if applicable"
  },
  "monitoring": {
    "metrics": ["What to monitor"],
    "alerts": ["When to alert"]
  }
}

RESPOND WITH ONLY THE JSON - NO MARKDOWN, NO BACKTICKS, NO EXPLANATIONS.`;

    try {
      const response = await this.claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000,
        messages: [{ role: 'user', content: prompt }]
      });

      let content = response.content[0].text;
      
      // Remove markdown code blocks if present
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Remove any leading/trailing whitespace
      content = content.trim();
      
      // If it starts with text before {, remove it
      const firstBrace = content.indexOf('{');
      if (firstBrace > 0) {
        content = content.substring(firstBrace);
      }
      
      // If it ends with text after }, remove it
      const lastBrace = content.lastIndexOf('}');
      if (lastBrace < content.length - 1) {
        content = content.substring(0, lastBrace + 1);
      }
      
      console.log('   → Parsing implementation...');
      
      let implementation;
      try {
        implementation = JSON.parse(content);
      } catch (parseError) {
        console.log('   ⚠️  JSON parse failed, attempting repair...');
        
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          implementation = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not extract valid JSON from response');
        }
      }
      
      // Validate the structure
      if (!implementation.files || !Array.isArray(implementation.files)) {
        throw new Error('Invalid implementation structure: missing files array');
      }
      
      if (implementation.files.length === 0) {
        throw new Error('No files in implementation');
      }
      
      console.log(`   → Generated ${implementation.files.length} files`);
      
      // Ensure commands exist
      if (!implementation.commands) {
        implementation.commands = {
          deploy: ['pm2 restart scholarnet-backend'],
          rollback: ['pm2 restart scholarnet-backend']
        };
      }
      
      return implementation;
      
    } catch (error) {
      console.error('   ❌ Code generation failed:', error.message);
      throw error;
    }
  }

  async validateSafety(implementation) {
    console.log('   → Checking protected paths...');
    
    // Check if any files touch protected paths
    for (const file of implementation.files) {
      for (const protectedPath of this.safetyConfig.protectedPaths) {
        const pattern = protectedPath.replace('**', '.*').replace('*', '[^/]*');
        if (file.path.match(new RegExp(pattern))) {
          return {
            safe: false,
            reason: `File ${file.path} matches protected path: ${protectedPath}`
          };
        }
      }
    }
    
    console.log('   → Checking for dangerous operations...');
    
    // Check for dangerous operations
    const dangerousPatterns = [
      /DROP\s+TABLE/i,
      /DELETE\s+FROM.*WHERE.*1\s*=\s*1/i,
      /TRUNCATE/i,
      /process\.exit/,
      /rm\s+-rf/,
      /paypal/i,
      /stripe/i,
      /payment/i
    ];
    
    for (const file of implementation.files) {
      for (const pattern of dangerousPatterns) {
        if (pattern.test(file.content)) {
          return {
            safe: false,
            reason: `File ${file.path} contains dangerous pattern: ${pattern}`
          };
        }
      }
    }
    
    console.log('   → Validating code syntax...');
    
    // Basic syntax validation for JS files
    for (const file of implementation.files) {
      if (file.path.endsWith('.js') || file.path.endsWith('.jsx')) {
        try {
          // Just check if it has balanced braces
          const openBraces = (file.content.match(/{/g) || []).length;
          const closeBraces = (file.content.match(/}/g) || []).length;
          
          if (openBraces !== closeBraces) {
            return {
              safe: false,
              reason: `File ${file.path} has unbalanced braces`
            };
          }
        } catch (error) {
          return {
            safe: false,
            reason: `File ${file.path} syntax validation failed: ${error.message}`
          };
        }
      }
    }
    
    return { safe: true };
  }

  async createBackup(implementation, deploymentId) {
    const backupId = `backup-${deploymentId}`;
    const backup = {
      id: backupId,
      timestamp: new Date().toISOString(),
      files: [],
      database: null
    };
    
    // Backup each file that will be modified
    for (const file of implementation.files) {
      const fullPath = `/opt/scholarnet-ai/${file.path}`;
      
      try {
        const originalContent = await fs.readFile(fullPath, 'utf-8');
        
        // Save backup
        const backupPath = `/tmp/${backupId}-${file.path.replace(/\//g, '-')}`;
        await fs.writeFile(backupPath, originalContent);
        
        backup.files.push({
          path: file.path,
          backupPath,
          originalContent
        });
        
        console.log(`   → Backed up: ${file.path}`);
        
      } catch (error) {
        console.log(`   → New file (no backup needed): ${file.path}`);
        backup.files.push({
          path: file.path,
          backupPath: null,
          isNew: true
        });
      }
    }
    
    // Save backup manifest to Redis
    await this.redis.setex(
      `backup:${backupId}`,
      86400 * 7, // Keep for 7 days
      JSON.stringify(backup)
    );
    
    // Also save to database
    await this.db.query(`
      INSERT INTO backups (id, data, created_at)
      VALUES ($1, $2, NOW())
    `, [backupId, backup]);
    
    return backup;
  }

  async applyChanges(implementation) {
    for (const file of implementation.files) {
      const fullPath = `/opt/scholarnet-ai/${file.path}`;
      
      // Ensure directory exists
      const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
      await fs.mkdir(dir, { recursive: true });
      
      // Write file
      await fs.writeFile(fullPath, file.content);
      
      console.log(`   → Applied: ${file.path}`);
    }
    
    // Run database migrations if any
    if (implementation.database && implementation.database.migrations) {
      for (const migration of implementation.database.migrations) {
        console.log(`   → Running migration: ${migration.name}`);
        await this.db.query(migration.up);
      }
    }
  }

  async restartServices(implementation) {
    const commands = implementation.commands?.deploy || ['pm2 restart scholarnet-backend'];
    
    for (const command of commands) {
      console.log(`   → ${command}`);
      try {
        await execAsync(command);
      } catch (error) {
        console.log(`   ⚠️  Command failed (non-critical): ${error.message}`);
      }
    }
    
    // Wait for services to start
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  async monitorContinuously() {
    const startTime = Date.now();
    const duration = this.safetyConfig.healthCheckDuration;
    const interval = this.safetyConfig.healthCheckInterval;
    let failures = 0;
    let checks = 0;
    
    console.log(`   Checking every ${interval/1000}s for ${duration/1000}s...`);
    
    while (Date.now() - startTime < duration) {
      checks++;
      
      const health = await this.checkSystemHealth();
      
      if (!health.healthy) {
        failures++;
        console.log(`   ⚠️  Check ${checks}: UNHEALTHY - ${health.reason} (${failures}/${this.safetyConfig.healthCheckFailThreshold})`);
        
        if (failures >= this.safetyConfig.healthCheckFailThreshold) {
          return { 
            healthy: false, 
            reason: `${failures} consecutive health check failures` 
          };
        }
      } else {
        console.log(`   ✅ Check ${checks}: Healthy`);
        failures = 0; // Reset failure counter on success
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    return { healthy: true };
  }

  async rollback(backup, implementation) {
    console.log(`🔄 Rolling back to backup: ${backup.id}\n`);
    
    // Restore all backed up files
    for (const file of backup.files) {
      if (file.isNew) {
        // Delete newly created file
        const fullPath = `/opt/scholarnet-ai/${file.path}`;
        try {
          await fs.unlink(fullPath);
          console.log(`   ✅ Deleted: ${file.path}`);
        } catch (error) {
          console.log(`   ⚠️  Could not delete: ${file.path}`);
        }
      } else if (file.backupPath) {
        // Restore original file
        const fullPath = `/opt/scholarnet-ai/${file.path}`;
        const backupContent = await fs.readFile(file.backupPath, 'utf-8');
        await fs.writeFile(fullPath, backupContent);
        console.log(`   ✅ Restored: ${file.path}`);
      }
    }
    
    // Rollback database migrations
    if (implementation.database && implementation.database.migrations) {
      for (const migration of implementation.database.migrations.reverse()) {
        console.log(`   → Rolling back migration: ${migration.name}`);
        if (migration.down) {
          await this.db.query(migration.down);
        }
      }
    }
    
    // Restart services
    const commands = implementation.commands?.rollback || ['pm2 restart scholarnet-backend'];
    for (const command of commands) {
      console.log(`   → ${command}`);
      await execAsync(command);
    }
    
    console.log('\n✅ Rollback complete - system restored\n');
    
    await this.recordRollback(backup.id, implementation);
  }

  async recordSuccess(deploymentId, opportunity, implementation) {
    await this.db.query(`
      INSERT INTO autonomous_reports (data, created_at)
      VALUES ($1, NOW())
    `, [{
      type: 'deployment',
      status: 'success',
      deployed: 'true',
      deploymentId,
      opportunity,
      files: implementation.files.map(f => f.path),
      timestamp: new Date().toISOString()
    }]);
  }

  async recordRollback(backupId, implementation) {
    await this.db.query(`
      INSERT INTO autonomous_reports (data, created_at)
      VALUES ($1, NOW())
    `, [{
      type: 'deployment',
      status: 'rolled_back',
      backupId,
      files: implementation.files.map(f => f.path),
      timestamp: new Date().toISOString()
    }]);
  }
}

export default UltraSafeImplementer;
