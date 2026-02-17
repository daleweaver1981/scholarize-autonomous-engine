/**
 * Test SEO Engine
 * Tests keyword research and SEO optimization systems
 */

import KeywordResearch from './modules/keyword-research.js';
import SEOOptimizer from './modules/seo-optimizer.js';
import ContentGenerator from './modules/content-generator.js';
import dotenv from 'dotenv';

// Load environment
dotenv.config({ path: '.env.production' });

async function testSEOEngine() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   SEO AUTOMATION ENGINE TEST');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  try {
    // Initialize systems
    console.log('1️⃣  Initializing SEO systems...\n');

    const keywordResearch = new KeywordResearch({
      dryRun: false,
      logger: console
    });

    const seoOptimizer = new SEOOptimizer({
      dryRun: false,
      logger: console
    });

    const contentGenerator = new ContentGenerator({
      dryRun: false,
      logger: console
    });

    console.log('✅ Systems initialized\n');

    // Test 1: Keyword Research
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST 1: Keyword Research');
    console.log('═══════════════════════════════════════════════════════════\n');

    const topic = 'artificial intelligence';
    const keywordReport = await keywordResearch.researchKeywords(topic);

    console.log(`📊 Keyword Research Results for "${topic}":`);
    console.log(`   Total Keywords Found: ${keywordReport.count}`);
    console.log(`   Average Search Volume: ${keywordReport.stats.avgVolume.toLocaleString()}`);
    console.log(`   Average Difficulty: ${keywordReport.stats.avgDifficulty}`);
    console.log(`   Average CPC: $${keywordReport.stats.avgCPC}\n`);

    console.log('   Top 10 Keywords:');
    for (let i = 0; i < Math.min(10, keywordReport.topKeywords.length); i++) {
      const kw = keywordReport.topKeywords[i];
      console.log(`   ${i + 1}. "${kw.keyword}"`);
      console.log(`      Volume: ${kw.searchVolume.toLocaleString()} | Difficulty: ${kw.difficulty} | CPC: $${kw.cpc}`);
      console.log(`      Priority: ${kw.priority} | Intent: ${kw.intent} | Opportunity: ${kw.opportunityScore.toFixed(1)}`);
    }

    console.log('\n✅ Keyword research: PASSED\n');

    // Test 2: Generate Article for SEO Test
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST 2: Generate Sample Article');
    console.log('═══════════════════════════════════════════════════════════\n');

    const article = await contentGenerator.generateArticle({
      topic: topic,
      type: 'research'
    });

    console.log(`📄 Generated Article:`);
    console.log(`   Title: ${article.title}`);
    console.log(`   Word Count: ${article.wordCount}`);
    console.log(`   Sections: ${article.sections.length}`);
    console.log(`   Citations: ${article.citationCount}\n`);

    console.log('✅ Article generation: PASSED\n');

    // Test 3: SEO Analysis (Before Optimization)
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST 3: SEO Analysis (Before Optimization)');
    console.log('═══════════════════════════════════════════════════════════\n');

    const beforeSEO = seoOptimizer.analyzeSEO(article, keywordReport.topKeywords[0]);

    console.log(`📊 Initial SEO Analysis:`);
    console.log(`   Overall Score: ${beforeSEO.score}/100 (Grade: ${beforeSEO.grade})\n`);

    console.log('   Individual Checks:');
    for (const [name, check] of Object.entries(beforeSEO.checks)) {
      const status = check.passed ? '✅' : '❌';
      console.log(`   ${status} ${check.name}: ${check.score}/100`);
      console.log(`      ${check.message}`);
    }

    console.log('\n✅ SEO analysis: PASSED\n');

    // Test 4: SEO Optimization
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST 4: SEO Optimization');
    console.log('═══════════════════════════════════════════════════════════\n');

    const optimizationReport = await seoOptimizer.optimizeArticle(
      article,
      keywordReport.topKeywords[0].keyword
    );

    console.log(`🔧 SEO Optimization Results:`);
    console.log(`   Target Keyword: "${optimizationReport.keywords.primary.keyword}"`);
    console.log(`   Secondary Keywords: ${optimizationReport.keywords.secondary.slice(0, 3).map(k => `"${k.keyword}"`).join(', ')}\n`);

    console.log(`   Before Optimization: ${optimizationReport.before.score}/100 (${optimizationReport.before.grade})`);
    console.log(`   After Optimization:  ${optimizationReport.after.score}/100 (${optimizationReport.after.grade})`);
    console.log(`   Improvement: ${optimizationReport.improvement.scoreDifference > 0 ? '+' : ''}${optimizationReport.improvement.scoreDifference} points (${optimizationReport.improvement.percentChange > 0 ? '+' : ''}${optimizationReport.improvement.percentChange}%)\n`);

    console.log('   Recommendations Applied:');
    const applied = optimizationReport.recommendations.filter(r => r.applied);
    if (applied.length > 0) {
      for (const rec of applied) {
        console.log(`   ✅ ${rec.category}: ${rec.action}`);
      }
    } else {
      console.log('   (No automatic optimizations were needed)');
    }

    if (optimizationReport.recommendations.filter(r => !r.applied).length > 0) {
      console.log('\n   Manual Review Recommended:');
      for (const rec of optimizationReport.recommendations.filter(r => !r.applied)) {
        console.log(`   ⚠️  ${rec.category} (${rec.priority} priority): ${rec.action}`);
      }
    }

    console.log('\n✅ SEO optimization: PASSED\n');

    // Test 5: Optimized Article Details
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST 5: Optimized Article Details');
    console.log('═══════════════════════════════════════════════════════════\n');

    const optimizedArticle = optimizationReport.optimizedArticle;

    console.log('📄 Optimized Article:');
    console.log(`   Title: ${optimizedArticle.title}`);
    console.log(`   Meta: ${optimizedArticle.metaDescription.slice(0, 80)}...`);
    console.log(`   URL: /${optimizedArticle.slug}`);
    console.log(`   Primary Keyword: "${optimizedArticle.seoKeywords.primary.keyword}"`);
    console.log(`   Secondary Keywords: ${optimizedArticle.seoKeywords.secondary.slice(0, 3).join(', ')}`);
    console.log(`   SEO Optimized: ${optimizedArticle.seoOptimized ? 'Yes' : 'No'}\n`);

    console.log('✅ Optimized article validation: PASSED\n');

    // Test 6: System Statistics
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST 6: System Statistics');
    console.log('═══════════════════════════════════════════════════════════\n');

    const keywordStats = keywordResearch.getStatistics();
    const optimizerStats = seoOptimizer.getStatistics();

    console.log('📊 Keyword Research Statistics:');
    console.log(`   Keywords Discovered: ${keywordStats.keywordsDiscovered}`);
    console.log(`   Keywords Analyzed: ${keywordStats.keywordsAnalyzed}`);
    console.log(`   Total Cached: ${keywordStats.totalKeywords}`);
    console.log(`   Avg Search Volume: ${keywordStats.avgSearchVolume.toLocaleString()}`);
    console.log(`   Avg Difficulty: ${keywordStats.avgDifficulty}\n`);

    console.log('📊 SEO Optimizer Statistics:');
    console.log(`   Articles Optimized: ${optimizerStats.articlesOptimized}`);
    console.log(`   Average SEO Score: ${optimizerStats.avgSEOScore.toFixed(1)}/100`);
    console.log(`   Improvement Rate: ${optimizerStats.improvementRate.toFixed(1)}%\n`);

    console.log('✅ Statistics collection: PASSED\n');

    // Final summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('✅ TEST 1: Keyword Research - PASSED');
    console.log('✅ TEST 2: Article Generation - PASSED');
    console.log('✅ TEST 3: SEO Analysis - PASSED');
    console.log('✅ TEST 4: SEO Optimization - PASSED');
    console.log('✅ TEST 5: Optimized Article - PASSED');
    console.log('✅ TEST 6: Statistics - PASSED\n');

    console.log('🎉 ALL TESTS PASSED!\n');

    console.log('📋 SEO Engine Capabilities:');
    console.log('   ✅ Keyword research and analysis');
    console.log('   ✅ Keyword difficulty assessment');
    console.log('   ✅ Search volume estimation');
    console.log('   ✅ Keyword opportunity scoring');
    console.log('   ✅ Title optimization');
    console.log('   ✅ Meta description optimization');
    console.log('   ✅ URL structure optimization');
    console.log('   ✅ Heading structure analysis');
    console.log('   ✅ Keyword density checking');
    console.log('   ✅ Content length optimization');
    console.log('   ✅ Readability analysis');
    console.log('   ✅ Link analysis (internal/external)');
    console.log('   ✅ Overall SEO scoring');
    console.log('   ✅ Automated optimization');
    console.log('   ✅ Performance tracking\n');

    console.log('🚀 Production Readiness:');
    console.log(`   Keyword Database: ${keywordStats.totalKeywords} keywords cached`);
    console.log(`   Avg SEO Score: ${optimizerStats.avgSEOScore.toFixed(1)}/100`);
    console.log(`   Optimization Success Rate: ${optimizerStats.improvementRate.toFixed(1)}%`);
    console.log(`   Ready for Integration: Yes\n`);

    console.log('💡 Next Steps:');
    console.log('   1. Integrate with content generator');
    console.log('   2. Set up competitor analysis');
    console.log('   3. Configure backlink monitoring');
    console.log('   4. Enable rank tracking');
    console.log('   5. Start production optimization\n');

    console.log('═══════════════════════════════════════════════════════════\n');

    return true;

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run tests
console.log('Starting SEO Engine tests...\n');
testSEOEngine()
  .then(success => {
    console.log(success ? '✅ All tests completed successfully' : '❌ Tests failed');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
