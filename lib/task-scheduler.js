import cron from 'node-cron';

class TaskScheduler {
  constructor(healthMonitor, redisCoordinator) {
    this.health = healthMonitor;
    this.redis = redisCoordinator;
    this.tasks = new Map();
    this.executionLog = [];
  }

  registerTask(name, schedule, handler, options = {}) {
    if (this.tasks.has(name)) {
      console.warn(`Task already registered: ${name}`);
      return;
    }

    const cronJob = cron.schedule(schedule, async () => {
      await this.executeTask(name);
    }, {
      scheduled: false,
      timezone: options.timezone || 'America/New_York'
    });

    this.tasks.set(name, {
      name,
      schedule,
      handler,
      enabled: options.enabled !== false,
      cronJob,
      lastRun: null
    });

    console.log(`✅ Registered: ${name} (${schedule})`);
  }

  async executeTask(name) {
    const task = this.tasks.get(name);
    if (!task || !task.enabled) return;

    const start = Date.now();
    console.log(`\n▶️  Executing: ${name}`);

    try {
      const result = await task.handler();
      const duration = Date.now() - start;
      
      task.lastRun = new Date().toISOString();
      
      this.logExecution({
        name,
        status: 'success',
        duration,
        timestamp: task.lastRun
      });

      if (this.health) {
        this.health.recordModuleExecution(name, true, duration);
      }

      console.log(`✅ Completed: ${name} (${duration}ms)`);
      return result;

    } catch (error) {
      const duration = Date.now() - start;
      
      this.logExecution({
        name,
        status: 'failed',
        duration,
        error: error.message
      });

      if (this.health) {
        this.health.recordModuleExecution(name, false, duration, error.message);
      }

      console.error(`❌ Failed: ${name}`, error.message);
      throw error;
    }
  }

  logExecution(execution) {
    this.executionLog.unshift(execution);
    if (this.executionLog.length > 100) {
      this.executionLog = this.executionLog.slice(0, 100);
    }
  }

  startTask(name) {
    const task = this.tasks.get(name);
    if (task && !task.cronJob.running) {
      task.enabled = true;
      task.cronJob.start();
      console.log(`▶️  Started: ${name}`);
    }
  }

  stopTask(name) {
    const task = this.tasks.get(name);
    if (task && task.cronJob.running) {
      task.cronJob.stop();
      task.enabled = false;
      console.log(`⏹️  Stopped: ${name}`);
    }
  }

  startAll() {
    console.log('\n▶️  Starting all tasks...');
    for (const [name, task] of this.tasks) {
      if (task.enabled) this.startTask(name);
    }
    console.log('✅ All tasks started\n');
  }

  stopAll() {
    console.log('\n⏹️  Stopping all tasks...');
    for (const [name] of this.tasks) {
      try { this.stopTask(name); } catch {}
    }
    console.log('✅ All tasks stopped\n');
  }

  getTasks() {
    return Array.from(this.tasks.values()).map(t => ({
      name: t.name,
      schedule: t.schedule,
      enabled: t.enabled,
      lastRun: t.lastRun
    }));
  }
}

export default TaskScheduler;
