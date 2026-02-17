// test-api-key.js
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

async function testAPIKey() {
  console.log('🧪 Testing Anthropic API Key...\n');
  
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY not found in .env.production');
    process.exit(1);
  }
  
  console.log(`🔑 API Key: ${apiKey.substring(0, 20)}...${apiKey.substring(apiKey.length - 4)}`);
  
  const client = new Anthropic({ apiKey });
  
  try {
    console.log('\n📡 Making test request to Claude...');
    
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: 'Respond with "API connection successful" and confirm which model you are.'
      }]
    });
    
    console.log('\n✅ API Connection Successful!\n');
    console.log('Response:', response.content[0].text);
    console.log('\n📊 Token Usage:');
    console.log(`   Input tokens: ${response.usage.input_tokens}`);
    console.log(`   Output tokens: ${response.usage.output_tokens}`);
    console.log(`   Total tokens: ${response.usage.input_tokens + response.usage.output_tokens}`);
    
    // Calculate cost
    const inputCost = (response.usage.input_tokens / 1000000) * 3.00;
    const outputCost = (response.usage.output_tokens / 1000000) * 15.00;
    const totalCost = inputCost + outputCost;
    
    console.log(`\n💰 Request Cost: $${totalCost.toFixed(6)}`);
    console.log(`\n✅ API key is valid and ready to use!\n`);
    
  } catch (error) {
    console.error('\n❌ API Test Failed:\n');
    
    if (error.status === 401) {
      console.error('   Authentication failed - API key is invalid');
    } else if (error.status === 429) {
      console.error('   Rate limit exceeded - too many requests');
    } else if (error.status === 529) {
      console.error('   Anthropic API is overloaded - try again later');
    } else {
      console.error('   Error:', error.message);
    }
    
    process.exit(1);
  }
}

testAPIKey();
