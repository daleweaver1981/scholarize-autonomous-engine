#!/usr/bin/env node
/**
 * Manual Content Generation Batch
 * Generates 5 articles using Groq (FREE) provider
 */

import Database from './lib/database.js';
import ContentOrchestrator from './orchestrators/content-orchestrator.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('\n═══════════════════════════════════════════════════════════');
console.log('   MANUAL CONTENT GENERATION BATCH');
console.log('   Using FREE Groq Provider');
console.log('═══════════════════════════════════════════════════════════\n');

// Mock master orchestrator
const mockMaster = {
  isShuttingDown: false,
  redis: null,
  health: null
};

async function main() {
  const orchestrator = new ContentOrchestrator(mockMaster);
  
  try {
    console.log('🚀 Initializing content orchestrator...\n');
    await orchestrator.initialize();
    
    console.log('📝 Generating 5 articles...\n');
    const result = await orchestrator.generateBatch({
      cycle: 'manual-test',
      count: 5
    });
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   BATCH COMPLETE');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`✅ Generated: ${result.generated}/${result.count}`);
    console.log(`❌ Failed: ${result.failed}`);
    console.log(`📊 Total words: ${result.totalWords.toLocaleString()}`);
    console.log(`💰 Cost: $0 (using Groq FREE tier)\n`);
    
    if (result.articles.length > 0) {
      console.log('📄 Articles created:\n');
      result.articles.forEach((article, i) => {
        console.log(`   ${i + 1}. ${article.title}`);
        console.log(`      └─ ${article.word_count} words, Quality: ${article.quality_score}%\n`);
      });
    }
    
    // Close database connection
    if (orchestrator.db) {
      await orchestrator.db.close();
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Batch generation failed:', error);
    console.error(error.stack);
    
    if (orchestrator.db) {
      await orchestrator.db.close();
    }
    
    process.exit(1);
  }
}

main();
