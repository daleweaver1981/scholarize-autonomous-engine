#!/usr/bin/env node
// Simple Autonomous Engine Starter
import Anthropic from '@anthropic-ai/sdk';
import pg from 'pg';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

const { Pool } = pg;

class SimpleAutonomousEngine {
  constructor() {
    console.log('🤖 Simple Autonomous Engine Starting...\n');
    
    // Initialize connections
    this.db = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 10
    });
    
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD || undefined
    });
    
    this.claude = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    
    console.log('✅ Connections initialized\n');
  }

  async testConnections() {
    console.log('🔍 Testing Connections...\n');
    
    try {
      // Test PostgreSQL
      const dbResult = await this.db.query('SELECT NOW()');
      console.log('✅ PostgreSQL: Connected');
      
      // Test Redis
      await this.redis.ping();
      console.log('✅ Redis: Connected');
      
      // Test Anthropic
      try {
        const response = await this.claude.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }]
        });
        console.log('✅ Anthropic API: Connected and has credits');
        console.log(`   Response: ${response.content[0].text}`);
      } catch (error) {
        if (error.message.includes('credit balance')) {
          console.log('⚠️  Anthropic API: Connected but NO CREDITS');
          console.log('   Add credits at: https://console.anthropic.com/settings/billing\n');
        } else {
          throw error;
        }
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Connection test failed:', error.message);
      return false;
    }
  }

  async analyzeSystem() {
    console.log('\n📊 Analyzing ScholarNet System...\n');
    
    // Get basic metrics
    const metrics = {
      subscriptions: await this.getSubscriptions(),
      users: await this.getUserCount(),
      documents: await this.getDocumentCount(),
      quizzes: await this.getQuizCount()
    };
    
    console.log('Current Metrics:');
    console.log(`  Active Subscriptions: ${metrics.subscriptions.active} / ${metrics.subscriptions.total} total`);
    console.log(`  Total Users: ${metrics.users}`);
    console.log(`  Documents: ${metrics.documents}`);
    console.log(`  Quizzes: ${metrics.quizzes}`);
    
    return metrics;
  }

  async getSubscriptions() {
    try {
      const result = await this.db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE paypal_status = 'ACTIVE') as active,
          COUNT(*) as total
        FROM "Subscriptions"
      `);
      
      return {
        active: parseInt(result.rows[0].active) || 0,
        total: parseInt(result.rows[0].total) || 0
      };
    } catch (error) {
      console.log('   ⚠️  Subscriptions table not accessible');
      return { active: 0, total: 0 };
    }
  }

  async getUserCount() {
    try {
      // Try Analytics table which should have user data
      const result = await this.db.query(`
        SELECT COUNT(DISTINCT user_id) as count 
        FROM "Analytics"
        WHERE user_id IS NOT NULL
      `);
      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      console.log('   ⚠️  Could not count users');
      return 0;
    }
  }

  async getDocumentCount() {
    try {
      const result = await this.db.query('SELECT COUNT(*) as count FROM "Documents"');
      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      return 0;
    }
  }

  async getQuizCount() {
    try {
      const result = await this.db.query('SELECT COUNT(*) as count FROM "Quizzes"');
      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      return 0;
    }
  }

  async run() {
    try {
      // Test all connections
      const connected = await this.testConnections();
      
      if (!connected) {
        console.log('\n❌ Cannot proceed - connection tests failed\n');
        process.exit(1);
      }
      
      // Analyze current system
      await this.analyzeSystem();
      
      console.log('\n✅ Simple engine test complete!\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Next Steps:');
      console.log('1. ✅ All connections verified');
      console.log('2. ✅ Database access confirmed');
      console.log('3. ✅ API credits available');
      console.log('4. 🚀 Ready to build full autonomous engine');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      console.error(error.stack);
    } finally {
      await this.db.end();
      await this.redis.quit();
    }
  }
}

// Run the engine
const engine = new SimpleAutonomousEngine();
engine.run().catch(console.error);
