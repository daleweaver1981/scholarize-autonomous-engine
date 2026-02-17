#!/usr/bin/env node
// User Acquisition Intelligence Module
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

const { Pool } = pg;

class UserAcquisitionIntelligence {
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
   * Get comprehensive acquisition snapshot
   */
  async getAcquisitionSnapshot() {
    console.log('🚀 Gathering user acquisition intelligence...\n');

    const [traffic, signups, conversion, topPages, dropoff] = await Promise.all([
      this.getTrafficSources(),
      this.getSignupMetrics(),
      this.getConversionFunnel(),
      this.getTopPerformingPages(),
      this.getDropoffPoints()
    ]);

    return {
      traffic,
      signups,
      conversion,
      topPages,
      dropoff,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Analyze traffic sources
   */
  async getTrafficSources() {
    try {
      const result = await this.db.query(`
        SELECT 
          COUNT(DISTINCT user_id) as unique_visitors,
          COUNT(*) as total_pageviews,
          COUNT(DISTINCT user_id) FILTER (
            WHERE created_at > NOW() - INTERVAL '7 days'
          ) as visitors_7d,
          COUNT(DISTINCT user_id) FILTER (
            WHERE created_at > NOW() - INTERVAL '30 days'
          ) as visitors_30d
        FROM "Analytics"
        WHERE user_id IS NOT NULL
      `);

      const data = result.rows[0];

      console.log('  → Traffic Sources:');
      console.log(`     Unique Visitors (all time): ${data.unique_visitors}`);
      console.log(`     Last 7 days: ${data.visitors_7d}`);
      console.log(`     Last 30 days: ${data.visitors_30d}`);
      console.log(`     Total Pageviews: ${data.total_pageviews}`);

      return {
        uniqueVisitors: parseInt(data.unique_visitors) || 0,
        visitors7d: parseInt(data.visitors_7d) || 0,
        visitors30d: parseInt(data.visitors_30d) || 0,
        totalPageviews: parseInt(data.total_pageviews) || 0
      };

    } catch (error) {
      console.log('  ⚠️  Could not fetch traffic data:', error.message);
      return {
        uniqueVisitors: 0,
        visitors7d: 0,
        visitors30d: 0,
        totalPageviews: 0
      };
    }
  }

  /**
   * Get signup metrics
   */
  async getSignupMetrics() {
    try {
      // Check Users table (not Analytics)
      const usersCheck = await this.db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'Users'
      `);

      if (usersCheck.rows.length === 0) {
        console.log('  → Signup Metrics:');
        console.log('     Users table not found - using Analytics data');
        
        // Fallback to Analytics
        const result = await this.db.query(`
          SELECT 
            COUNT(DISTINCT user_id) as total_users,
            COUNT(DISTINCT user_id) FILTER (
              WHERE created_at > NOW() - INTERVAL '7 days'
            ) as signups_7d,
            COUNT(DISTINCT user_id) FILTER (
              WHERE created_at > NOW() - INTERVAL '30 days'
            ) as signups_30d
          FROM "Analytics"
        `);

        const data = result.rows[0];
        
        console.log(`     Total Users: ${data.total_users}`);
        console.log(`     Signups (7 days): ${data.signups_7d}`);
        console.log(`     Signups (30 days): ${data.signups_30d}`);

        return {
          totalUsers: parseInt(data.total_users) || 0,
          signups7d: parseInt(data.signups_7d) || 0,
          signups30d: parseInt(data.signups_30d) || 0,
          paidConversions: 0
        };
      }

      const result = await this.db.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(*) FILTER (
            WHERE "createdAt" > NOW() - INTERVAL '7 days'
          ) as signups_7d,
          COUNT(*) FILTER (
            WHERE "createdAt" > NOW() - INTERVAL '30 days'
          ) as signups_30d
        FROM "Users"
      `);

      const data = result.rows[0];

      console.log('  → Signup Metrics:');
      console.log(`     Total Users: ${data.total_users}`);
      console.log(`     Signups (7 days): ${data.signups_7d}`);
      console.log(`     Signups (30 days): ${data.signups_30d}`);

      return {
        totalUsers: parseInt(data.total_users) || 0,
        signups7d: parseInt(data.signups_7d) || 0,
        signups30d: parseInt(data.signups_30d) || 0,
        paidConversions: 0 // Will get from Subscriptions later
      };

    } catch (error) {
      console.log('  ⚠️  Could not fetch signup data:', error.message);
      return {
        totalUsers: 0,
        signups7d: 0,
        signups30d: 0,
        paidConversions: 0
      };
    }
  }

  /**
   * Calculate conversion funnel
   */
  async getConversionFunnel() {
    try {
      const traffic = await this.getTrafficSources();
      const signups = await this.getSignupMetrics();

      const visitorToSignup = traffic.visitors30d > 0 
        ? (signups.signups30d / traffic.visitors30d) * 100 
        : 0;

      const signupToPaid = signups.signups30d > 0
        ? (signups.paidConversions / signups.signups30d) * 100
        : 0;

      console.log('  → Conversion Funnel (30 days):');
      console.log(`     Visitor → Signup: ${visitorToSignup.toFixed(1)}%`);
      console.log(`     Signup → Paid: ${signupToPaid.toFixed(1)}%`);
      console.log(`     Overall: ${((visitorToSignup / 100) * (signupToPaid / 100) * 100).toFixed(2)}%`);

      return {
        visitorToSignup: parseFloat(visitorToSignup.toFixed(1)),
        signupToPaid: parseFloat(signupToPaid.toFixed(1)),
        overall: parseFloat(((visitorToSignup / 100) * (signupToPaid / 100) * 100).toFixed(2))
      };

    } catch (error) {
      console.log('  ⚠️  Could not calculate conversion funnel:', error.message);
      return {
        visitorToSignup: 0,
        signupToPaid: 0,
        overall: 0
      };
    }
  }

  /**
   * Get top performing pages
   */
  async getTopPerformingPages() {
    try {
      const result = await this.db.query(`
        SELECT 
          page_url,
          COUNT(DISTINCT user_id) as unique_visitors,
          COUNT(*) as pageviews
        FROM "Analytics"
        WHERE page_url IS NOT NULL
        AND created_at > NOW() - INTERVAL '30 days'
        GROUP BY page_url
        ORDER BY unique_visitors DESC
        LIMIT 10
      `);

      console.log('  → Top Pages (30 days):');
      if (result.rows.length === 0) {
        console.log('     No page data yet');
      } else {
        result.rows.forEach((row, i) => {
          console.log(`     ${i + 1}. ${row.page_url} - ${row.unique_visitors} visitors, ${row.pageviews} views`);
        });
      }

      return result.rows.map(row => ({
        url: row.page_url,
        uniqueVisitors: parseInt(row.unique_visitors),
        pageviews: parseInt(row.pageviews)
      }));

    } catch (error) {
      console.log('  ⚠️  Could not fetch top pages:', error.message);
      return [];
    }
  }

  /**
   * Identify drop-off points
   */
  async getDropoffPoints() {
    try {
      const result = await this.db.query(`
        WITH session_paths AS (
          SELECT 
            user_id,
            page_url,
            created_at,
            LEAD(page_url) OVER (
              PARTITION BY user_id 
              ORDER BY created_at
            ) as next_page
          FROM "Analytics"
          WHERE created_at > NOW() - INTERVAL '7 days'
        )
        SELECT 
          page_url,
          COUNT(*) FILTER (WHERE next_page IS NULL) as exits,
          COUNT(*) as total_views,
          ROUND(
            COUNT(*) FILTER (WHERE next_page IS NULL)::numeric / COUNT(*)::numeric * 100, 
            1
          ) as exit_rate
        FROM session_paths
        WHERE page_url IS NOT NULL
        GROUP BY page_url
        HAVING COUNT(*) > 10
        ORDER BY exit_rate DESC
        LIMIT 10
      `);

      console.log('  → Exit/Drop-off Points:');
      if (result.rows.length === 0) {
        console.log('     Not enough data yet');
      } else {
        result.rows.forEach((row, i) => {
          console.log(`     ${i + 1}. ${row.page_url} - ${row.exit_rate}% exit rate (${row.exits}/${row.total_views})`);
        });
      }

      return result.rows.map(row => ({
        url: row.page_url,
        exits: parseInt(row.exits),
        totalViews: parseInt(row.total_views),
        exitRate: parseFloat(row.exit_rate)
      }));

    } catch (error) {
      console.log('  ⚠️  Could not identify drop-off points:', error.message);
      return [];
    }
  }

  /**
   * Generate user acquisition opportunities
   */
  async generateAcquisitionOpportunities() {
    const snapshot = await this.getAcquisitionSnapshot();
    const opportunities = [];

    // Opportunity 1: Improve visitor → signup conversion
    if (snapshot.conversion.visitorToSignup < 5) {
      opportunities.push({
        title: 'Increase visitor → signup conversion from ' + snapshot.conversion.visitorToSignup + '% to 10%',
        category: 'conversion',
        impact: {
          revenue: `${Math.floor(snapshot.traffic.visitors30d * 0.10 * 0.20 * 19.99)} monthly from improved signup conversion`,
          currentRate: snapshot.conversion.visitorToSignup + '%',
          targetRate: '10%'
        },
        riskLevel: 0,
        paypalSafe: true,
        action: 'Add clear CTAs, social proof, and streamlined signup flow'
      });
    }

    // Opportunity 2: Reduce exit rates on high-traffic pages
    if (snapshot.dropoff.length > 0) {
      const worstPage = snapshot.dropoff[0];
      opportunities.push({
        title: `Reduce ${worstPage.exitRate}% exit rate on high-traffic page`,
        category: 'retention',
        impact: {
          revenue: `Retain ${Math.floor(worstPage.exits * 0.30)} visitors/month`,
          page: worstPage.url,
          currentExitRate: worstPage.exitRate + '%'
        },
        riskLevel: 0,
        paypalSafe: true,
        action: 'Add engaging CTAs, related content, and exit-intent popups'
      });
    }

    // Opportunity 3: Grow traffic
    if (snapshot.traffic.visitors30d < 1000) {
      opportunities.push({
        title: 'Increase monthly traffic from ' + snapshot.traffic.visitors30d + ' to 1,000 visitors',
        category: 'traffic',
        impact: {
          revenue: `${Math.floor((1000 - snapshot.traffic.visitors30d) * 0.05 * 0.20 * 19.99)}/month from new traffic`,
          currentVisitors: snapshot.traffic.visitors30d,
          targetVisitors: 1000
        },
        riskLevel: 0,
        paypalSafe: true,
        action: 'Accelerate SEO content, social media, and referral programs'
      });
    }

    // Opportunity 4: Implement viral growth loop
    opportunities.push({
      title: 'Add referral program to enable viral growth',
      category: 'viral',
      impact: {
        revenue: 'Potential 30-50% growth from word-of-mouth',
        mechanism: 'Give both referrer and referee 1 month free'
      },
      riskLevel: 0,
      paypalSafe: true,
      action: 'Build referral link system with tracking and rewards'
    });

    // Opportunity 5: Capture leads with content upgrades
    opportunities.push({
      title: 'Implement lead magnets to build email list',
      category: 'lead_gen',
      impact: {
        revenue: 'Convert 20-30% of visitors to email subscribers',
        nurture: 'Email nurture can convert 10-15% to paid over 90 days'
      },
      riskLevel: 0,
      paypalSafe: true,
      action: 'Add downloadable study guides, templates, cheat sheets'
    });

    console.log(`\n  ✓ Generated ${opportunities.length} acquisition opportunities\n`);

    return opportunities;
  }

  async close() {
    await this.db.end();
  }
}

export default UserAcquisitionIntelligence;
