/**
 * Generate a single test article and save to database
 */

import ContentOrchestrator from './orchestrators/content-orchestrator.js';
import DatabaseManager from './lib/database.js';
import dotenv from 'dotenv';

// Load environment
dotenv.config();

async function generateTestArticle() {
  console.log('\n🧪 Generating test article...\n');

  try {
    // Initialize database
    const db = new DatabaseManager();
    await db.connect();
    console.log('✅ Database connected\n');

    // Create orchestrator with database connection
    const orchestrator = {
      db,
      config: { DRY_RUN_MODE: false },
      logger: console
    };

    // Initialize content orchestrator
    const contentOrch = new ContentOrchestrator(orchestrator);
    console.log('✅ Content orchestrator initialized\n');

    // Generate single article
    console.log('📝 Generating article...\n');
    const result = await contentOrch.generateSingle({
      category: 'Technology',
      type: 'research'
    });

    console.log('\n✅ Article generated and saved to database!\n');
    console.log('📄 Article Details:');
    console.log(`   ID: ${result.article.id}`);
    console.log(`   Title: ${result.article.title}`);
    console.log(`   Category: ${result.article.category}`);
    console.log(`   Word Count: ${result.article.word_count}`);
    console.log(`   Quality Score: ${result.article.quality_score}%`);
    console.log(`   Citations: ${result.article.citations}`);
    console.log(`\n🎉 Success! View it at: ***REMOVED***admin/articles\n`);

    await db.close();
    return true;

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run
generateTestArticle()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
