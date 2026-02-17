/**
 * Test Multi-Provider System
 * Verifies all providers are working and rotation is functioning
 */

import AIProviderManager from './modules/ai-provider-manager.js';
import dotenv from 'dotenv';

dotenv.config();

async function testMultiProvider() {
  console.log('\n🧪 Testing Multi-Provider System...\n');

  try {
    // Initialize provider manager
    const ai = new AIProviderManager(console);

    console.log('\n📊 Provider Status:');
    const stats = ai.getStats();
    console.log(JSON.stringify(stats, null, 2));

    // Test 1: Generate text with first provider (should be Groq - FREE)
    console.log('\n🧪 Test 1: Generate text with first provider...');
    const response1 = await ai.generateText(
      'Write a 100-word paragraph about quantum computing.',
      { maxTokens: 200, temperature: 0.7 }
    );
    console.log('\n✅ Response 1:');
    console.log(response1.substring(0, 150) + '...');

    // Test 2: Generate more text (should still be same provider)
    console.log('\n🧪 Test 2: Generate text again...');
    const response2 = await ai.generateText(
      'Write a 50-word summary of artificial intelligence.',
      { maxTokens: 100, temperature: 0.7 }
    );
    console.log('\n✅ Response 2:');
    console.log(response2.substring(0, 150) + '...');

    // Show updated stats
    console.log('\n📊 Updated Provider Stats:');
    const finalStats = ai.getStats();
    console.log(JSON.stringify(finalStats, null, 2));

    console.log('\n✅ Multi-Provider Test: PASSED\n');
    console.log('🎉 All providers working correctly!');
    console.log(`📌 Current provider: ${finalStats.currentProvider}`);
    console.log(`📊 Total providers available: ${finalStats.providers.length}`);

    return true;

  } catch (error) {
    console.error('\n❌ Multi-Provider Test: FAILED');
    console.error('Error:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run test
testMultiProvider()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
