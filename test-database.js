#!/usr/bin/env node

import dotenv from 'dotenv';
import Database from './lib/database.js';

// Load environment variables
dotenv.config();

console.log('════════════════════════════════════════════════════════');
console.log('  Database Connection Test');
console.log('════════════════════════════════════════════════════════\n');

const db = new Database();

try {
  // Test connection
  console.log('1️⃣  Testing database connection...');
  await db.connect();
  console.log('   ✅ Connected to database\n');

  // Test query
  console.log('2️⃣  Testing query execution...');
  const result = await db.query('SELECT NOW() as current_time, version() as pg_version');
  console.log('   ✅ Query executed successfully');
  console.log('   ⏰ Current time:', result.rows[0].current_time);
  console.log('   📦 PostgreSQL version:', result.rows[0].pg_version.split('\n')[0], '\n');

  // Check autonomous engine tables
  console.log('3️⃣  Checking autonomous engine tables...');
  const tables = await db.query(`
    SELECT table_name,
           pg_size_pretty(pg_total_relation_size(table_schema||'.'||table_name)) as size
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('articles', 'keywords', 'content_research', 'quality_checks',
                         'social_analytics', 'ai_learnings', 'autonomous_reports')
    ORDER BY table_name
  `);

  console.log('   ✅ Found', tables.rows.length, 'autonomous engine tables:');
  for (const table of tables.rows) {
    console.log(`      • ${table.table_name.padEnd(20)} (${table.size})`);
  }
  console.log();

  // Check article count
  console.log('4️⃣  Checking article count...');
  const articleCount = await db.query('SELECT COUNT(*) as count FROM articles');
  console.log('   📄 Total articles:', articleCount.rows[0].count, '\n');

  // Check keyword count
  console.log('5️⃣  Checking keyword count...');
  const keywordCount = await db.query('SELECT COUNT(*) as count FROM keywords');
  console.log('   🔑 Total keywords:', keywordCount.rows[0].count, '\n');

  // Check AI learnings
  console.log('6️⃣  Checking AI learnings...');
  const learningCount = await db.query('SELECT COUNT(*) as count FROM ai_learnings');
  console.log('   🧠 Total learnings:', learningCount.rows[0].count, '\n');

  console.log('════════════════════════════════════════════════════════');
  console.log('✅ DATABASE TEST PASSED');
  console.log('════════════════════════════════════════════════════════');
  console.log('\nDatabase is ready for autonomous content generation! 🚀\n');

  await db.close();
  process.exit(0);

} catch (error) {
  console.error('\n❌ Database test failed:', error.message);
  console.error('\nError details:', error);
  process.exit(1);
}
