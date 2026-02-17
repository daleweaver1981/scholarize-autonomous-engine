#!/usr/bin/env node
// Revenue Intelligence Module for Autonomous Engine
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

const { Pool } = pg;

class RevenueIntelligence {
  constructor() {
    this.db = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 20
    });
  }

  /**
   * Get comprehensive revenue snapshot
   */
  async getRevenueSnapshot() {
    console.log('💰 Gathering revenue intelligence...\n');

    const [subscriptions, mrr, churn, failedPayments, recentCancellations] = await Promise.all([
      this.getSubscriptionBreakdown(),
      this.calculateMRR(),
      this.calculateChurnRate(),
      this.getFailedPayments(),
      this.getRecentCancellations()
    ]);

    return {
      subscriptions,
      mrr,
      churn,
      failedPayments,
      recentCancellations,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get subscription breakdown
   */
  async getSubscriptionBreakdown() {
    try {
      const result = await this.db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status = 'past_due') as past_due,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
          COUNT(*) as total
        FROM "Subscriptions"
      `);

      const data = result.rows[0];

      console.log('  → Subscription Status:');
      console.log(`     Active: ${data.active}`);
      console.log(`     Past Due: ${data.past_due}`);
      console.log(`     Cancelled: ${data.cancelled}`);
      console.log(`     Total: ${data.total}`);

      return {
        active: parseInt(data.active) || 0,
        pastDue: parseInt(data.past_due) || 0,
        cancelled: parseInt(data.cancelled) || 0,
        total: parseInt(data.total) || 0
      };

    } catch (error) {
      console.log('  ⚠️  Could not fetch subscription data:', error.message);
      return { active: 0, pastDue: 0, cancelled: 0, total: 0 };
    }
  }

  /**
   * Calculate Monthly Recurring Revenue
   */
  async calculateMRR() {
    try {
      const result = await this.db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE plan = 'pro') as pro_count,
          COUNT(*) FILTER (WHERE plan = 'team') as team_count,
          SUM(amount) FILTER (WHERE status = 'active') as total_mrr
        FROM "Subscriptions"
        WHERE status = 'active'
      `);

      const data = result.rows[0];
      const proCount = parseInt(data.pro_count) || 0;
      const teamCount = parseInt(data.team_count) || 0;
      const totalMRR = parseFloat(data.total_mrr) || 0;

      // Calculate by plan
      const proMRR = proCount * 19.99;
      const teamMRR = teamCount * 49.99;

      console.log('  → Monthly Recurring Revenue:');
      console.log(`     Pro (${proCount}): $${proMRR.toFixed(2)}`);
      console.log(`     Team (${teamCount}): $${teamMRR.toFixed(2)}`);
      console.log(`     Total MRR: $${totalMRR.toFixed(2)}`);
      console.log(`     Annual Run Rate: $${(totalMRR * 12).toFixed(2)}`);

      return {
        proCount,
        teamCount,
        proMRR,
        teamMRR,
        totalMRR,
        arr: totalMRR * 12
      };

    } catch (error) {
      console.log('  ⚠️  Could not calculate MRR:', error.message);
      return { proCount: 0, teamCount: 0, proMRR: 0, teamMRR: 0, totalMRR: 0, arr: 0 };
    }
  }

  /**
   * Calculate churn rate (last 30 days)
   */
  async calculateChurnRate() {
    try {
      const result = await this.db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'cancelled' 
            AND "cancelledAt" > NOW() - INTERVAL '30 days') as churned_30d,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status IN ('active', 'cancelled')
            AND "createdAt" < NOW() - INTERVAL '30 days') as baseline
        FROM "Subscriptions"
      `);

      const data = result.rows[0];
      const churned = parseInt(data.churned_30d) || 0;
      const baseline = parseInt(data.baseline) || 1;
      const churnRate = (churned / baseline) * 100;

      console.log('  → Churn Analysis (30 days):');
      console.log(`     Churned: ${churned}`);
      console.log(`     Baseline: ${baseline}`);
      console.log(`     Churn Rate: ${churnRate.toFixed(1)}%`);

      return {
        churned,
        baseline,
        churnRate: parseFloat(churnRate.toFixed(1))
      };

    } catch (error) {
      console.log('  ⚠️  Could not calculate churn:', error.message);
      return { churned: 0, baseline: 0, churnRate: 0 };
    }
  }

  /**
   * Get failed/suspended payments (at-risk revenue)
   */
  async getFailedPayments() {
    try {
      const result = await this.db.query(`
        SELECT 
          "userId",
          "paypalSubscriptionId",
          plan,
          status,
          amount,
          "updatedAt"
        FROM "Subscriptions"
        WHERE status = 'past_due'
        ORDER BY "updatedAt" DESC
        LIMIT 10
      `);

      console.log('  → Failed/Suspended Payments:');
      if (result.rows.length === 0) {
        console.log('     None - all payments healthy! ✅');
      } else {
        result.rows.forEach((row, i) => {
          const planName = row.plan === 'pro' ? 'Pro' : 'Team';
          console.log(`     ${i + 1}. User ${row.userId} - ${planName} ($${row.amount}) - Past due ${this.daysAgo(row.updatedAt)} days ago`);
        });
      }

      return result.rows.map(row => ({
        userId: row.userId,
        plan: row.plan,
        status: row.status,
        amount: parseFloat(row.amount),
        pastDueAt: row.updatedAt,
        atRiskRevenue: parseFloat(row.amount)
      }));

    } catch (error) {
      console.log('  ⚠️  Could not fetch failed payments:', error.message);
      return [];
    }
  }

  /**
   * Get recent cancellations to identify patterns
   */
  async getRecentCancellations() {
    try {
      const result = await this.db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE "cancelledAt" > NOW() - INTERVAL '7 days') as last_7d,
          COUNT(*) FILTER (WHERE "cancelledAt" > NOW() - INTERVAL '30 days') as last_30d,
          AVG(EXTRACT(EPOCH FROM ("cancelledAt" - "createdAt")) / 86400) as avg_lifetime_days
        FROM "Subscriptions"
        WHERE status = 'cancelled'
        AND "cancelledAt" IS NOT NULL
      `);

      const data = result.rows[0];

      console.log('  → Cancellation Trends:');
      console.log(`     Last 7 days: ${data.last_7d || 0}`);
      console.log(`     Last 30 days: ${data.last_30d || 0}`);
      console.log(`     Avg customer lifetime: ${parseFloat(data.avg_lifetime_days || 0).toFixed(0)} days`);

      return {
        last7d: parseInt(data.last_7d) || 0,
        last30d: parseInt(data.last_30d) || 0,
        avgLifetimeDays: parseFloat(data.avg_lifetime_days || 0)
      };

    } catch (error) {
      console.log('  ⚠️  Could not fetch cancellation data:', error.message);
      return { last7d: 0, last30d: 0, avgLifetimeDays: 0 };
    }
  }

  /**
   * Generate revenue-focused opportunities
   */
  async generateRevenueOpportunities() {
    const snapshot = await this.getRevenueSnapshot();
    const opportunities = [];

    // Opportunity 1: Recover failed payments
    if (snapshot.failedPayments.length > 0) {
      const atRiskRevenue = snapshot.failedPayments.reduce((sum, p) => sum + p.atRiskRevenue, 0);
      
      opportunities.push({
        title: `Recover ${snapshot.failedPayments.length} past-due subscriptions`,
        category: 'revenue_recovery',
        impact: {
          revenue: `$${atRiskRevenue.toFixed(2)}/month from payment recovery`,
          subscriptions: snapshot.failedPayments.length
        },
        riskLevel: 0,
        paypalSafe: true,
        action: 'Send payment update emails to past-due users',
        data: snapshot.failedPayments
      });
    }

    // Opportunity 2: Reduce churn
    if (snapshot.churn.churnRate > 5) {
      const potentialSavings = snapshot.mrr.totalMRR * (snapshot.churn.churnRate / 100);
      
      opportunities.push({
        title: `Reduce ${snapshot.churn.churnRate}% churn rate with retention improvements`,
        category: 'churn_reduction',
        impact: {
          revenue: `$${(potentialSavings * 0.5).toFixed(2)}-${potentialSavings.toFixed(2)}/month from reduced churn`,
          currentChurn: `${snapshot.churn.churnRate}%`,
          targetChurn: '3%'
        },
        riskLevel: 0,
        paypalSafe: true,
        action: 'Implement exit surveys and win-back campaigns'
      });
    }

    // Opportunity 3: Upsell Pro → Team
    if (snapshot.mrr.proCount > 10) {
      const upsellPotential = snapshot.mrr.proCount * 0.15; // 15% conversion estimate
      const monthlyRevenue = upsellPotential * (49.99 - 19.99);
      
      opportunities.push({
        title: `Upsell ${Math.floor(upsellPotential)} Pro users to Team plan`,
        category: 'upsell',
        impact: {
          revenue: `$${monthlyRevenue.toFixed(2)}/month from Pro → Team upgrades`,
          proUsers: snapshot.mrr.proCount,
          estimatedConversions: Math.floor(upsellPotential)
        },
        riskLevel: 0,
        paypalSafe: true,
        action: 'Add team collaboration features and upgrade prompts'
      });
    }

    // Opportunity 4: Increase customer lifetime
    if (snapshot.recentCancellations.avgLifetimeDays > 0 && snapshot.recentCancellations.avgLifetimeDays < 90) {
      opportunities.push({
        title: `Increase customer lifetime from ${snapshot.recentCancellations.avgLifetimeDays.toFixed(0)} to 180 days`,
        category: 'retention',
        impact: {
          revenue: `$${(snapshot.mrr.totalMRR * 0.5).toFixed(2)}-${snapshot.mrr.totalMRR.toFixed(2)}/month from 2x longer retention`,
          currentLifetime: `${snapshot.recentCancellations.avgLifetimeDays.toFixed(0)} days`,
          targetLifetime: '180 days'
        },
        riskLevel: 0,
        paypalSafe: true,
        action: 'Implement onboarding improvements and engagement features'
      });
    }

    // Opportunity 5: Grow user base
    if (snapshot.subscriptions.active < 100) {
      opportunities.push({
        title: 'Increase user acquisition to reach 100 active subscriptions',
        category: 'growth',
        impact: {
          revenue: `$${((100 - snapshot.subscriptions.active) * 19.99).toFixed(2)}/month from new subscribers`,
          currentActive: snapshot.subscriptions.active,
          target: 100
        },
        riskLevel: 0,
        paypalSafe: true,
        action: 'Implement referral program and content marketing'
      });
    }

    console.log(`\n  ✓ Generated ${opportunities.length} revenue opportunities\n`);

    return opportunities;
  }

  /**
   * Helper: Calculate days ago
   */
  daysAgo(date) {
    const now = new Date();
    const then = new Date(date);
    const diff = now - then;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  async close() {
    await this.db.end();
  }
}

export default RevenueIntelligence;
