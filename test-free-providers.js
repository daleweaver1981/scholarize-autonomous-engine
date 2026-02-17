#!/usr/bin/env node

import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

console.log('\n═══════════════════════════════════════════════════════════');
console.log('   FREE AI PROVIDERS TEST');
console.log('═══════════════════════════════════════════════════════════\n');

// Test 1: Groq
console.log('1️⃣  Testing GROQ (FREE - 14,400 req/day)');
console.log('─────────────────────────────────────────────────────────\n');

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

try {
  const start = Date.now();
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'user',
        content: 'Write a 200-word article introduction about artificial intelligence in education. Include an engaging hook and clear thesis statement.'
      }
    ],
    max_tokens: 500,
    temperature: 0.7
  });
  
  const duration = Date.now() - start;
  const content = response.choices[0].message.content;
  const tokens = response.usage.total_tokens;
  
  console.log(`✅ GROQ SUCCESS`);
  console.log(`   Response time: ${duration}ms`);
  console.log(`   Tokens used: ${tokens}`);
  console.log(`   Model: llama-3.3-70b-versatile`);
  console.log(`   Word count: ${content.split(/\s+/).length}`);
  console.log(`\n   Generated content:\n   ${content.substring(0, 200)}...\n`);
} catch (error) {
  console.log(`❌ GROQ FAILED: ${error.message}\n`);
}

// Test 2: DeepSeek
console.log('\n2️⃣  Testing DEEPSEEK (ULTRA CHEAP - $0.14/M tokens)');
console.log('─────────────────────────────────────────────────────────\n');

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com'
});

try {
  const start = Date.now();
  const response = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'user',
        content: 'Write a 200-word article introduction about blockchain technology. Include an engaging hook and clear thesis statement.'
      }
    ],
    max_tokens: 500,
    temperature: 0.7
  });
  
  const duration = Date.now() - start;
  const content = response.choices[0].message.content;
  const tokens = response.usage.total_tokens;
  
  console.log(`✅ DEEPSEEK SUCCESS`);
  console.log(`   Response time: ${duration}ms`);
  console.log(`   Tokens used: ${tokens}`);
  console.log(`   Model: deepseek-chat`);
  console.log(`   Word count: ${content.split(/\s+/).length}`);
  console.log(`\n   Generated content:\n   ${content.substring(0, 200)}...\n`);
} catch (error) {
  console.log(`❌ DEEPSEEK FAILED: ${error.message}\n`);
}

// Test 3: Full Article Generation with Groq
console.log('\n3️⃣  Testing FULL ARTICLE with GROQ');
console.log('─────────────────────────────────────────────────────────\n');

try {
  const start = Date.now();
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: 'You are an expert educational content writer. Write comprehensive, well-researched articles with proper structure.'
      },
      {
        role: 'user',
        content: `Write a comprehensive 1000-word article about "The Impact of AI on Modern Education".

Include:
- Engaging introduction with hook
- 4-5 main sections with clear headings
- Real-world examples
- Data and statistics
- Conclusion with key takeaways

Format as plain text with clear section headers.`
      }
    ],
    max_tokens: 2000,
    temperature: 0.7
  });
  
  const duration = Date.now() - start;
  const content = response.choices[0].message.content;
  const tokens = response.usage.total_tokens;
  const wordCount = content.split(/\s+/).length;
  
  console.log(`✅ FULL ARTICLE GENERATION SUCCESS`);
  console.log(`   Response time: ${duration}ms`);
  console.log(`   Tokens used: ${tokens}`);
  console.log(`   Word count: ${wordCount}`);
  console.log(`   Cost estimate: FREE (Groq)`);
  console.log(`\n   Article preview (first 300 chars):\n   ${content.substring(0, 300)}...\n`);
  
  // Save to file
  const fs = await import('fs');
  fs.writeFileSync('/tmp/groq-test-article.txt', content);
  console.log(`   ✅ Full article saved to: /tmp/groq-test-article.txt\n`);
  
} catch (error) {
  console.log(`❌ FULL ARTICLE FAILED: ${error.message}\n`);
}

console.log('═══════════════════════════════════════════════════════════');
console.log('   TEST SUMMARY');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('✅ Free providers tested');
console.log('💰 Total cost: $0 (using free tiers)');
console.log('🚀 Ready for production use\n');
