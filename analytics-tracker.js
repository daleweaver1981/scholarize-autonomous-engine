#!/usr/bin/env node
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

const { Pool } = pg;

class AnalyticsTracker {
  constructor() {
    this.db = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });
  }

  async setup() {
    console.log('📊 Setting up analytics tables...\n');
    
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS feature_analytics (
        id SERIAL PRIMARY KEY,
        feature_name TEXT,
        event_type TEXT,
        user_id UUID,
        session_id TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_feature_name ON feature_analytics(feature_name);
      CREATE INDEX IF NOT EXISTS idx_event_type ON feature_analytics(event_type);
      CREATE INDEX IF NOT EXISTS idx_created_at ON feature_analytics(created_at);
      CREATE INDEX IF NOT EXISTS idx_user_id ON feature_analytics(user_id);

      CREATE TABLE IF NOT EXISTS conversion_attribution (
        id SERIAL PRIMARY KEY,
        user_id UUID UNIQUE,
        source TEXT,
        first_feature TEXT,
        features_used TEXT[],
        first_visit TIMESTAMP,
        signed_up_at TIMESTAMP,
        converted_to_paid_at TIMESTAMP,
        metadata JSONB
      );

      CREATE TABLE IF NOT EXISTS traffic_sources (
        id SERIAL PRIMARY KEY,
        session_id TEXT,
        source TEXT,
        medium TEXT,
        campaign TEXT,
        referrer TEXT,
        landing_page TEXT,
        user_id UUID,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅ Analytics tables created\n');
  }

  async getFeaturePerformance(days = 7) {
    const result = await this.db.query(`
      SELECT 
        feature_name,
        COUNT(*) FILTER (WHERE event_type = 'impression') as impressions,
        COUNT(*) FILTER (WHERE event_type = 'click') as clicks,
        COUNT(*) FILTER (WHERE event_type = 'conversion') as conversions,
        COUNT(DISTINCT user_id) as unique_users,
        ROUND(
          COUNT(*) FILTER (WHERE event_type = 'click')::numeric / 
          NULLIF(COUNT(*) FILTER (WHERE event_type = 'impression'), 0) * 100, 
          2
        ) as ctr,
        ROUND(
          COUNT(*) FILTER (WHERE event_type = 'conversion')::numeric / 
          NULLIF(COUNT(*) FILTER (WHERE event_type = 'click'), 0) * 100, 
          2
        ) as conversion_rate
      FROM feature_analytics
      WHERE created_at > NOW() - INTERVAL '${days} days'
      GROUP BY feature_name
      ORDER BY conversions DESC
    `);

    return result.rows;
  }

  async getSourcePerformance(days = 7) {
    const result = await this.db.query(`
      SELECT 
        source,
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE converted_to_paid_at IS NOT NULL) as paid_users,
        ROUND(
          COUNT(*) FILTER (WHERE converted_to_paid_at IS NOT NULL)::numeric / 
          COUNT(*)::numeric * 100,
          2
        ) as conversion_rate,
        ROUND(
          EXTRACT(EPOCH FROM (AVG(signed_up_at - first_visit) / 60))::numeric,
          2
        ) as avg_time_to_signup_minutes
      FROM conversion_attribution
      WHERE first_visit > NOW() - INTERVAL '${days} days'
      GROUP BY source
      ORDER BY total_users DESC
    `);

    return result.rows;
  }

  async getTopConversionPaths(days = 7) {
    const result = await this.db.query(`
      SELECT 
        features_used,
        COUNT(*) as user_count,
        COUNT(*) FILTER (WHERE converted_to_paid_at IS NOT NULL) as paid_count
      FROM conversion_attribution
      WHERE first_visit > NOW() - INTERVAL '${days} days'
        AND array_length(features_used, 1) > 0
      GROUP BY features_used
      ORDER BY user_count DESC
      LIMIT 10
    `);

    return result.rows;
  }

  async generateReport(days = 7) {
    console.log('\n📊 ANALYTICS REPORT\n');
    console.log('='.repeat(70));
    console.log(`Period: Last ${days} days\n`);

    // Feature Performance
    const features = await this.getFeaturePerformance(days);
    
    if (features.length > 0) {
      console.log('FEATURE PERFORMANCE:');
      console.log('-'.repeat(70));
      features.forEach(f => {
        console.log(`\n${f.feature_name}:`);
        console.log(`  Impressions: ${f.impressions}`);
        console.log(`  Clicks: ${f.clicks} (${f.ctr || 0}% CTR)`);
        console.log(`  Conversions: ${f.conversions} (${f.conversion_rate || 0}% conversion)`);
        console.log(`  Unique Users: ${f.unique_users}`);
      });
    } else {
      console.log('FEATURE PERFORMANCE: No data yet\n');
    }

    // Traffic Source Performance
    const sources = await this.getSourcePerformance(days);
    
    if (sources.length > 0) {
      console.log('\n\nTRAFFIC SOURCE PERFORMANCE:');
      console.log('-'.repeat(70));
      sources.forEach(s => {
        console.log(`\n${s.source}:`);
        console.log(`  Total Users: ${s.total_users}`);
        console.log(`  Paid Users: ${s.paid_users}`);
        console.log(`  Conversion Rate: ${s.conversion_rate || 0}%`);
        console.log(`  Avg Time to Signup: ${s.avg_time_to_signup_minutes || 0} minutes`);
      });
    } else {
      console.log('\n\nTRAFFIC SOURCE PERFORMANCE: No data yet\n');
    }

    // Top Conversion Paths
    const paths = await this.getTopConversionPaths(days);
    
    if (paths.length > 0) {
      console.log('\n\nTOP CONVERSION PATHS:');
      console.log('-'.repeat(70));
      paths.slice(0, 5).forEach((p, i) => {
        console.log(`\n${i + 1}. [${p.features_used.join(' → ')}]`);
        console.log(`   Users: ${p.user_count} | Paid: ${p.paid_count}`);
      });
    } else {
      console.log('\n\nTOP CONVERSION PATHS: No data yet\n');
    }

    console.log('\n' + '='.repeat(70) + '\n');
  }

  async seedInitialData() {
    console.log('🌱 Seeding initial attribution data for existing users...\n');

    // Mark existing users with "direct" source
    const users = await this.db.query(`
      SELECT id, "createdAt"
      FROM "Users"
      WHERE id NOT IN (SELECT user_id FROM conversion_attribution WHERE user_id IS NOT NULL)
    `);

    for (const user of users.rows) {
      await this.db.query(`
        INSERT INTO conversion_attribution 
        (user_id, source, first_visit, signed_up_at)
        VALUES ($1, 'direct', $2, $2)
        ON CONFLICT (user_id) DO NOTHING
      `, [user.id, user.createdAt]);
    }

    console.log(`✅ Seeded ${users.rows.length} existing users\n`);
  }
}

export default AnalyticsTracker;

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tracker = new AnalyticsTracker();
  await tracker.setup();
  await tracker.seedInitialData();
  await tracker.generateReport(30);
  await tracker.db.end();
}
