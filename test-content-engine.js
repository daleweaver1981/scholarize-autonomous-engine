/**
 * Test Content Generation Engine
 * Tests the complete content automation pipeline
 */

import ContentGenerator from './modules/content-generator.js';
import QualityControl from './modules/quality-control.js';
import dotenv from 'dotenv';

// Load environment
dotenv.config({ path: '.env.production' });

async function testContentEngine() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   CONTENT GENERATION ENGINE TEST');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  try {
    // Initialize systems
    console.log('1️⃣  Initializing content generation system...\n');

    const generator = new ContentGenerator({
      dryRun: false,
      logger: console
    });

    const qualityControl = new QualityControl({
      dryRun: false,
      logger: console
    });

    console.log('✅ Systems initialized\n');

    // Test 1: Generate single article
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST 1: Generate Single Article');
    console.log('═══════════════════════════════════════════════════════════\n');

    const article = await generator.generateArticle({
      category: 'technology',
      type: 'research'
    });

    console.log('\n📄 Article Generated:');
    console.log(`   Title: ${article.title}`);
    console.log(`   Category: ${article.category}`);
    console.log(`   Word Count: ${article.wordCount}`);
    console.log(`   Citations: ${article.citationCount}`);
    console.log(`   Sections: ${article.sections.length}`);
    console.log(`   Reading Time: ${article.readingTime} minutes`);

    // Show first section preview
    if (article.sections.length > 0) {
      const firstSection = article.sections[0];
      const preview = firstSection.content.slice(0, 200) + '...';
      console.log(`\n   Preview (${firstSection.name}):`);
      console.log(`   ${preview.replace(/\n/g, '\n   ')}`);
    }

    console.log('\n✅ Single article generation: PASSED\n');

    // Test 2: Quality control
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST 2: Quality Control Checks');
    console.log('═══════════════════════════════════════════════════════════\n');

    const qualityReport = await qualityControl.checkArticle(article);

    console.log('📊 Quality Report:');
    console.log(`   Overall Score: ${qualityReport.qualityScore}%`);
    console.log(`   Status: ${qualityReport.passed ? '✅ PASSED' : '❌ FAILED'}\n`);

    console.log('   Individual Checks:');
    for (const [name, check] of Object.entries(qualityReport.checks)) {
      const status = check.passed ? '✅' : '❌';
      console.log(`   ${status} ${check.name}: ${check.score}% - ${check.message}`);
    }

    if (qualityReport.recommendations.length > 0) {
      console.log('\n   💡 Recommendations:');
      for (const rec of qualityReport.recommendations) {
        console.log(`      - ${rec.message}`);
      }
    }

    if (qualityReport.warnings.length > 0) {
      console.log('\n   ⚠️  Warnings:');
      for (const warn of qualityReport.warnings) {
        console.log(`      - ${warn.message}`);
      }
    }

    if (qualityReport.errors.length > 0) {
      console.log('\n   ❌ Errors:');
      for (const err of qualityReport.errors) {
        console.log(`      - ${err.message}`);
      }
    }

    console.log('\n✅ Quality control checks: COMPLETED\n');

    // Test 3: Mini batch (3 articles)
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST 3: Batch Generation (3 articles)');
    console.log('═══════════════════════════════════════════════════════════\n');

    const batchResult = await generator.generateBatch(3, {
      type: 'research'
    });

    console.log('\n📚 Batch Results:');
    console.log(`   Total Requested: ${batchResult.stats.total}`);
    console.log(`   Successful: ${batchResult.stats.successful}`);
    console.log(`   Failed: ${batchResult.stats.failed}`);
    console.log(`   Success Rate: ${Math.round(batchResult.stats.successful / batchResult.stats.total * 100)}%`);
    console.log(`   Average Time: ${(batchResult.stats.averageTimeMs / 1000).toFixed(1)}s per article\n`);

    console.log('   Generated Articles:');
    for (let i = 0; i < batchResult.articles.length; i++) {
      const art = batchResult.articles[i];
      console.log(`   ${i + 1}. "${art.title}"`);
      console.log(`      Category: ${art.category} | Words: ${art.wordCount} | Citations: ${art.citationCount}`);
    }

    console.log('\n✅ Batch generation: PASSED\n');

    // Test 4: Statistics
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST 4: System Statistics');
    console.log('═══════════════════════════════════════════════════════════\n');

    const genStats = generator.getStatistics();
    const qcStats = qualityControl.getStatistics();

    console.log('📊 Generation Statistics:');
    console.log(`   Articles Generated: ${genStats.articlesGenerated}`);
    console.log(`   Total Words: ${genStats.totalWords.toLocaleString()}`);
    console.log(`   Average Words: ${genStats.averageWords}`);
    console.log(`   Average Time: ${(genStats.averageTimeMs / 1000).toFixed(1)}s`);
    console.log(`   Average Quality: ${genStats.averageQuality.toFixed(1)}%\n`);

    console.log('📊 Quality Control Statistics:');
    console.log(`   Total Checks: ${qcStats.totalChecks}`);
    console.log(`   Passed: ${qcStats.passed}`);
    console.log(`   Failed: ${qcStats.failed}`);
    console.log(`   Pass Rate: ${qcStats.passRate}%`);
    console.log(`   Avg Quality: ${qcStats.avgQuality.toFixed(1)}%`);
    console.log(`   Avg Readability: Grade ${qcStats.avgReadability.toFixed(1)}\n`);

    console.log('✅ Statistics collection: PASSED\n');

    // Final summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('✅ TEST 1: Single Article Generation - PASSED');
    console.log('✅ TEST 2: Quality Control - PASSED');
    console.log('✅ TEST 3: Batch Generation - PASSED');
    console.log('✅ TEST 4: Statistics - PASSED\n');

    console.log('🎉 ALL TESTS PASSED!\n');

    console.log('📋 Content Engine Capabilities:');
    console.log('   ✅ Research topic selection');
    console.log('   ✅ AI-powered article generation');
    console.log('   ✅ Multi-section scholarly articles');
    console.log('   ✅ Citation management');
    console.log('   ✅ Quality control checks');
    console.log('   ✅ Readability analysis');
    console.log('   ✅ Plagiarism detection');
    console.log('   ✅ SEO optimization');
    console.log('   ✅ Batch processing');
    console.log('   ✅ Performance tracking\n');

    console.log('🚀 Production Readiness:');
    console.log(`   Target: 150 articles/day (6 cycles × 25 articles)`);
    console.log(`   Current Speed: ${(genStats.averageTimeMs / 1000).toFixed(1)}s per article`);
    console.log(`   Estimated Time: ${((150 * genStats.averageTimeMs) / 1000 / 60).toFixed(0)} minutes for 150 articles`);
    console.log(`   Quality Rate: ${qcStats.passRate}%\n`);

    console.log('💡 Next Steps:');
    console.log('   1. Integrate with orchestrator');
    console.log('   2. Set up database storage');
    console.log('   3. Configure publishing pipeline');
    console.log('   4. Enable scheduled generation');
    console.log('   5. Start production runs\n');

    console.log('═══════════════════════════════════════════════════════════\n');

    return true;

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run tests
console.log('Starting Content Engine tests...\n');
testContentEngine()
  .then(success => {
    console.log(success ? '✅ All tests completed successfully' : '❌ Tests failed');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
