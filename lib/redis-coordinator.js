import Redis from 'ioredis';

export class RedisCoordinator {
  constructor(config = {}) {
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB) || 0,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      ...config
    };
    this.publisher = null;
    this.subscriber = null;
    this.subscribers = new Map();
    this.connected = false;
  }

  async connect() {
    try {
      this.publisher = new Redis(this.config);
      this.subscriber = new Redis(this.config);
      this.publisher.on('error', (err) => console.error('❌ Redis Publisher Error:', err.message));
      this.subscriber.on('error', (err) => console.error('❌ Redis Subscriber Error:', err.message));
      this.publisher.on('connect', () => console.log('✅ Redis Publisher connected'));
      this.subscriber.on('connect', () => console.log('✅ Redis Subscriber connected'));
      this.subscriber.on('message', (channel, message) => this.handleMessage(channel, message));
      this.connected = true;
      console.log('✅ Redis Coordinator initialized');
      return true;
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      throw error;
    }
  }

  async publish(channel, data) {
    if (!this.connected) throw new Error('Redis not connected');
    try {
      const message = JSON.stringify({ data, timestamp: Date.now(), source: 'autonomous-engine' });
      await this.publisher.publish(channel, message);
      console.log(`📤 Published to ${channel}:`, data);
    } catch (error) {
      console.error(`❌ Failed to publish to ${channel}:`, error);
      throw error;
    }
  }

  async subscribe(channel, handler) {
    if (!this.connected) throw new Error('Redis not connected');
    try {
      await this.subscriber.subscribe(channel);
      if (!this.subscribers.has(channel)) this.subscribers.set(channel, []);
      this.subscribers.get(channel).push(handler);
      console.log(`📥 Subscribed to ${channel}`);
    } catch (error) {
      console.error(`❌ Failed to subscribe to ${channel}:`, error);
      throw error;
    }
  }

  async unsubscribe(channel) {
    if (!this.connected) return;
    try {
      await this.subscriber.unsubscribe(channel);
      this.subscribers.delete(channel);
      console.log(`📤 Unsubscribed from ${channel}`);
    } catch (error) {
      console.error(`❌ Failed to unsubscribe from ${channel}:`, error);
    }
  }

  handleMessage(channel, message) {
    try {
      const parsed = JSON.parse(message);
      const handlers = this.subscribers.get(channel) || [];
      for (const handler of handlers) {
        try {
          handler(parsed.data, parsed);
        } catch (error) {
          console.error(`❌ Handler error for ${channel}:`, error);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to parse message from ${channel}:`, error);
    }
  }

  async setTaskState(taskId, state) {
    const key = `task:${taskId}`;
    await this.publisher.setex(key, 86400, JSON.stringify(state));
  }

  async getTaskState(taskId) {
    const key = `task:${taskId}`;
    const data = await this.publisher.get(key);
    return data ? JSON.parse(data) : null;
  }

  async incrementCounter(key, expireSeconds = 86400) {
    const count = await this.publisher.incr(key);
    if (count === 1) await this.publisher.expire(key, expireSeconds);
    return count;
  }

  async getCounter(key) {
    const value = await this.publisher.get(key);
    return value ? parseInt(value) : 0;
  }

  async acquireLock(lockName, ttl = 300) {
    const key = `lock:${lockName}`;
    const value = Date.now().toString();
    const acquired = await this.publisher.set(key, value, 'EX', ttl, 'NX');
    return acquired === 'OK';
  }

  async releaseLock(lockName) {
    const key = `lock:${lockName}`;
    await this.publisher.del(key);
  }

  async close() {
    if (this.publisher) await this.publisher.quit();
    if (this.subscriber) await this.subscriber.quit();
    this.connected = false;
    console.log('✅ Redis Coordinator closed');
  }
}

export default RedisCoordinator;
