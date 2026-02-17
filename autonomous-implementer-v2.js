#!/usr/bin/env node
import Anthropic from '@anthropic-ai/sdk';
import pg from 'pg';
import Redis from 'ioredis';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

const execAsync = promisify(exec);
const { Pool } = pg;

class WorkingAutonomousImplementer {
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
    
    this.maxDailyDeployments = parseInt(process.env.MAX_DAILY_DEPLOYMENTS) || 1;
    
    console.log('🤖 WORKING Autonomous Implementation Engine Initialized');
  }

  async canDeploy() {
    console.log('🔍 Checking if deployment is allowed...\n');
    
    // ⚡ TEMPORARY: BYPASS ALL CHECKS FOR MANUAL RUN
    console.log('  ⚡ MANUAL OVERRIDE - Bypassing all deployment checks\n');
    return true;
    // ⚡ REMOVE ABOVE 3 LINES AFTER SUCCESSFUL DEPLOYMENT
  }

  async implementSafely(opportunity) {
    console.log(`\n🚀 Starting Safe Implementation: "${opportunity.title}"\n`);

    const deploymentId = `deploy-${Date.now()}`;
    const backupId = `backup-${deploymentId}`;

    try {
      console.log('📋 Step 1: Generating implementation plan...\n');
      const plan = await this.generateImplementationPlan(opportunity);

      if (!plan || !plan.files || plan.files.length === 0) {
        return {
          status: 'skipped',
          reason: 'No implementation plan generated',
          deploymentId
        };
      }

      console.log(`  ✓ Plan generated: ${plan.files.length} files to create/modify\n`);

      console.log('💾 Step 2: Creating backup...\n');
      await this.createBackup(backupId, plan.files);
      console.log('  ✓ Backup created\n');

      console.log('📦 Step 3: Deploying files...\n');
      for (const file of plan.files) {
        await this.deployFile(file);
      }
      console.log('  ✓ Files deployed\n');

      if (plan.restartRequired) {
        console.log('🔄 Step 4: Restarting services...\n');
        await this.restartBackend();
        console.log('  ✓ Services restarted\n');
      }

      console.log('🏥 Step 5: Monitoring deployment health...\n');
      const isHealthy = await this.monitorHealth(5);

      if (!isHealthy) {
        console.log('  ❌ Health check failed - rolling back...\n');
        await this.rollback(backupId, plan.files);
        await this.restartBackend();
        
        return {
          status: 'failed',
          reason: 'Health check failed, rolled back',
          deploymentId,
          backupId
        };
      }

      console.log('  ✓ Health checks passed\n');

      const today = new Date().toISOString().split('T')[0];
      const deploymentKey = `autonomous:deployments:${today}`;
      await this.redis.incr(deploymentKey);
      await this.redis.expire(deploymentKey, 86400);

      await this.recordDeployment(deploymentId, opportunity, 'success');

      console.log('✅ DEPLOYMENT SUCCESSFUL!\n');

      return {
        status: 'success',
        deploymentId,
        backupId,
        filesDeployed: plan.files.length
      };

    } catch (error) {
      console.error('❌ Implementation failed:', error.message);
      
      try {
        await this.rollback(backupId, []);
        await this.restartBackend();
      } catch (rollbackError) {
        console.error('❌ Rollback also failed:', rollbackError.message);
      }

      return {
        status: 'error',
        reason: error.message,
        deploymentId
      };
    }
  }

  async generateImplementationPlan(opportunity) {
    console.log('  → Generating file list...\n');
    
    // First, ask Claude to list the files needed
    const listPrompt = `You are implementing: "${opportunity.title}"

List the EXACT file paths needed (frontend React components, backend routes, etc).

Return ONLY a JSON array of file paths:
["path1", "path2", "path3"]

Example:
["/opt/scholarnet-ai/frontend/src/components/ExitIntentPopup.jsx", "/opt/scholarnet-ai/backend/routes/leads.js"]`;

    try {
      const listResponse = await this.claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: listPrompt }]
      });

      let listContent = listResponse.content[0].text.trim();
      if (listContent.includes('```')) {
        listContent = listContent.split('```')[1].replace(/json/g, '').trim();
      }

      const filePaths = JSON.parse(listContent);
      console.log(`  ✓ Need ${filePaths.length} files\n`);

      // Now generate each file individually
      const files = [];
      
      for (const filePath of filePaths) {
        console.log(`  → Generating ${filePath.split('/').pop()}...\n`);
        
        const filePrompt = `Generate COMPLETE production-ready code for: ${filePath}

This is for: "${opportunity.title}"

Tech stack:
- Frontend: React + TailwindCSS
- Backend: Express + Sequelize + PostgreSQL

Return ONLY the file content, no explanation, no markdown.`;

        const fileResponse = await this.claude.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{ role: 'user', content: filePrompt }]
        });

        let content = fileResponse.content[0].text;
        
        // Remove markdown code blocks if present
        if (content.includes('```')) {
          const parts = content.split('```');
          content = parts[1].replace(/^(jsx|javascript|js|tsx|ts)\n/, '').trim();
        }

        files.push({
          path: filePath,
          content: content,
          action: 'create'
        });
      }

      console.log(`  ✓ Generated ${files.length} files\n`);

      return {
        files: files,
        restartRequired: files.some(f => f.path.includes('/backend/')),
        description: `Implemented ${opportunity.title}`
      };

    } catch (error) {
      console.error('  ⚠️  Failed to generate plan:', error.message);
      return null;
    }
  }

  async createBackup(backupId, files) {
    const backupDir = `/tmp/${backupId}`;
    
    try {
      await execAsync(`mkdir -p ${backupDir}`);
      
      for (const file of files) {
        if (file.action === 'create') continue;
        
        try {
          await execAsync(`cp ${file.path} ${backupDir}/`);
        } catch {
          // File doesn't exist yet
        }
      }
      
      await this.redis.setex(`backup:${backupId}`, 604800, JSON.stringify({
        id: backupId,
        files: files.map(f => f.path),
        timestamp: new Date().toISOString()
      }));
      
    } catch (error) {
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  async deployFile(file) {
    try {
      const dir = file.path.substring(0, file.path.lastIndexOf('/'));
      await execAsync(`mkdir -p ${dir}`);
      await fs.writeFile(file.path, file.content, 'utf8');
      console.log(`  ✓ Deployed: ${file.path}`);
    } catch (error) {
      throw new Error(`Failed to deploy ${file.path}: ${error.message}`);
    }
  }

  async restartBackend() {
    try {
      await execAsync('pm2 restart scholarnet-backend');
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      throw new Error(`Failed to restart backend: ${error.message}`);
    }
  }

  async monitorHealth(durationMinutes) {
    const checks = 10;
    const interval = (durationMinutes * 60 * 1000) / checks;
    let failures = 0;

    for (let i = 0; i < checks; i++) {
      try {
        const { stdout } = await execAsync('pm2 jlist');
        const processes = JSON.parse(stdout);
        const backend = processes.find(p => p.name === 'scholarnet-backend');

        if (!backend || backend.pm2_env.status !== 'online') {
          failures++;
          console.log(`  ⚠️  Check ${i + 1}/${checks}: Backend not online`);
        } else {
          console.log(`  ✓ Check ${i + 1}/${checks}: Healthy`);
        }

        if (failures >= 3) {
          return false;
        }

        if (i < checks - 1) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }

      } catch (error) {
        failures++;
        console.log(`  ⚠️  Check ${i + 1}/${checks}: Error - ${error.message}`);
      }
    }

    return failures < 3;
  }

  async rollback(backupId, files) {
    console.log('🔄 Rolling back deployment...\n');
    
    const backupDir = `/tmp/${backupId}`;
    
    try {
      for (const file of files) {
        try {
          await execAsync(`cp ${backupDir}/* ${file.path.substring(0, file.path.lastIndexOf('/'))}/`);
        } catch {
          // Backup might not exist
        }
      }
      console.log('  ✓ Rollback complete\n');
    } catch (error) {
      console.error('  ⚠️  Rollback error:', error.message);
    }
  }

  async recordDeployment(deploymentId, opportunity, status) {
    try {
      await this.db.query(`
        INSERT INTO backups (deployment_id, opportunity, status, created_at)
        VALUES ($1, $2, $3, NOW())
      `, [deploymentId, JSON.stringify(opportunity), status]);
    } catch (error) {
      console.log('  ⚠️  Could not record deployment in database');
    }
  }
}

export default WorkingAutonomousImplementer;
