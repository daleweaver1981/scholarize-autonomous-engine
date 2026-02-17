#!/usr/bin/env node
// SEO Intelligence Module for Autonomous Engine
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

const { Pool } = pg;

class SeoIntelligence {
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
   * Get current SEO snapshot
   */
  async getCurrentSnapshot() {
    console.log('📊 Gathering SEO intelligence...\n');

    const [rankings, changes, topPerformers, declining] = await Promise.all([
      this.getTotalRankings(),
      this.getRecentChanges(),
      this.getTopPerformers(),
      this.getDecliningKeywords()
    ]);

    return {
      rankings,
      changes,
      topPerformers,
      declining,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get total rankings breakdown
   */
  async getTotalRankings() {
    try {
      const result = await this.db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE "currentRanking" <= 3) as top_3,
          COUNT(*) FILTER (WHERE "currentRanking" <= 10) as top_10,
          COUNT(*) FILTER (WHERE "currentRanking" <= 20) as top_20,
          COUNT(*) FILTER (WHERE "currentRanking" <= 50) as top_50,
          COUNT(*) as total_tracked,
          COUNT(*) FILTER (WHERE "currentRanking" IS NOT NULL) as ranked,
          ROUND(AVG("currentRanking"), 1) as avg_position
        FROM seo_keywords
        WHERE "isActive" = true
      `);

      const data = result.rows[0];

      console.log('  → Total Rankings:');
      console.log(`     Top 3: ${data.top_3}`);
      console.log(`     Top 10: ${data.top_10}`);
      console.log(`     Top 20: ${data.top_20}`);
      console.log(`     Top 50: ${data.top_50}`);
      console.log(`     Ranked: ${data.ranked}`);
      console.log(`     Total Tracked: ${data.total_tracked}`);
      console.log(`     Average Position: ${data.avg_position || 'N/A'}`);

      return {
        top3: parseInt(data.top_3) || 0,
        top10: parseInt(data.top_10) || 0,
        top20: parseInt(data.top_20) || 0,
        top50: parseInt(data.top_50) || 0,
        ranked: parseInt(data.ranked) || 0,
        totalTracked: parseInt(data.total_tracked) || 0,
        avgPosition: parseFloat(data.avg_position) || 0
      };

    } catch (error) {
      console.log('  ⚠️  Could not fetch ranking data:', error.message);
      return {
        top3: 0,
        top10: 0,
        top20: 0,
        top50: 0,
        ranked: 0,
        totalTracked: 0,
        avgPosition: 0
      };
    }
  }

  /**
   * Get recent ranking changes (last 7 days)
   */
  async getRecentChanges() {
    try {
      const result = await this.db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE "currentRanking" < "previousRanking") as improved,
          COUNT(*) FILTER (WHERE "currentRanking" > "previousRanking") as declined,
          COUNT(*) FILTER (WHERE "currentRanking" = "previousRanking") as stable,
          ROUND(AVG("currentRanking" - "previousRanking"), 1) as avg_change
        FROM seo_keywords
        WHERE "isActive" = true 
        AND "previousRanking" IS NOT NULL
        AND "currentRanking" IS NOT NULL
        AND "updatedAt" > NOW() - INTERVAL '7 days'
      `);

      const data = result.rows[0];

      console.log('  → Recent Changes (7 days):');
      console.log(`     Improved: ${data.improved}`);
      console.log(`     Declined: ${data.declined}`);
      console.log(`     Stable: ${data.stable}`);
      console.log(`     Avg Change: ${data.avg_change > 0 ? '+' : ''}${data.avg_change || 0}`);

      return {
        improved: parseInt(data.improved) || 0,
        declined: parseInt(data.declined) || 0,
        stable: parseInt(data.stable) || 0,
        avgChange: parseFloat(data.avg_change) || 0
      };

    } catch (error) {
      console.log('  ⚠️  Could not fetch change data:', error.message);
      return { improved: 0, declined: 0, stable: 0, avgChange: 0 };
    }
  }

  /**
   * Get top performing keywords
   */
  async getTopPerformers() {
    try {
      const result = await this.db.query(`
        SELECT 
          keyword,
          "currentRanking",
          "searchVolume",
          "targetUrl"
        FROM seo_keywords
        WHERE "isActive" = true
        AND "currentRanking" IS NOT NULL
        AND "currentRanking" <= 10
        ORDER BY "currentRanking" ASC, "searchVolume" DESC
        LIMIT 10
      `);

      console.log('  → Top 10 Performers:');
      if (result.rows.length === 0) {
        console.log('     None yet - run ranking tracker to populate data');
      } else {
        result.rows.forEach((row, i) => {
          console.log(`     ${i + 1}. "${row.keyword}" - Position #${row.currentRanking} (${row.searchVolume} searches/mo)`);
        });
      }

      return result.rows.map(row => ({
        keyword: row.keyword,
        position: row.currentRanking,
        searchVolume: row.searchVolume,
        targetUrl: row.targetUrl
      }));

    } catch (error) {
      console.log('  ⚠️  Could not fetch top performers:', error.message);
      return [];
    }
  }

  /**
   * Get declining keywords (opportunities to fix)
   */
  async getDecliningKeywords() {
    try {
      const result = await this.db.query(`
        SELECT 
          keyword,
          "currentRanking",
          "previousRanking",
          ("currentRanking" - "previousRanking") as position_change,
          "searchVolume",
          "targetUrl"
        FROM seo_keywords
        WHERE "isActive" = true
        AND "previousRanking" IS NOT NULL
        AND "currentRanking" IS NOT NULL
        AND "currentRanking" > "previousRanking"
        AND "currentRanking" - "previousRanking" >= 5
        ORDER BY ("currentRanking" - "previousRanking") DESC
        LIMIT 10
      `);

      console.log('  → Declining Keywords (opportunities):');
      if (result.rows.length === 0) {
        console.log('     None (all stable or improving!)');
      } else {
        result.rows.forEach((row, i) => {
          console.log(`     ${i + 1}. "${row.keyword}" - Dropped ${row.position_change} positions (${row.previousRanking} → ${row.currentRanking})`);
        });
      }

      return result.rows.map(row => ({
        keyword: row.keyword,
        currentPosition: row.currentRanking,
        previousPosition: row.previousRanking,
        positionChange: row.position_change,
        searchVolume: row.searchVolume,
        targetUrl: row.targetUrl
      }));

    } catch (error) {
      console.log('  ⚠️  Could not fetch declining keywords:', error.message);
      return [];
    }
  }

  /**
   * Get revenue opportunity estimate
   */
  async getRevenueOpportunity() {
    try {
      // Keywords in positions 11-20 that could move to top 10
      const result = await this.db.query(`
        SELECT 
          COUNT(*) as quick_wins,
          SUM("searchVolume") as potential_traffic
        FROM seo_keywords
        WHERE "isActive" = true
        AND "currentRanking" IS NOT NULL
        AND "currentRanking" BETWEEN 11 AND 20
      `);

      const data = result.rows[0];
      const quickWins = parseInt(data.quick_wins) || 0;
      const potentialTraffic = parseInt(data.potential_traffic) || 0;

      // Rough estimate: 30% CTR in top 10, 5% conversion to trial, 20% trial to paid
      const estimatedClicks = potentialTraffic * 0.30;
      const estimatedTrials = estimatedClicks * 0.05;
      const estimatedConversions = estimatedTrials * 0.20;
      const monthlyRevenue = estimatedConversions * 24.99; // Pro plan price

      console.log('  → Revenue Opportunity:');
      console.log(`     Quick-win keywords (positions 11-20): ${quickWins}`);
      console.log(`     Potential monthly traffic: ${potentialTraffic.toLocaleString()}`);
      console.log(`     Estimated monthly revenue if all reach top 10: $${monthlyRevenue.toFixed(2)}`);

      return {
        quickWinKeywords: quickWins,
        potentialTraffic,
        estimatedMonthlyRevenue: monthlyRevenue
      };

    } catch (error) {
      console.log('  ⚠️  Could not calculate revenue opportunity:', error.message);
      return {
        quickWinKeywords: 0,
        potentialTraffic: 0,
        estimatedMonthlyRevenue: 0
      };
    }
  }

  /**
   * Generate SEO-focused improvement opportunities
   */
  async generateSeoOpportunities() {
    const snapshot = await this.getCurrentSnapshot();
    const revenueOpp = await this.getRevenueOpportunity();

    const opportunities = [];

    // Check if we need to run ranking tracker first
    if (snapshot.rankings.ranked === 0) {
      opportunities.push({
        title: `Run initial ranking check for ${snapshot.rankings.totalTracked.toLocaleString()} keywords`,
        category: 'seo_setup',
        impact: {
          revenue: 'Required to identify revenue opportunities',
          keywords: snapshot.rankings.totalTracked
        },
        riskLevel: 0,
        paypalSafe: true
      });
      console.log(`\n  ⚠️  No ranking data yet - need to run ranking tracker first\n`);
      return opportunities;
    }

    // Opportunity 1: Fix declining keywords
    if (snapshot.declining.length > 0) {
      opportunities.push({
        title: `Fix ${snapshot.declining.length} declining keywords losing traffic`,
        category: 'seo',
        impact: {
          revenue: `$${(snapshot.declining.length * 50).toFixed(0)}-${(snapshot.declining.length * 150).toFixed(0)}/month from recovered traffic`,
          keywords: snapshot.declining.map(k => k.keyword).slice(0, 5)
        },
        riskLevel: 0,
        paypalSafe: true,
        data: snapshot.declining
      });
    }

    // Opportunity 2: Push positions 11-20 to top 10
    if (revenueOpp.quickWinKeywords > 0) {
      opportunities.push({
        title: `Optimize ${revenueOpp.quickWinKeywords} keywords in positions 11-20 to reach top 10`,
        category: 'seo',
        impact: {
          revenue: `$${(revenueOpp.estimatedMonthlyRevenue * 0.5).toFixed(0)}-${revenueOpp.estimatedMonthlyRevenue.toFixed(0)}/month from improved rankings`,
          traffic: `${revenueOpp.potentialTraffic.toLocaleString()} potential monthly visitors`
        },
        riskLevel: 0,
        paypalSafe: true
      });
    }

    // Opportunity 3: Improve average position
    if (snapshot.rankings.avgPosition > 15) {
      opportunities.push({
        title: 'Improve overall content quality to boost average ranking position',
        category: 'seo',
        impact: {
          revenue: '$500-2000/month from improved average position',
          currentAvg: snapshot.rankings.avgPosition,
          targetAvg: 10
        },
        riskLevel: 0,
        paypalSafe: true
      });
    }

    console.log(`\n  ✓ Generated ${opportunities.length} SEO-focused opportunities\n`);

    return opportunities;
  }

  async close() {
    await this.db.end();
  }
}

export default SeoIntelligence;
