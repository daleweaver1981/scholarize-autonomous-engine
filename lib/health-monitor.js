import os from 'os';

class HealthMonitor {
  constructor(redisCoordinator) {
    this.redis = redisCoordinator;
    this.healthChecks = new Map();
    this.moduleStats = new Map();
    this.alertThresholds = {
      cpu: 80,
      memory: 85,
      failureRate: 0.15
    };
  }

  registerHealthCheck(moduleName, checkFn) {
    this.healthChecks.set(moduleName, checkFn);
    console.log(`✅ Health check: ${moduleName}`);
  }

  async checkModuleHealth(moduleName) {
    const checkFn = this.healthChecks.get(moduleName);
    if (!checkFn) {
      return { status: 'unknown', error: 'No health check' };
    }

    try {
      const result = await checkFn();
      return {
        status: 'healthy',
        ...result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getSystemMetrics() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;

    return {
      uptime: os.uptime(),
      cpu: parseFloat(cpuUsage.toFixed(2)),
      memory: parseFloat(memoryUsage.toFixed(2)),
      timestamp: new Date().toISOString()
    };
  }

  recordModuleExecution(moduleName, success, duration, error = null) {
    if (!this.moduleStats.has(moduleName)) {
      this.moduleStats.set(moduleName, {
        total: 0,
        success: 0,
        failed: 0,
        totalDuration: 0,
        lastError: null
      });
    }

    const stats = this.moduleStats.get(moduleName);
    stats.total++;
    stats.totalDuration += duration;

    if (success) {
      stats.success++;
    } else {
      stats.failed++;
      stats.lastError = error;
    }

    const failureRate = stats.failed / stats.total;
    if (failureRate > this.alertThresholds.failureRate) {
      this.sendAlert({
        level: 'warning',
        module: moduleName,
        message: `High failure rate: ${(failureRate * 100).toFixed(1)}%`,
        failureRate
      });
    }
  }

  async sendAlert(alert) {
    console.error('🚨 ALERT:', alert);
    if (this.redis && this.redis.connected) {
      await this.redis.publish('health:alerts', alert);
    }
  }

  async getHealthReport() {
    const system = await this.getSystemMetrics();
    const modules = {};
    
    for (const [name] of this.healthChecks) {
      modules[name] = await this.checkModuleHealth(name);
    }

    const stats = {};
    for (const [name, data] of this.moduleStats) {
      stats[name] = {
        ...data,
        avgDuration: data.total > 0 ? data.totalDuration / data.total : 0,
        successRate: data.total > 0 ? (data.success / data.total * 100).toFixed(1) : 0
      };
    }

    return {
      timestamp: new Date().toISOString(),
      system,
      modules,
      stats
    };
  }
}

export default HealthMonitor;
