import TaskScheduler from './lib/task-scheduler.js';
import HealthMonitor from './lib/health-monitor.js';
import RedisCoordinator from './lib/redis-coordinator.js';
import SafeExecutor from './lib/safe-executor.js';
import { SCHEDULES, SCHEDULE_META } from './config/schedules.js';
import CodeQualityEngine from './modules/code-quality-engine.js';
import ContentOrchestrator from './orchestrators/content-orchestrator.js';
import SEOOrchestrator from './orchestrators/seo-orchestrator.js';
import SocialOrchestrator from './orchestrators/social-orchestrator.js';

class MasterOrchestrator {
  constructor() {
    this.redis = null;
    this.health = null;
    this.scheduler = null;
    this.safeExecutor = null;
    this.modules = new Map();
    this.isRunning = false;
    this.startTime = null;
    this.isShuttingDown = false;
    this.activeOperations = new Set();
    this.healthMonitorInterval = null;
  }

  async initialize() {
    console.log('');
    console.log('════════════════════════════════════════════════════════');
    console.log('  Scholarize Autonomous Engine');
    console.log('  Master Orchestrator v1.0');
    console.log('════════════════════════════════════════════════════════');
    console.log('');

    try {
      // 1. Initialize Redis
      console.log('1️⃣  Initializing Redis Coordinator...');
      this.redis = new RedisCoordinator();
      await this.redis.connect();

      // 2. Initialize Health Monitor
      console.log('\n2️⃣  Initializing Health Monitor...');
      this.health = new HealthMonitor(this.redis);

      // 3. Initialize Task Scheduler
      console.log('\n3️⃣  Initializing Task Scheduler...');
      this.scheduler = new TaskScheduler(this.health, this.redis);

      // 4. Initialize Safe Executor
      console.log('\n4️⃣  Initializing Safe Executor...');
      this.safeExecutor = new SafeExecutor({
        dryRun: process.env.DRY_RUN_MODE === 'true'
      });

      // 5. Register health checks
      this.registerSystemHealthChecks();

      // 6. Load modules
      console.log('\n5️⃣  Loading modules...');
      await this.loadModules();

      // 7. Register scheduled tasks
      console.log('\n6️⃣  Registering scheduled tasks...');
      this.registerScheduledTasks();

      // 8. Setup Redis subscriptions
      console.log('\n7️⃣  Setting up Redis subscriptions...');
      this.setupRedisSubscriptions();

      this.isRunning = true;
      this.startTime = new Date();

      console.log('\n✅ Master Orchestrator initialized!');
      console.log(`Started at: ${this.startTime.toISOString()}\n`);

      return true;
    } catch (error) {
      console.error('\n❌ Initialization failed:', error);
      throw error;
    }
  }

  registerSystemHealthChecks() {
    // Orchestrator health
    this.health.registerHealthCheck('orchestrator', async () => {
      return {
        uptime: this.getUptime(),
        isRunning: this.isRunning,
        modulesLoaded: this.modules.size,
        tasksRegistered: this.scheduler.getTasks().length
      };
    });

    // Redis health
    this.health.registerHealthCheck('redis', async () => {
      if (!this.redis || !this.redis.connected) {
        throw new Error('Redis not connected');
      }
      await this.redis.publisher.ping();
      return { connected: true };
    });
  }

  async loadModules() {
    // Load AI Evolution Engine
    try {
      const codeQuality = new CodeQualityEngine(this);
      this.modules.set('code-quality', codeQuality);
      console.log('  ✓ Loaded: code-quality (AI Evolution Engine)');

      // Register health check
      this.health.registerHealthCheck('code-quality', async () => {
        return {
          enabled: codeQuality.config.enabled,
          evolutionLog: codeQuality.getEvolutionLog().length
        };
      });
    } catch (error) {
      console.error('  ✗ Failed to load code-quality:', error.message);
    }

    // Load Content Orchestrator
    try {
      const contentOrch = new ContentOrchestrator(this);
      this.modules.set('content', contentOrch);
      console.log('  ✓ Loaded: content (Content Generation Engine)');

      // Register health check
      this.health.registerHealthCheck('content', async () => {
        const stats = await contentOrch.getStats();
        return {
          enabled: true,
          totalArticles: stats.total_articles || 0,
          todayCount: stats.today_count || 0
        };
      });
    } catch (error) {
      console.error('  ✗ Failed to load content:', error.message);
    }

    // Load SEO Orchestrator
    try {
      const seoOrch = new SEOOrchestrator(this);
      this.modules.set('seo', seoOrch);
      console.log('  ✓ Loaded: seo (SEO Optimization Engine)');

      // Register health check
      this.health.registerHealthCheck('seo', async () => {
        const stats = await seoOrch.getStats();
        return {
          enabled: true,
          optimizedCount: stats.optimized_count || 0,
          avgScore: stats.avg_seo_score || 0
        };
      });
    } catch (error) {
      console.error('  ✗ Failed to load seo:', error.message);
    }

    // Load Social Media Orchestrator
    try {
      const socialOrch = new SocialOrchestrator(this);
      this.modules.set('social', socialOrch);
      console.log('  ✓ Loaded: social (Social Media Engine)');

      // Register health check
      this.health.registerHealthCheck('social', async () => {
        const stats = await socialOrch.getStats();
        return {
          enabled: true,
          promotedCount: stats.promoted_count || 0,
          totalPosts: stats.total_posts || 0
        };
      });
    } catch (error) {
      console.error('  ✗ Failed to load social:', error.message);
    }

    console.log(`  Total modules loaded: ${this.modules.size}`);
  }

  registerScheduledTasks() {
    let count = 0;

    // Register all scheduled tasks from SCHEDULE_META
    Object.entries(SCHEDULE_META).forEach(([taskKey, meta]) => {
      const schedule = SCHEDULES[taskKey];
      if (!schedule) {
        console.warn(`  ⚠️  No schedule found for ${taskKey}`);
        return;
      }

      const moduleName = meta.module;
      const action = meta.action;
      const params = meta.params || {};

      this.scheduler.registerTask(
        taskKey,
        schedule,
        async () => await this.executeModuleTask(moduleName, action, params),
        {
          priority: meta.priority,
          timeout: meta.timeout
        }
      );
      count++;
    });

    console.log(`  ✓ Registered ${count} scheduled task(s)`);
  }

  async executeModuleTask(moduleName, taskName, params = {}) {
    const module = this.modules.get(moduleName);
    if (!module) {
      console.log(`⚠️  Module ${moduleName} not loaded. Skipping: ${taskName}`);
      return { skipped: true, reason: 'Module not loaded' };
    }

    // Check if shutting down
    if (this.isShuttingDown) {
      console.log(`⚠️  Shutdown in progress. Skipping: ${taskName}`);
      return { skipped: true, reason: 'Shutting down' };
    }

    const operationId = `${moduleName}:${taskName}:${Date.now()}`;
    this.activeOperations.add(operationId);

    try {
      console.log(`\n🔄 Executing ${moduleName}:${taskName}...`);
      const result = await module.executeTask(taskName, params);
      console.log(`✅ Completed ${moduleName}:${taskName}`);
      return result;
    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  setupRedisSubscriptions() {
    // Subscribe to manual task triggers
    this.redis.subscribe('task:trigger', async (data) => {
      const { task } = data;
      console.log(`\n📨 Task trigger received: ${task}`);
      try {
        await this.scheduler.executeTask(task);
      } catch (error) {
        console.error(`Failed to execute: ${task}`, error);
      }
    });

    // Subscribe to health alerts
    this.redis.subscribe('health:alerts', (alert) => {
      console.error('\n🚨 HEALTH ALERT:', alert);
    });

    console.log('  ✓ Subscribed to Redis channels');
  }

  async start() {
    console.log('\n▶️  Starting all scheduled tasks...\n');
    this.scheduler.startAll();

    // Start health monitoring
    this.startHealthMonitoring();

    console.log('════════════════════════════════════════════════════════');
    console.log('  🚀 Autonomous Engine is RUNNING!');
    console.log('════════════════════════════════════════════════════════\n');
  }

  startHealthMonitoring() {
    // Health check every 5 minutes
    this.healthMonitorInterval = setInterval(async () => {
      try {
        const report = await this.health.getHealthReport();

        // Log summary
        console.log(`[Health] CPU: ${report.system.cpu}% | Memory: ${report.system.memory}%`);

        // Check for issues
        if (report.system.cpu > 80 || report.system.memory > 85) {
          console.warn('⚠️  System resources high:', report.system);
        }
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, 5 * 60 * 1000);
  }

  async stop() {
    console.log('\n⏹️  Stopping Autonomous Engine...\n');
    this.isShuttingDown = true;

    // Stop health monitoring interval
    if (this.healthMonitorInterval) {
      clearInterval(this.healthMonitorInterval);
      this.healthMonitorInterval = null;
      console.log('✅ Health monitoring stopped');
    }

    // Stop accepting new tasks
    this.scheduler.stopAll();

    // Wait for active operations to complete (max 3 seconds for graceful shutdown)
    if (this.activeOperations.size > 0) {
      console.log(`⏳ Waiting for ${this.activeOperations.size} active operation(s) to complete...`);
      const timeout = Date.now() + 3000; // 3 second timeout

      while (this.activeOperations.size > 0 && Date.now() < timeout) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (this.activeOperations.size > 0) {
        console.warn(`⚠️  ${this.activeOperations.size} operation(s) still running after timeout`);
      } else {
        console.log('✅ All operations completed');
      }
    }

    // Close module database connections
    for (const [name, module] of this.modules) {
      try {
        if (module.db && typeof module.db.close === 'function') {
          await module.db.close();
          console.log(`✅ Closed database for ${name}`);
        }
        if (typeof module.cleanup === 'function') {
          await module.cleanup();
          console.log(`✅ Cleaned up ${name}`);
        }
      } catch (error) {
        console.error(`⚠️  Error closing ${name}:`, error.message);
      }
    }

    // Close connections
    if (this.redis) {
      await this.redis.close();
    }

    this.isRunning = false;
    console.log('✅ Autonomous Engine stopped\n');
  }

  getUptime() {
    if (!this.startTime) return 0;
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }

  async getStatus() {
    return {
      isRunning: this.isRunning,
      uptime: this.getUptime(),
      startTime: this.startTime?.toISOString(),
      modules: Array.from(this.modules.keys()),
      tasks: this.scheduler.getTasks(),
      health: await this.health.getHealthReport()
    };
  }

  // Manual task trigger (for testing)
  async triggerTask(taskName) {
    console.log(`\n🔧 Manually triggering: ${taskName}`);
    return await this.scheduler.executeTask(taskName);
  }
}

// Main execution
const orchestrator = new MasterOrchestrator();

async function main() {
  try {
    await orchestrator.initialize();
    await orchestrator.start();

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\nReceived SIGINT, shutting down gracefully...');
      try {
        await orchestrator.stop();
        process.exit(0);
      } catch (error) {
        console.error('Error during SIGINT shutdown:', error);
        process.exit(1);
      }
    });

    process.on('SIGTERM', async () => {
      console.log('\n\nReceived SIGTERM, shutting down gracefully...');
      try {
        await orchestrator.stop();
        process.exit(0);
      } catch (error) {
        console.error('Error during SIGTERM shutdown:', error);
        process.exit(1);
      }
    });

    console.log('✅ Signal handlers registered (SIGINT, SIGTERM)');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default MasterOrchestrator;
