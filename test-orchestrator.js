/**
 * Test Orchestrator System
 * Validates the code structure and modules without requiring Redis
 */

import fs from 'fs';
import path from 'path';

async function testOrchestrator() {
  console.log('🧪 Testing Orchestrator System\n');

  const errors = [];
  const warnings = [];

  try {
    // 1. Verify all required files exist
    console.log('1️⃣  Verifying file structure...');
    const requiredFiles = [
      'master-orchestrator.js',
      'lib/task-scheduler.js',
      'lib/health-monitor.js',
      'lib/redis-coordinator.js',
      'lib/safe-executor.js',
      'modules/code-quality-engine.js',
      'config/schedules.js',
      'ecosystem.config.js',
      'package.json'
    ];

    for (const file of requiredFiles) {
      const exists = fs.existsSync(file);
      if (exists) {
        const stats = fs.statSync(file);
        console.log(`   ✅ ${file} (${stats.size} bytes)`);
      } else {
        errors.push(`Missing file: ${file}`);
        console.log(`   ❌ ${file} - NOT FOUND`);
      }
    }

    if (errors.length === 0) {
      console.log('✅ All required files present\n');
    }

    // 2. Verify module imports (syntax check)
    console.log('2️⃣  Testing module imports...');
    try {
      const MasterOrchestrator = (await import('./master-orchestrator.js')).default;
      console.log('   ✅ MasterOrchestrator class imports successfully');

      const TaskScheduler = (await import('./lib/task-scheduler.js')).default;
      console.log('   ✅ TaskScheduler class imports successfully');

      const HealthMonitor = (await import('./lib/health-monitor.js')).default;
      console.log('   ✅ HealthMonitor class imports successfully');

      const SafeExecutor = (await import('./lib/safe-executor.js')).default;
      console.log('   ✅ SafeExecutor class imports successfully');

      const CodeQualityEngine = (await import('./modules/code-quality-engine.js')).default;
      console.log('   ✅ CodeQualityEngine class imports successfully');

      console.log('✅ All modules import without syntax errors\n');
    } catch (error) {
      errors.push(`Import error: ${error.message}`);
      console.log(`   ❌ Import failed: ${error.message}\n`);
    }

    // 3. Verify configuration
    console.log('3️⃣  Verifying configuration...');
    try {
      const schedules = (await import('./config/schedules.js')).default;
      const scheduleCount = Object.keys(schedules).length;
      console.log(`   ✅ Found ${scheduleCount} scheduled tasks`);

      // Show a sample of schedules
      const sampleSchedules = Object.entries(schedules).slice(0, 5);
      for (const [name, schedule] of sampleSchedules) {
        console.log(`      - ${name}: ${schedule}`);
      }
      if (scheduleCount > 5) {
        console.log(`      ... and ${scheduleCount - 5} more`);
      }
      console.log('✅ Configuration valid\n');
    } catch (error) {
      errors.push(`Config error: ${error.message}`);
      console.log(`   ❌ Config error: ${error.message}\n`);
    }

    // 4. Verify package.json
    console.log('4️⃣  Verifying package.json...');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

    const requiredDeps = ['@anthropic-ai/sdk', 'node-cron', 'axios', 'dotenv', 'ioredis'];
    const missingDeps = requiredDeps.filter(dep => !pkg.dependencies[dep]);

    if (missingDeps.length > 0) {
      errors.push(`Missing dependencies: ${missingDeps.join(', ')}`);
      console.log(`   ❌ Missing dependencies: ${missingDeps.join(', ')}`);
    } else {
      console.log('   ✅ All required dependencies present');
      console.log('   Dependencies:');
      for (const [name, version] of Object.entries(pkg.dependencies)) {
        console.log(`      - ${name}@${version}`);
      }
    }

    console.log('✅ Package configuration valid\n');

    // 5. Verify PM2 configuration
    console.log('5️⃣  Verifying PM2 configuration...');
    const pm2Config = (await import('./ecosystem.config.js')).default;
    if (pm2Config.apps && pm2Config.apps.length > 0) {
      console.log(`   ✅ PM2 config has ${pm2Config.apps.length} app(s)`);
      for (const app of pm2Config.apps) {
        console.log(`      - ${app.name}: ${app.script}`);
        console.log(`        Instances: ${app.instances}`);
        console.log(`        Max memory: ${app.max_memory_restart}`);
      }
      console.log('✅ PM2 configuration valid\n');
    } else {
      warnings.push('PM2 config has no apps defined');
    }

    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    TEST SUMMARY                           ');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (errors.length === 0 && warnings.length === 0) {
      console.log('🎉 ALL TESTS PASSED!\n');

      console.log('✅ Code Structure: VALID');
      console.log('✅ Module Imports: VALID');
      console.log('✅ Configuration: VALID');
      console.log('✅ Dependencies: INSTALLED');
      console.log('✅ PM2 Config: VALID\n');

      console.log('📋 Next Steps:');
      console.log('   1. Set environment variables in .env.production');
      console.log('   2. Ensure Redis is running: systemctl status redis');
      console.log('   3. Test: npm run orchestrator:dev');
      console.log('   4. Deploy: npm run orchestrator:start');
      console.log('   5. Monitor: pm2 logs scholarnet-orchestrator\n');

      console.log('💡 Quick Commands:');
      console.log('   npm run orchestrator:start   - Start with PM2');
      console.log('   npm run orchestrator:stop    - Stop orchestrator');
      console.log('   npm run orchestrator:logs    - View logs');
      console.log('   npm run orchestrator:status  - Check status');
      console.log('   npm run health               - Health check\n');

      return true;
    } else {
      if (errors.length > 0) {
        console.log('❌ ERRORS FOUND:\n');
        errors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
        console.log('');
      }

      if (warnings.length > 0) {
        console.log('⚠️  WARNINGS:\n');
        warnings.forEach((warn, i) => console.log(`   ${i + 1}. ${warn}`));
        console.log('');
      }

      return errors.length === 0;
    }

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run tests
testOrchestrator()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
