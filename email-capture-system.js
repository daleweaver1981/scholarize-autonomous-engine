#!/usr/bin/env node
import Anthropic from '@anthropic-ai/sdk';
import pg from 'pg';
import dotenv from 'dotenv';
import WorkingAutonomousImplementer from './autonomous-implementer-v2.js';

dotenv.config({ path: '.env.production' });

const { Pool } = pg;

class EmailCaptureSystem {
  constructor() {
    this.claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.db = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });
  }

  async setup() {
    console.log('📧 Setting up email capture tables...\n');
    
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS email_leads (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        source TEXT,
        lead_magnet TEXT,
        subscribed BOOLEAN DEFAULT TRUE,
        user_id UUID,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_email_leads_email ON email_leads(email);
      CREATE INDEX IF NOT EXISTS idx_email_leads_source ON email_leads(source);
      CREATE INDEX IF NOT EXISTS idx_email_leads_created_at ON email_leads(created_at);

      CREATE TABLE IF NOT EXISTS email_sequences (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        sequence_name TEXT,
        day_number INTEGER,
        sent_at TIMESTAMP DEFAULT NOW(),
        opened BOOLEAN DEFAULT FALSE,
        clicked BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS lead_magnets (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE,
        title TEXT,
        description TEXT,
        file_path TEXT,
        downloads INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅ Email capture tables created\n');
  }

  getEmailCaptureOpportunities() {
    return [
      {
        title: 'Add homepage email capture with free study guide',
        category: 'lead_capture',
        impact: { revenue: '30-50% of homepage visitors give email' },
        riskLevel: 0,
        paypalSafe: true,
        priority: 1,
        description: 'Prominent email form on homepage: "Get Free Ultimate Study Guide PDF". Delivers immediately via email. Tracks conversions.'
      },
      {
        title: 'Implement scroll-triggered email popup on blog posts',
        category: 'lead_capture',
        impact: { revenue: '15-25% of blog readers give email' },
        riskLevel: 0,
        paypalSafe: true,
        priority: 2,
        description: 'After scrolling 50% of blog post, show popup: "Want more study tips? Get our weekly newsletter". Non-intrusive timing.'
      },
      {
        title: 'Add email-gated content downloads',
        category: 'lead_capture',
        impact: { revenue: '60-80% opt-in rate for premium content' },
        riskLevel: 0,
        paypalSafe: true,
        priority: 3,
        description: 'Premium study guides, flashcard templates, note-taking templates require email to download. High-value exchange.'
      },
      {
        title: 'Create "Save your progress" email capture',
        category: 'lead_capture',
        impact: { revenue: '40-60% of active users save progress' },
        riskLevel: 0,
        paypalSafe: true,
        priority: 4,
        description: 'After using free features (flashcards, timer, etc), prompt: "Save your progress - Enter email". Natural conversion point.'
      },
      {
        title: 'Build automated welcome email sequence',
        category: 'lead_nurture',
        impact: { revenue: '20-30% of emails convert to signups' },
        riskLevel: 0,
        paypalSafe: true,
        priority: 5,
        description: '7-day email sequence: Day 0 welcome, Day 1 quick win, Day 3 feature spotlight, Day 5 social proof, Day 7 upgrade push. Automated nurture.'
      }
    ];
  }

  async deployEmailCapture() {
    console.log('\n📧 EMAIL CAPTURE DEPLOYMENT\n');
    console.log('='.repeat(70));

    const opportunities = this.getEmailCaptureOpportunities();
    const implementer = new WorkingAutonomousImplementer();

    console.log(`\n📋 ${opportunities.length} email capture opportunities identified\n`);

    for (let i = 0; i < opportunities.length; i++) {
      const opp = opportunities[i];
      
      console.log(`\n[${i + 1}/${opportunities.length}] ${opp.title}`);
      console.log(`    Priority: ${opp.priority} | Risk: ${opp.riskLevel}/10`);
      console.log(`    Impact: ${opp.impact.revenue}\n`);

      const result = await implementer.implementSafely(opp);

      if (result.status === 'success') {
        console.log(`    ✅ Deployed successfully!`);
        console.log(`    Files: ${result.filesDeployed}`);
        console.log(`    Deployment ID: ${result.deploymentId}\n`);
        
        // Wait 5 minutes between deployments
        if (i < opportunities.length - 1) {
          console.log('    ⏳ Waiting 5 minutes before next deployment...\n');
          await new Promise(resolve => setTimeout(resolve, 300000));
        }
      } else {
        console.log(`    ⚠️  Deployment ${result.status}: ${result.reason}\n`);
      }
    }

    await implementer.db.end();
    await implementer.redis.quit();

    console.log('\n' + '='.repeat(70));
    console.log('✅ Email capture deployment complete\n');
  }

  async getStats(days = 7) {
    const result = await this.db.query(`
      SELECT 
        source,
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE user_id IS NOT NULL) as converted_to_users,
        ROUND(
          COUNT(*) FILTER (WHERE user_id IS NOT NULL)::numeric / 
          COUNT(*)::numeric * 100,
          2
        ) as conversion_rate
      FROM email_leads
      WHERE created_at > NOW() - INTERVAL '${days} days'
      GROUP BY source
      ORDER BY total_leads DESC
    `);

    const magnets = await this.db.query(`
      SELECT name, title, downloads
      FROM lead_magnets
      ORDER BY downloads DESC
      LIMIT 10
    `);

    console.log('\n📧 EMAIL CAPTURE STATS (Last ' + days + ' Days)\n');
    console.log('='.repeat(70));

    if (result.rows.length > 0) {
      console.log('\nBY SOURCE:');
      result.rows.forEach(row => {
        console.log(`\n  ${row.source}:`);
        console.log(`    Total Leads: ${row.total_leads}`);
        console.log(`    Converted to Users: ${row.converted_to_users}`);
        console.log(`    Conversion Rate: ${row.conversion_rate || 0}%`);
      });
    } else {
      console.log('\nNo email leads captured yet.');
    }

    if (magnets.rows.length > 0) {
      console.log('\n\nTOP LEAD MAGNETS:');
      magnets.rows.forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.title} (${m.downloads} downloads)`);
      });
    }

    console.log('\n' + '='.repeat(70) + '\n');
  }
}

export default EmailCaptureSystem;

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const system = new EmailCaptureSystem();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--deploy-now')) {
    await system.setup();
    await system.deployEmailCapture();
  } else if (args.includes('--stats')) {
    await system.setup();
    await system.getStats(parseInt(args[args.indexOf('--stats') + 1]) || 7);
  } else {
    await system.setup();
    console.log('✅ Email capture system ready\n');
    console.log('Run with --deploy-now to deploy all email capture features');
    console.log('Run with --stats to see email capture statistics\n');
  }
  
  await system.db.end();
}
