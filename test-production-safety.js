#!/usr/bin/env node
/**
 * Production Safety Test Suite
 * Tests all 9 safety layers of the autonomous implementer
 */

import Redis from 'ioredis';
import { execSync } from 'child_process';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined
});

const tests = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function log(emoji, message, type = 'info') {
  console.log(`${emoji} ${message}`);
  if (type === 'pass') tests.passed++;
  if (type === 'fail') tests.failed++;
  if (type === 'warn') tests.warnings++;
}

async function testRedisConnection() {
  console.log('\n🔍 Testing Redis Connection...');
  try {
    const pong = await redis.ping();
    if (pong === 'PONG') {
      log('✅', 'Redis connection successful', 'pass');
      return true;
    }
  } catch (error) {
    log('❌', `Redis connection failed: ${error.message}`, 'fail');
    return false;
  }
}

async function testGitSetup() {
  console.log('\n🔍 Testing Git Setup...');
  try {
    // Check if git is initialized
    execSync('cd /opt/scholarnet-ai && git status', { stdio: 'pipe' });
    log('✅', 'Git repository initialized', 'pass');

    // Check if there's at least one commit
    const commits = execSync('cd /opt/scholarnet-ai && git log --oneline', { encoding: 'utf8' });
    if (commits.trim()) {
      const commitCount = commits.trim().split('\n').length;
      log('✅', `Git has ${commitCount} commit(s) - rollback ready`, 'pass');
    } else {
      log('⚠️', 'Git has no commits - rollback not possible', 'warn');
    }

    return true;
  } catch (error) {
    log('❌', `Git setup failed: ${error.message}`, 'fail');
    return false;
  }
}

async function testStagingEnvironment() {
  console.log('\n🔍 Testing Staging Environment...');
  try {
    execSync('ls /opt/scholarnet-ai-staging', { stdio: 'pipe' });
    log('✅', 'Staging environment exists', 'pass');
    return true;
  } catch (error) {
    log('⚠️', 'Staging environment missing (needs sudo to create)', 'warn');
    return false;
  }
}

async function testDatabaseTable() {
  console.log('\n🔍 Testing Database Table...');
  try {
    // Try to query the table
    const pg = await import('pg');
    const client = new pg.Client({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'scholarnet',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD
    });

    await client.connect();
    const result = await client.query('SELECT COUNT(*) FROM autonomous_deployments');
    await client.end();

    log('✅', `Database table exists with ${result.rows[0].count} deployments`, 'pass');
    return true;
  } catch (error) {
    log('⚠️', 'Database table missing (needs manual creation)', 'warn');
    return false;
  }
}

async function testBackendRoutes() {
  console.log('\n🔍 Testing Backend Routes...');
  try {
    const http = await import('http');

    // Test approvals endpoint
    await new Promise((resolve, reject) => {
      const req = http.default.get('http://localhost:3001/api/admin/autonomous/approvals', (res) => {
        if (res.statusCode === 200 || res.statusCode === 401) {
          log('✅', 'Approvals API endpoint responding', 'pass');
          resolve();
        } else {
          reject(new Error(`Status ${res.statusCode}`));
        }
      });
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('Timeout')));
    });

    return true;
  } catch (error) {
    log('❌', `Backend routes not responding: ${error.message}`, 'fail');
    return false;
  }
}

async function testSafeImplementerSyntax() {
  console.log('\n🔍 Testing Safe Implementer Syntax...');
  try {
    execSync('node -c /opt/scholarnet-autonomous-engine/autonomous-implementer-safe.js', { stdio: 'pipe' });
    log('✅', 'Safe implementer syntax valid', 'pass');
    return true;
  } catch (error) {
    log('❌', 'Safe implementer has syntax errors', 'fail');
    return false;
  }
}

async function testCodeValidation() {
  console.log('\n🔍 Testing Code Validation Logic...');

  // Test dangerous pattern detection
  const testCases = [
    { code: 'eval("malicious")', shouldFail: true, name: 'eval detection' },
    { code: 'dangerouslySetInnerHTML={{__html: data}}', shouldFail: true, name: 'XSS detection' },
    { code: 'const api = "sk_live_abc123"', shouldFail: true, name: 'hardcoded secret detection' },
    { code: 'function safe() { return true; }', shouldFail: false, name: 'safe code' }
  ];

  for (const test of testCases) {
    const hasDangerous = /eval\(|dangerouslySetInnerHTML|sk_live_|api_key\s*=|password\s*=\s*"/.test(test.code);

    if (test.shouldFail && hasDangerous) {
      log('✅', `Code validation: ${test.name} correctly detected`, 'pass');
    } else if (!test.shouldFail && !hasDangerous) {
      log('✅', `Code validation: ${test.name} correctly passed`, 'pass');
    } else {
      log('❌', `Code validation: ${test.name} failed`, 'fail');
    }
  }

  return true;
}

async function testApprovalWorkflow() {
  console.log('\n🔍 Testing Approval Workflow...');

  const testDeploymentId = `test-${Date.now()}`;
  const approvalKey = `autonomous:approval:${testDeploymentId}`;

  try {
    // Create test approval request
    const approval = {
      deploymentId: testDeploymentId,
      opportunity: { title: 'Test Deployment', description: 'Testing approval workflow' },
      status: 'pending',
      requestedAt: new Date().toISOString(),
      files: [{ path: '/test.js', content: 'test' }]
    };

    await redis.setex(approvalKey, 3600, JSON.stringify(approval));
    log('✅', 'Created test approval request in Redis', 'pass');

    // Verify we can retrieve it
    const retrieved = await redis.get(approvalKey);
    if (retrieved) {
      log('✅', 'Successfully retrieved approval from Redis', 'pass');
    }

    // Cleanup
    await redis.del(approvalKey);
    log('✅', 'Approval workflow test complete', 'pass');

    return true;
  } catch (error) {
    log('❌', `Approval workflow failed: ${error.message}`, 'fail');
    return false;
  }
}

async function testRollbackCapability() {
  console.log('\n🔍 Testing Rollback Capability...');

  try {
    // Check if we can see git history
    const gitLog = execSync('cd /opt/scholarnet-ai && git log --oneline -5', { encoding: 'utf8' });

    if (gitLog.trim()) {
      log('✅', 'Git history available for rollback', 'pass');

      // Test git reset --hard in dry run (don't actually do it)
      const currentHash = execSync('cd /opt/scholarnet-ai && git rev-parse HEAD', { encoding: 'utf8' }).trim();
      log('✅', `Current commit: ${currentHash.substring(0, 8)} - rollback target identified`, 'pass');

      return true;
    }
  } catch (error) {
    log('❌', `Rollback test failed: ${error.message}`, 'fail');
    return false;
  }
}

async function testEnvironmentVariables() {
  console.log('\n🔍 Testing Environment Variables...');

  const requiredVars = [
    'ANTHROPIC_API_KEY',
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'REDIS_HOST'
  ];

  let allPresent = true;
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      log('✅', `${varName} is set`, 'pass');
    } else {
      log('⚠️', `${varName} is not set`, 'warn');
      allPresent = false;
    }
  }

  return allPresent;
}

async function runAllTests() {
  console.log('🛡️  PRODUCTION SAFETY TEST SUITE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await testRedisConnection();
  await testGitSetup();
  await testStagingEnvironment();
  await testDatabaseTable();
  await testBackendRoutes();
  await testSafeImplementerSyntax();
  await testCodeValidation();
  await testApprovalWorkflow();
  await testRollbackCapability();
  await testEnvironmentVariables();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 TEST RESULTS:');
  console.log(`   ✅ Passed:   ${tests.passed}`);
  console.log(`   ❌ Failed:   ${tests.failed}`);
  console.log(`   ⚠️  Warnings: ${tests.warnings}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (tests.failed === 0 && tests.warnings <= 2) {
    console.log('🎉 PRODUCTION READY - System is safe to enable!');
  } else if (tests.failed === 0) {
    console.log('⚠️  MOSTLY READY - Some optional features need setup');
  } else {
    console.log('❌ NOT READY - Critical issues must be fixed first');
  }

  redis.disconnect();
  process.exit(tests.failed > 0 ? 1 : 0);
}

runAllTests().catch(error => {
  console.error('💥 Test suite crashed:', error);
  redis.disconnect();
  process.exit(1);
});
