#!/usr/bin/env node
// ScholarNet Autonomous User Acquisition Engine - FINAL VERSION
import Anthropic from '@anthropic-ai/sdk';
import pg from 'pg';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import WorkingAutonomousImplementer from './autonomous-implementer-safe.js';

dotenv.config({ path: '.env.production' });

const { Pool } = pg;

class AutonomousUserAcquisitionEngine {
  constructor(config) {
    this.claude = new Anthropic({ apiKey: config.anthropicKey });
    
    this.db = new Pool({
      host: config.dbHost,
      port: config.dbPort,
      database: config.dbName,
      user: config.dbUser,
      password: config.dbPassword,
      max: 20
    });
    
    this.redis = new Redis({
      host: config.redisHost,
      port: config.redisPort,
      password: config.redisPassword || undefined
    });
    
    this.safetyConfig = {
      dryRunMode: config.dryRunMode === 'true',
      maxDailyDeployments: parseInt(config.maxDailyDeployments) || 1,
      deploymentWindows: [
        { start: 10, end: 14, label: 'Late Night Pacific (2 AM - 6 AM)' }
      ],
      maxTrafficThreshold: 0.15
    };
    
    console.log('🤖 Autonomous User Acquisition Engine Initialized');
    console.log(`🔒 Dry Run Mode: ${this.safetyConfig.dryRunMode ? 'ENABLED' : 'DISABLED'}`);
    console.log(`⏰ Deployment Windows: ${this.safetyConfig.deploymentWindows.map(w => w.label).join(', ')}`);
  }

  async run() {
    console.log('\n🚀 Starting Autonomous Acquisition Cycle...\n');
    
    try {
      await this.preFlight();
      const userStats = await this.getUserStats();
      const opportunities = await this.generateAcquisitionOpportunities(userStats);
      
      const canDeployNow = await this.isDeploymentWindowOpen();
      
      let implementations = [];
      if (!this.safetyConfig.dryRunMode && opportunities.length > 0) {
        if (canDeployNow) {
          implementations = await this.executeImplementations(opportunities);
        } else {
          console.log('\n⏸️  Outside deployment window - skipping implementation');
          console.log('   Deployments only occur during low-traffic hours\n');
        }
      } else if (this.safetyConfig.dryRunMode) {
        console.log('\n⏭️  DRY RUN MODE - Skipping implementation\n');
      }
      
      const report = await this.generateReport(userStats, opportunities, implementations);
      
      console.log('\n✅ Autonomous Cycle Complete\n');
      
    } catch (error) {
      console.error('❌ Error in autonomous cycle:', error);
    }
  }

  async isDeploymentWindowOpen() {
    console.log('⏰ Checking deployment window...\n');
    
    const now = new Date();
    const currentHourUTC = now.getUTCHours();
    
    let inWindow = false;
    let windowLabel = '';
    
    for (const window of this.safetyConfig.deploymentWindows) {
      if (currentHourUTC >= window.start && currentHourUTC < window.end) {
        inWindow = true;
        windowLabel = window.label;
        break;
      }
    }
    
    if (!inWindow) {
      console.log(`  ❌ Current time: ${now.toISOString()}`);
      console.log(`  ❌ UTC Hour: ${currentHourUTC}:00`);
      console.log(`  ❌ Not in deployment window\n`);
      return false;
    }
    
    console.log(`  ✅ In deployment window: ${windowLabel}`);
    console.log(`  ✅ UTC Hour: ${currentHourUTC}:00\n`);
    
    return true;
  }

  async preFlight() {
    console.log('🔍 Pre-Flight Safety Checks...\n');
    
    try {
      await this.db.query('SELECT NOW()');
      console.log('  ✅ Database Connection');
      
      await this.redis.ping();
      console.log('  ✅ Redis Connection');
      
      const response = await this.claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      });
      console.log('  ✅ Anthropic API (has credits)');
      
      console.log('\n✅ All Pre-Flight Checks Passed\n');
      
    } catch (error) {
      throw new Error(`Pre-flight failed: ${error.message}`);
    }
  }

  async getUserStats() {
    console.log('📊 Gathering User Stats...\n');
    
    try {
      const result = await this.db.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '7 days') as signups_7d,
          COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '30 days') as signups_30d
        FROM "Users"
      `);
      
      const data = result.rows[0];
      
      const subscriptions = await this.db.query(`
        SELECT COUNT(*) FILTER (WHERE status = 'active') as active
        FROM "Subscriptions"
      `);
      
      const stats = {
        totalUsers: parseInt(data.total_users) || 0,
        signups7d: parseInt(data.signups_7d) || 0,
        signups30d: parseInt(data.signups_30d) || 0,
        paidUsers: parseInt(subscriptions.rows[0].active) || 0
      };
      
      console.log(`  → Total Users: ${stats.totalUsers}`);
      console.log(`  → Signups (7d): ${stats.signups7d}`);
      console.log(`  → Signups (30d): ${stats.signups30d}`);
      console.log(`  → Paid Users: ${stats.paidUsers}\n`);
      
      return stats;
      
    } catch (error) {
      console.log('  ⚠️  Could not fetch user stats\n');
      return { totalUsers: 0, signups7d: 0, signups30d: 0, paidUsers: 0 };
    }
  }

  async generateAcquisitionOpportunities(userStats) {
    console.log('🧠 Generating User Acquisition Opportunities...\n');
    
    const opportunities = [
      // Original opportunities
      {
        title: 'Implement referral program with rewards for both parties',
        category: 'viral_growth',
        impact: { revenue: '30-50% user growth from word-of-mouth' },
        riskLevel: 0,
        paypalSafe: true
      },
      {
        title: 'Add social proof badges showing active users and success stories',
        category: 'conversion',
        impact: { revenue: '15-25% increase in signup conversion' },
        riskLevel: 0,
        paypalSafe: true
      },
      {
        title: 'Create interactive onboarding flow with progress tracking',
        category: 'retention',
        impact: { revenue: '40-60% improvement in user activation' },
        riskLevel: 1,
        paypalSafe: true
      },
      {
        title: 'Add "Invite Teammates" feature for viral growth',
        category: 'viral_growth',
        impact: { revenue: 'Each user invites avg 2-3 teammates' },
        riskLevel: 0,
        paypalSafe: true
      },
      {
        title: 'Implement email capture with free study guide download',
        category: 'lead_capture',
        impact: { revenue: '50-70% of visitors opt-in for content' },
        riskLevel: 0,
        paypalSafe: true
      },
      {
        title: 'Add countdown timer for limited-time trial offer',
        category: 'conversion',
        impact: { revenue: '20-35% increase in trial signups' },
        riskLevel: 0,
        paypalSafe: true
      },
      {
        title: 'Create shareable achievement badges for social media',
        category: 'viral_growth',
        impact: { revenue: 'Organic social sharing drives 10-20% new signups' },
        riskLevel: 0,
        paypalSafe: true
      },
      {
        title: 'Add comparison pricing table highlighting Team plan value',
        category: 'conversion',
        impact: { revenue: '25-40% increase in Team plan selections' },
        riskLevel: 0,
        paypalSafe: true
      },
      {
        title: 'Implement auto-save feature to reduce signup friction',
        category: 'conversion',
        impact: { revenue: '15-20% reduction in signup abandonment' },
        riskLevel: 0,
        paypalSafe: true
      },
      // NEW: Viral mechanics opportunities
      {
        title: 'Add forced virality: Share to unlock premium features',
        category: 'viral_growth',
        impact: { revenue: 'Each user shares 2-3x, exponential growth' },
        riskLevel: 0,
        paypalSafe: true
      },
      {
        title: 'Create public user profiles with shareable achievements',
        category: 'viral_growth',
        impact: { revenue: '30-50% of users share profile' },
        riskLevel: 0,
        paypalSafe: true
      },
      {
        title: 'Build referral leaderboard with lifetime Pro rewards',
        category: 'viral_growth',
        impact: { revenue: 'Top 10 referrers generate 100+ users each' },
        riskLevel: 0,
        paypalSafe: true
      },
      {
        title: 'Add one-click achievement sharing for social media',
        category: 'viral_growth',
        impact: { revenue: '20-40% of achievements shared' },
        riskLevel: 0,
        paypalSafe: true
      },
      {
        title: 'Implement invite-only beta features (FOMO)',
        category: 'viral_growth',
        impact: { revenue: '40-60% faster signup rate' },
        riskLevel: 0,
        paypalSafe: true
      },
      // NEW: Email capture opportunities
      {
        title: 'Add homepage email capture with free study guide',
        category: 'lead_capture',
        impact: { revenue: '30-50% of homepage visitors give email' },
        riskLevel: 0,
        paypalSafe: true
      },
      {
        title: 'Implement scroll-triggered email popup on blog posts',
        category: 'lead_capture',
        impact: { revenue: '15-25% of blog readers give email' },
        riskLevel: 0,
        paypalSafe: true
      },
      {
        title: 'Add email-gated content downloads',
        category: 'lead_capture',
        impact: { revenue: '60-80% opt-in rate for premium content' },
        riskLevel: 0,
        paypalSafe: true
      },
      {
        title: 'Create "Save your progress" email capture',
        category: 'lead_capture',
        impact: { revenue: '40-60% of active users save progress' },
        riskLevel: 0,
        paypalSafe: true
      },
      {
        title: 'Build automated welcome email sequence',
        category: 'lead_nurture',
        impact: { revenue: '20-30% of emails convert to signups' },
        riskLevel: 0,
        paypalSafe: true
      }
    ];
    
    console.log(`  ✓ Generated ${opportunities.length} acquisition opportunities\n`);
    
    return opportunities;
  }

  async executeImplementations(opportunities) {
    console.log('\n🚀 Checking for Safe Implementation Opportunities...\n');
    
    const ultraSafe = opportunities.filter(opp => 
      opp.riskLevel <= 1 && 
      opp.paypalSafe === true
    );
    
    if (ultraSafe.length === 0) {
      console.log('  ℹ️  No ultra-safe opportunities found\n');
      return [];
    }
    
    console.log(`  ✓ Found ${ultraSafe.length} ultra-safe opportunities\n`);
    
    const implementer = new WorkingAutonomousImplementer();
    
    const canDeploy = await implementer.canDeploy();
    
    if (!canDeploy) {
      console.log('  ⏸️  Deployment not allowed at this time\n');
      await implementer.db.end();
      await implementer.redis.quit();
      return [];
    }
    
    const topOpportunity = ultraSafe[0];
    
    console.log(`  → Selected: ${topOpportunity.title}\n`);
    
    const result = await implementer.implementSafely(topOpportunity);
    
    await implementer.db.end();
    await implementer.redis.quit();
    
    return [result];
  }

  async generateReport(userStats, opportunities, implementations = []) {
    console.log('📊 Generating Report...\n');
    
    const report = {
      timestamp: new Date().toISOString(),
      mode: this.safetyConfig.dryRunMode ? 'DRY RUN' : 'PRODUCTION',
      userStats,
      opportunities: opportunities.length,
      topOpportunities: opportunities.slice(0, 5),
      implementations: implementations,
      deployed: implementations.length > 0 && implementations[0].status === 'success'
    };
    
    try {
      await this.db.query(`
        INSERT INTO autonomous_reports (data, created_at)
        VALUES ($1, NOW())
      `, [report]);
    } catch (error) {
      console.log('  ⚠️  Could not save report to database');
    }
    
    console.log('='.repeat(60));
    console.log('AUTONOMOUS ENGINE REPORT');
    console.log('='.repeat(60));
    console.log(`Mode: ${report.mode}`);
    console.log(`Timestamp: ${report.timestamp}`);
    console.log('');
    console.log('USER STATS:');
    console.log(`  Total Users: ${userStats.totalUsers}`);
    console.log(`  New Signups (7d): ${userStats.signups7d}`);
    console.log(`  New Signups (30d): ${userStats.signups30d}`);
    console.log(`  Paid Users: ${userStats.paidUsers}`);
    console.log('');
    console.log(`OPPORTUNITIES IDENTIFIED: ${opportunities.length}`);
    
    if (opportunities.length > 0) {
      console.log('');
      console.log('TOP 5 OPPORTUNITIES:');
      opportunities.slice(0, 5).forEach((opp, i) => {
        console.log(`  ${i + 1}. ${opp.title}`);
        console.log(`     Category: ${opp.category} | Risk: ${opp.riskLevel}/10`);
        console.log(`     Impact: ${opp.impact.revenue || JSON.stringify(opp.impact)}`);
      });
    }
    
    if (implementations.length > 0) {
      console.log('');
      console.log('IMPLEMENTATIONS:');
      implementations.forEach((impl, i) => {
        console.log(`  ${i + 1}. Status: ${impl.status.toUpperCase()}`);
        if (impl.deploymentId) {
          console.log(`     Deployment ID: ${impl.deploymentId}`);
        }
        if (impl.reason) {
          console.log(`     Reason: ${impl.reason}`);
        }
      });
    }
    
    console.log('='.repeat(60));
    console.log('');
    
    return report;
  }
}

async function main() {
  const config = {
    anthropicKey: process.env.ANTHROPIC_API_KEY,
    dbHost: process.env.DB_HOST,
    dbPort: process.env.DB_PORT,
    dbName: process.env.DB_NAME,
    dbUser: process.env.DB_USER,
    dbPassword: process.env.DB_PASSWORD,
    redisHost: process.env.REDIS_HOST,
    redisPort: process.env.REDIS_PORT,
    redisPassword: process.env.REDIS_PASSWORD,
    dryRunMode: process.env.DRY_RUN_MODE,
    maxDailyDeployments: process.env.MAX_DAILY_DEPLOYMENTS
  };

  const engine = new AutonomousUserAcquisitionEngine(config);
  await engine.run();
  
  await engine.db.end();
  await engine.redis.quit();
}

main().catch(console.error);

export default AutonomousUserAcquisitionEngine;
