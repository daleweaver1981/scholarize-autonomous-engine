/**
 * Test Full Article Generation with Multi-Provider
 */

import ContentGenerator from './modules/content-generator.js';
import dotenv from 'dotenv';

dotenv.config();

async function testArticleGeneration() {
  console.log('\n🧪 Testing Full Article Generation with Multi-Provider...\n');

  try {
    const generator = new ContentGenerator({ logger: console });

    console.log('\n📝 Generating article...\n');

    const article = await generator.generateArticle({
      category: 'Technology',
      type: 'research'
    });

    console.log('\n✅ Article Generated Successfully!');
    console.log('\n📄 Article Details:');
    console.log(`   Title: ${article.title}`);
    console.log(`   Category: ${article.category}`);
    console.log(`   Word Count: ${article.wordCount}`);
    console.log(`   Citations: ${article.citationCount}`);
    console.log(`   Sections: ${article.sections.length}`);
    console.log(`   Quality: ${article.qualityScore || 'N/A'}%`);

    console.log('\n📊 Provider Usage:');
    const stats = generator.ai.getStats();
    stats.providers.forEach(p => {
      if (p.requests > 0) {
        console.log(`   ${p.name}: ${p.requests} requests (${p.cost})`);
      }
    });

    console.log('\n🎉 Test PASSED - Article generation working with FREE APIs!\n');

    return true;

  } catch (error) {
    console.error('\n❌ Test FAILED');
    console.error('Error:', error.message);
    console.error(error.stack);
    return false;
  }
}

testArticleGeneration()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
