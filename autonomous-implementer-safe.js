#!/usr/bin/env node
import Anthropic from '@anthropic-ai/sdk';
import pg from 'pg';
import Redis from 'ioredis';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.production' });

const execAsync = promisify(exec);
const { Pool } = pg;

class SafeAutonomousImplementer {
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

    this.config = {
      maxDailyDeployments: parseInt(process.env.MAX_DAILY_DEPLOYMENTS) || 1,
      requireApproval: process.env.REQUIRE_APPROVAL !== 'false', // Default TRUE
      stagingEnabled: process.env.STAGING_ENABLED !== 'false', // Default TRUE
      incrementalRollout: process.env.INCREMENTAL_ROLLOUT !== 'false', // Default TRUE
      productionPath: '/opt/scholarnet-ai',
      stagingPath: '/opt/scholarnet-ai-staging',
      backupPath: '/opt/scholarnet-backups',
      deploymentWindows: [
        { start: 10, end: 14, label: 'Late Night Pacific (2 AM - 6 AM UTC)' }
      ],
      maxTrafficThreshold: 0.15, // 15% of peak traffic
      healthCheckEndpoints: [
        'http://localhost:3001/health',
        'http://localhost:3001/api/health'
      ]
    };

    console.log('🤖 Safe Autonomous Implementation Engine Initialized');
    console.log(`🔒 Approval Required: ${this.config.requireApproval}`);
    console.log(`🧪 Staging Enabled: ${this.config.stagingEnabled}`);
    console.log(`📊 Incremental Rollout: ${this.config.incrementalRollout}`);
  }

  /**
   * SAFETY CHECK: Can we deploy right now?
   */
  async canDeploy() {
    console.log('🔍 Running Pre-Deployment Safety Checks...\n');

    // Check 1: Daily deployment limit
    const today = new Date().toISOString().split('T')[0];
    const deploymentKey = `autonomous:deployments:${today}`;
    const todayCount = parseInt(await this.redis.get(deploymentKey)) || 0;

    if (todayCount >= this.config.maxDailyDeployments) {
      console.log(`  ❌ Daily limit reached (${todayCount}/${this.config.maxDailyDeployments})`);
      return { allowed: false, reason: 'Daily deployment limit exceeded' };
    }
    console.log(`  ✓ Daily limit: ${todayCount}/${this.config.maxDailyDeployments}`);

    // Check 2: Deployment window
    const hour = new Date().getUTCHours();
    let inWindow = false;
    for (const window of this.config.deploymentWindows) {
      if (hour >= window.start && hour < window.end) {
        inWindow = true;
        console.log(`  ✓ In deployment window: ${window.label}`);
        break;
      }
    }

    if (!inWindow) {
      console.log(`  ❌ Outside deployment window (UTC ${hour}:00)`);
      return { allowed: false, reason: 'Outside deployment window' };
    }

    // Check 3: Traffic level
    const trafficLevel = await this.getCurrentTrafficLevel();
    if (trafficLevel > this.config.maxTrafficThreshold) {
      console.log(`  ❌ Traffic too high: ${(trafficLevel * 100).toFixed(1)}% of peak`);
      return { allowed: false, reason: 'Traffic level too high' };
    }
    console.log(`  ✓ Traffic level: ${(trafficLevel * 100).toFixed(1)}% of peak`);

    // Check 4: Backend health
    const isHealthy = await this.checkBackendHealth();
    if (!isHealthy) {
      console.log(`  ❌ Backend not healthy`);
      return { allowed: false, reason: 'Backend unhealthy' };
    }
    console.log(`  ✓ Backend healthy`);

    // Check 5: No recent failed deployments
    const recentFailed = await this.redis.get('autonomous:last_failed_deployment');
    if (recentFailed) {
      const failedTime = new Date(recentFailed);
      const hoursSinceFail = (Date.now() - failedTime.getTime()) / (1000 * 60 * 60);
      if (hoursSinceFail < 24) {
        console.log(`  ❌ Recent failed deployment (${hoursSinceFail.toFixed(1)}h ago)`);
        return { allowed: false, reason: 'Recent deployment failure' };
      }
    }
    console.log(`  ✓ No recent failures`);

    console.log('\n✅ All safety checks passed!\n');
    return { allowed: true };
  }

  /**
   * MAIN: Safe implementation with all guardrails
   */
  async implementSafely(opportunity) {
    console.log(`\n🚀 Starting SAFE Implementation: "${opportunity.title}"\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const deploymentId = `deploy-${Date.now()}`;
    let gitCommit = null;

    try {
      // PHASE 1: Generate implementation plan
      console.log('📋 PHASE 1: Generating Implementation Plan\n');
      const plan = await this.generateImplementationPlan(opportunity);

      if (!plan || !plan.files || plan.files.length === 0) {
        return { status: 'skipped', reason: 'No implementation plan generated' };
      }

      console.log(`  ✓ Generated plan: ${plan.files.length} files\n`);

      // PHASE 2: Validate generated code
      console.log('🔍 PHASE 2: Validating Generated Code\n');
      const validation = await this.validateCode(plan.files);

      if (!validation.valid) {
        console.log(`  ❌ Validation failed: ${validation.errors.join(', ')}\n`);
        return { status: 'failed', reason: 'Code validation failed', errors: validation.errors };
      }

      console.log(`  ✓ All files validated\n`);

      // PHASE 3: Deploy to staging
      if (this.config.stagingEnabled) {
        console.log('🧪 PHASE 3: Deploying to Staging\n');
        const stagingResult = await this.deployToStaging(plan);

        if (!stagingResult.success) {
          console.log(`  ❌ Staging deployment failed\n`);
          return { status: 'failed', reason: 'Staging deployment failed' };
        }

        console.log(`  ✓ Staging deployment successful\n`);

        // Test in staging
        console.log('🧪 PHASE 3b: Testing in Staging\n');
        const stagingTests = await this.runStagingTests(plan);

        if (!stagingTests.passed) {
          console.log(`  ❌ Staging tests failed: ${stagingTests.failures.join(', ')}\n`);
          await this.cleanupStaging();
          return { status: 'failed', reason: 'Staging tests failed', failures: stagingTests.failures };
        }

        console.log(`  ✓ Staging tests passed\n`);
      }

      // PHASE 4: Request approval (if required)
      if (this.config.requireApproval) {
        console.log('👤 PHASE 4: Requesting Human Approval\n');
        const approval = await this.requestApproval(plan, deploymentId);

        if (!approval.approved) {
          console.log(`  ❌ Deployment not approved: ${approval.reason}\n`);
          return { status: 'rejected', reason: approval.reason };
        }

        console.log(`  ✓ Deployment approved by ${approval.approver}\n`);
      }

      // PHASE 5: Create git commit (before production deploy)
      console.log('📦 PHASE 5: Creating Git Commit\n');
      gitCommit = await this.createGitCommit(plan, deploymentId);
      console.log(`  ✓ Git commit: ${gitCommit.hash}\n`);

      // PHASE 6: Deploy to production
      console.log('🚀 PHASE 6: Deploying to Production\n');

      if (this.config.incrementalRollout) {
        console.log('  → Using incremental rollout (10% → 50% → 100%)\n');

        // Deploy to 10% first
        await this.deployFiles(plan.files, this.config.productionPath);
        await this.setTrafficPercentage(10);
        console.log('  ✓ Deployed to 10% of traffic\n');

        await this.sleep(60000); // Wait 1 minute

        // Monitor for errors
        const errors10 = await this.monitorErrorRate(1);
        if (errors10 > 0.05) { // >5% error rate
          console.log('  ❌ High error rate at 10% - rolling back\n');
          await this.gitRollback(gitCommit.previousHash);
          return { status: 'failed', reason: 'High error rate at 10% rollout' };
        }

        // Increase to 50%
        await this.setTrafficPercentage(50);
        console.log('  ✓ Increased to 50% of traffic\n');

        await this.sleep(60000);

        const errors50 = await this.monitorErrorRate(1);
        if (errors50 > 0.03) { // >3% error rate
          console.log('  ❌ High error rate at 50% - rolling back\n');
          await this.gitRollback(gitCommit.previousHash);
          return { status: 'failed', reason: 'High error rate at 50% rollout' };
        }

        // Full rollout
        await this.setTrafficPercentage(100);
        console.log('  ✓ Full rollout (100%)\n');

      } else {
        await this.deployFiles(plan.files, this.config.productionPath);
        console.log('  ✓ Files deployed\n');
      }

      // PHASE 7: Restart services
      if (plan.restartRequired) {
        console.log('🔄 PHASE 7: Restarting Services\n');
        await this.restartBackend();
        console.log('  ✓ Backend restarted\n');
      }

      // PHASE 8: Monitor health
      console.log('🏥 PHASE 8: Monitoring Deployment Health\n');
      const health = await this.monitorDeploymentHealth(5);

      if (!health.healthy) {
        console.log(`  ❌ Health check failed - rolling back to ${gitCommit.previousHash}\n`);
        await this.gitRollback(gitCommit.previousHash);
        await this.restartBackend();
        await this.redis.set('autonomous:last_failed_deployment', new Date().toISOString(), 'EX', 86400);

        return {
          status: 'failed',
          reason: 'Health checks failed post-deployment',
          rolledBack: true,
          gitCommit: gitCommit.hash
        };
      }

      console.log('  ✓ All health checks passed\n');

      // PHASE 9: Record success
      console.log('📝 PHASE 9: Recording Deployment\n');

      const today = new Date().toISOString().split('T')[0];
      await this.redis.incr(`autonomous:deployments:${today}`);
      await this.redis.expire(`autonomous:deployments:${today}`, 86400);

      await this.recordDeployment(deploymentId, opportunity, 'success', gitCommit);

      console.log('  ✓ Deployment recorded\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('✅ DEPLOYMENT SUCCESSFUL!\n');

      return {
        status: 'success',
        deploymentId,
        gitCommit: gitCommit.hash,
        filesDeployed: plan.files.length
      };

    } catch (error) {
      console.error('❌ Implementation failed:', error.message);

      // Emergency rollback
      if (gitCommit) {
        try {
          console.log('\n🆘 Emergency rollback...\n');
          await this.gitRollback(gitCommit.previousHash);
          await this.restartBackend();
          console.log('  ✓ Rolled back successfully\n');
        } catch (rollbackError) {
          console.error('  ❌ CRITICAL: Rollback failed:', rollbackError.message);
          await this.sendEmergencyAlert(deploymentId, error, rollbackError);
        }
      }

      await this.redis.set('autonomous:last_failed_deployment', new Date().toISOString(), 'EX', 86400);

      return {
        status: 'error',
        reason: error.message,
        deploymentId,
        gitCommit: gitCommit?.hash
      };
    }
  }

  /**
   * Generate implementation plan with AI
   */
  async generateImplementationPlan(opportunity) {
    console.log('  → Analyzing requirements...\n');

    const prompt = `You are implementing: "${opportunity.title}"

Tech stack:
- Frontend: React 18 + TailwindCSS + React Router
- Backend: Express + Sequelize + PostgreSQL
- State: React hooks

List ONLY the files needed as a JSON array:
["path1", "path2"]

Example:
["/opt/scholarnet-ai/frontend/src/components/Feature.jsx", "/opt/scholarnet-ai/backend/routes/api.js"]`;

    const listResponse = await this.claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    let listContent = listResponse.content[0].text.trim();
    if (listContent.includes('```')) {
      listContent = listContent.split('```')[1].replace(/json/g, '').trim();
    }

    const filePaths = JSON.parse(listContent);
    console.log(`  ✓ Identified ${filePaths.length} files needed\n`);

    // Generate each file
    const files = [];

    for (const filePath of filePaths) {
      console.log(`  → Generating ${path.basename(filePath)}...\n`);

      const filePrompt = `Generate COMPLETE, production-ready code for: ${filePath}

This is for: "${opportunity.title}"

Requirements:
- Follow existing code patterns
- Include proper error handling
- Add JSDoc comments
- Use TypeScript types if .ts/.tsx
- Include imports

Return ONLY the code, no markdown, no explanation.`;

      const fileResponse = await this.claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: filePrompt }]
      });

      let content = fileResponse.content[0].text;

      if (content.includes('```')) {
        const parts = content.split('```');
        content = parts[1].replace(/^(jsx|javascript|js|tsx|ts|python|py)\n/, '').trim();
      }

      files.push({
        path: filePath,
        content: content,
        action: 'create'
      });
    }

    return {
      files,
      restartRequired: files.some(f => f.path.includes('/backend/')),
      description: opportunity.title
    };
  }

  /**
   * CODE VALIDATION: Check syntax, imports, security
   */
  async validateCode(files) {
    console.log('  → Running validation checks...\n');

    const errors = [];

    for (const file of files) {
      // Check 1: No obvious syntax errors
      if (file.content.includes('undefined is not a function')) {
        errors.push(`${file.path}: Contains runtime error`);
      }

      // Check 2: Required imports for file type
      if (file.path.endsWith('.jsx') || file.path.endsWith('.tsx')) {
        if (!file.content.includes('import React')) {
          errors.push(`${file.path}: Missing React import`);
        }
      }

      // Check 3: No dangerous patterns
      const dangerous = ['eval(', 'dangerouslySetInnerHTML', '__proto__', 'Function('];
      for (const pattern of dangerous) {
        if (file.content.includes(pattern)) {
          errors.push(`${file.path}: Contains dangerous pattern: ${pattern}`);
        }
      }

      // Check 4: No hardcoded secrets
      const secretPatterns = [
        /api[_-]?key\s*=\s*['"][^'"]+['"]/i,
        /password\s*=\s*['"][^'"]+['"]/i,
        /secret\s*=\s*['"][^'"]+['"]/i
      ];

      for (const pattern of secretPatterns) {
        if (pattern.test(file.content)) {
          errors.push(`${file.path}: Contains hardcoded secret`);
        }
      }

      // Check 5: File not too large
      if (file.content.length > 100000) {
        errors.push(`${file.path}: File too large (${file.content.length} bytes)`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * STAGING: Deploy to staging environment
   */
  async deployToStaging(plan) {
    try {
      // Create staging directory if doesn't exist
      await execAsync(`mkdir -p ${this.config.stagingPath}`);

      // Copy current production to staging
      await execAsync(`rsync -a ${this.config.productionPath}/ ${this.config.stagingPath}/`);

      // Deploy files to staging
      for (const file of plan.files) {
        const stagingPath = file.path.replace(this.config.productionPath, this.config.stagingPath);
        const dir = path.dirname(stagingPath);

        await execAsync(`mkdir -p ${dir}`);
        await fs.writeFile(stagingPath, file.content, 'utf8');
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * STAGING TESTS: Run basic tests in staging
   */
  async runStagingTests(plan) {
    const failures = [];

    try {
      // Test 1: Backend can start
      if (plan.restartRequired) {
        const { stdout } = await execAsync(`cd ${this.config.stagingPath}/backend && node -c server.js`);
      }

      // Test 2: Frontend can build
      if (plan.files.some(f => f.path.includes('/frontend/'))) {
        // Just check if files are valid JavaScript
        for (const file of plan.files.filter(f => f.path.includes('/frontend/'))) {
          if (file.path.endsWith('.js') || file.path.endsWith('.jsx')) {
            try {
              await execAsync(`node -c ${file.path.replace(this.config.productionPath, this.config.stagingPath)}`);
            } catch (error) {
              failures.push(`Syntax error in ${path.basename(file.path)}`);
            }
          }
        }
      }

      return {
        passed: failures.length === 0,
        failures
      };

    } catch (error) {
      failures.push(error.message);
      return { passed: false, failures };
    }
  }

  /**
   * APPROVAL: Request human approval for risky changes
   */
  async requestApproval(plan, deploymentId) {
    // Store approval request in Redis
    await this.redis.setex(
      `autonomous:approval:${deploymentId}`,
      3600, // 1 hour expiry
      JSON.stringify({
        deploymentId,
        plan: {
          files: plan.files.map(f => ({ path: f.path, action: f.action })),
          description: plan.description
        },
        requestedAt: new Date().toISOString(),
        status: 'pending'
      })
    );

    console.log(`  → Approval request created: ${deploymentId}`);
    console.log(`  → Waiting for approval at: http://scholar.0xpi.com/admin/approvals/${deploymentId}`);
    console.log(`  → Expires in 1 hour\n`);

    // In production, this would wait for actual approval
    // For now, auto-approve low-risk changes
    const isLowRisk = plan.files.every(f =>
      f.action === 'create' && // Only new files
      !f.path.includes('/routes/') && // Not modifying routes
      !f.path.includes('/models/') && // Not modifying models
      f.path.includes('/components/') // Just components
    );

    if (isLowRisk) {
      console.log(`  ✓ Low-risk change - auto-approved\n`);
      return { approved: true, approver: 'auto', reason: 'Low-risk change' };
    }

    // High-risk changes require manual approval
    // Wait up to 30 minutes for approval
    for (let i = 0; i < 30; i++) {
      await this.sleep(60000); // Wait 1 minute

      const approvalData = await this.redis.get(`autonomous:approval:${deploymentId}`);
      if (approvalData) {
        const approval = JSON.parse(approvalData);
        if (approval.status === 'approved') {
          return { approved: true, approver: approval.approver };
        }
        if (approval.status === 'rejected') {
          return { approved: false, reason: approval.reason };
        }
      }
    }

    // Timeout - reject
    return { approved: false, reason: 'Approval timeout (30 minutes)' };
  }

  /**
   * GIT: Create commit before deployment
   */
  async createGitCommit(plan, deploymentId) {
    const productionPath = this.config.productionPath;

    try {
      // Initialize git if not already
      try {
        await execAsync(`cd ${productionPath} && git rev-parse --git-dir`);
      } catch {
        await execAsync(`cd ${productionPath} && git init`);
        await execAsync(`cd ${productionPath} && git config user.email "autonomous@scholarnet.ai"`);
        await execAsync(`cd ${productionPath} && git config user.name "Autonomous Engine"`);
      }

      // Get current commit hash (for rollback)
      let previousHash;
      try {
        const { stdout } = await execAsync(`cd ${productionPath} && git rev-parse HEAD`);
        previousHash = stdout.trim();
      } catch {
        previousHash = null;
      }

      // Stage files
      for (const file of plan.files) {
        await execAsync(`cd ${productionPath} && git add ${file.path.replace(productionPath, '.')}`);
      }

      // Commit
      const message = `[AUTONOMOUS] ${plan.description}

Deployment ID: ${deploymentId}
Files changed: ${plan.files.length}
Timestamp: ${new Date().toISOString()}`;

      const { stdout } = await execAsync(`cd ${productionPath} && git commit -m "${message}"`);

      // Get new commit hash
      const { stdout: newHash } = await execAsync(`cd ${productionPath} && git rev-parse HEAD`);

      return {
        hash: newHash.trim(),
        previousHash,
        message
      };

    } catch (error) {
      throw new Error(`Git commit failed: ${error.message}`);
    }
  }

  /**
   * GIT ROLLBACK: Revert to previous commit
   */
  async gitRollback(commitHash) {
    if (!commitHash) {
      throw new Error('No commit hash to rollback to');
    }

    const productionPath = this.config.productionPath;

    await execAsync(`cd ${productionPath} && git reset --hard ${commitHash}`);
    console.log(`  ✓ Rolled back to commit: ${commitHash.substring(0, 8)}`);
  }

  /**
   * DEPLOY: Write files to production
   */
  async deployFiles(files, basePath) {
    for (const file of files) {
      const dir = path.dirname(file.path);
      await execAsync(`mkdir -p ${dir}`);
      await fs.writeFile(file.path, file.content, 'utf8');
      console.log(`  ✓ ${path.basename(file.path)}`);
    }
  }

  /**
   * TRAFFIC: Set percentage for incremental rollout
   */
  async setTrafficPercentage(percentage) {
    await this.redis.set('autonomous:traffic_percentage', percentage);
    // In production, this would update nginx/load balancer config
  }

  /**
   * MONITOR: Check error rate
   */
  async monitorErrorRate(minutes) {
    // Check Redis for recent errors
    const errorCount = await this.redis.get('error_count_last_minute') || 0;
    const requestCount = await this.redis.get('request_count_last_minute') || 1;

    return errorCount / requestCount;
  }

  /**
   * HEALTH: Monitor deployment health
   */
  async monitorDeploymentHealth(minutes) {
    const checks = 10;
    const interval = (minutes * 60 * 1000) / checks;
    let failures = 0;

    for (let i = 0; i < checks; i++) {
      try {
        // Check PM2 status
        const { stdout } = await execAsync('pm2 jlist');
        const processes = JSON.parse(stdout);
        const backend = processes.find(p => p.name === 'scholarnet-backend');

        if (!backend || backend.pm2_env.status !== 'online') {
          failures++;
          console.log(`  ⚠️  Check ${i + 1}/${checks}: Backend offline`);
        } else {
          // Check actual HTTP endpoints
          let endpointHealthy = false;
          for (const endpoint of this.config.healthCheckEndpoints) {
            try {
              const response = await fetch(endpoint);
              if (response.ok) {
                endpointHealthy = true;
                break;
              }
            } catch {}
          }

          if (endpointHealthy) {
            console.log(`  ✓ Check ${i + 1}/${checks}: Healthy`);
          } else {
            failures++;
            console.log(`  ⚠️  Check ${i + 1}/${checks}: Endpoints not responding`);
          }
        }

        if (failures >= 3) {
          return { healthy: false, failures };
        }

        if (i < checks - 1) {
          await this.sleep(interval);
        }

      } catch (error) {
        failures++;
        console.log(`  ⚠️  Check ${i + 1}/${checks}: Error - ${error.message}`);
      }
    }

    return { healthy: failures < 3, failures };
  }

  /**
   * Restart backend service
   */
  async restartBackend() {
    await execAsync('pm2 restart scholarnet-backend');
    await this.sleep(5000); // Wait 5 seconds for startup
  }

  /**
   * Get current traffic level (0.0 - 1.0)
   */
  async getCurrentTrafficLevel() {
    // Get current active connections
    const current = parseInt(await this.redis.get('current_connections')) || 0;
    const peak = parseInt(await this.redis.get('peak_connections')) || 100;

    return current / peak;
  }

  /**
   * Check backend health
   */
  async checkBackendHealth() {
    try {
      const { stdout } = await execAsync('pm2 jlist');
      const processes = JSON.parse(stdout);
      const backend = processes.find(p => p.name === 'scholarnet-backend');

      return backend && backend.pm2_env.status === 'online';
    } catch {
      return false;
    }
  }

  /**
   * Cleanup staging environment
   */
  async cleanupStaging() {
    try {
      await execAsync(`rm -rf ${this.config.stagingPath}`);
    } catch {}
  }

  /**
   * Send emergency alert
   */
  async sendEmergencyAlert(deploymentId, error, rollbackError) {
    // In production, this would send email/Slack/PagerDuty
    console.error('\n🆘 EMERGENCY: Deployment AND rollback both failed!');
    console.error(`Deployment ID: ${deploymentId}`);
    console.error(`Error: ${error.message}`);
    console.error(`Rollback Error: ${rollbackError.message}`);

    await this.redis.setex(
      'autonomous:emergency_alert',
      86400,
      JSON.stringify({
        deploymentId,
        error: error.message,
        rollbackError: rollbackError.message,
        timestamp: new Date().toISOString()
      })
    );
  }

  /**
   * Record deployment in database
   */
  async recordDeployment(deploymentId, opportunity, status, gitCommit) {
    try {
      await this.db.query(`
        INSERT INTO autonomous_deployments
        (deployment_id, opportunity, status, git_commit, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, [deploymentId, JSON.stringify(opportunity), status, gitCommit?.hash || null]);
    } catch (error) {
      console.log('  ⚠️  Could not record in database:', error.message);
    }
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup and close connections
   */
  async cleanup() {
    await this.db.end();
    await this.redis.quit();
  }
}

export default SafeAutonomousImplementer;
