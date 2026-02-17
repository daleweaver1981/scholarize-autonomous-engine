/**
 * AI Provider Manager
 * Intelligently rotates between providers to maximize free tiers
 * Priority: Groq (FREE) → DeepSeek (CHEAP) → OpenAI (Credits) → Anthropic (PAID)
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export default class AIProviderManager {
  constructor(logger = console) {
    this.logger = logger;
    this.providers = [];
    this.currentProviderIndex = 0;
    this.requestCounts = {};

    // Initialize all available providers
    this.initializeProviders();
  }

  initializeProviders() {
    // 1. GROQ (FREE - 14,400 requests/day)
    if (process.env.GROQ_API_KEY) {
      this.providers.push({
        name: 'groq',
        priority: 1,
        cost: 'FREE',
        dailyLimit: 14400,
        client: new OpenAI({
          apiKey: process.env.GROQ_API_KEY,
          baseURL: 'https://api.groq.com/openai/v1'
        }),
        model: 'llama-3.3-70b-versatile',
        type: 'openai'
      });
      this.requestCounts['groq'] = 0;
      this.logger.info('✅ Groq provider initialized (FREE tier)');
    }

    // 2. DEEPSEEK (ULTRA CHEAP - ~$0.14/M tokens)
    if (process.env.DEEPSEEK_API_KEY) {
      this.providers.push({
        name: 'deepseek',
        priority: 2,
        cost: 'ULTRA_CHEAP',
        client: new OpenAI({
          apiKey: process.env.DEEPSEEK_API_KEY,
          baseURL: 'https://api.deepseek.com'
        }),
        model: 'deepseek-chat',
        type: 'openai'
      });
      this.requestCounts['deepseek'] = 0;
      this.logger.info('✅ DeepSeek provider initialized (ULTRA CHEAP)');
    }

    // 3. OPENAI (Credits available)
    if (process.env.OPENAI_API_KEY) {
      this.providers.push({
        name: 'openai',
        priority: 3,
        cost: 'MODERATE',
        client: new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        }),
        model: 'gpt-4o-mini',
        type: 'openai'
      });
      this.requestCounts['openai'] = 0;
      this.logger.info('✅ OpenAI provider initialized (MODERATE cost)');
    }

    // 4. ANTHROPIC (PAID - last resort)
    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.push({
        name: 'anthropic',
        priority: 4,
        cost: 'PAID',
        client: new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY
        }),
        model: 'claude-sonnet-4-5-20250929',
        type: 'anthropic'
      });
      this.requestCounts['anthropic'] = 0;
      this.logger.info('✅ Anthropic provider initialized (PAID - backup only)');
    }

    // Sort by priority (lowest first)
    this.providers.sort((a, b) => a.priority - b.priority);

    this.logger.info(`🎯 Total providers available: ${this.providers.length}`);
    this.logger.info(`📊 Priority order: ${this.providers.map(p => `${p.name} (${p.cost})`).join(' → ')}`);
  }

  /**
   * Get the next available provider
   * Rotates through free providers first, then falls back to paid
   */
  getNextProvider() {
    // Check if current provider hit daily limit
    const currentProvider = this.providers[this.currentProviderIndex];

    if (currentProvider.dailyLimit) {
      const count = this.requestCounts[currentProvider.name];
      if (count >= currentProvider.dailyLimit) {
        this.logger.warn(`⚠️  ${currentProvider.name} hit daily limit (${currentProvider.dailyLimit}), switching provider...`);
        this.currentProviderIndex++;

        // Reset to start if we've gone through all providers
        if (this.currentProviderIndex >= this.providers.length) {
          this.logger.warn('⚠️  All providers exhausted for today, resetting to first provider');
          this.currentProviderIndex = 0;
          // Reset counters (new day)
          Object.keys(this.requestCounts).forEach(key => {
            this.requestCounts[key] = 0;
          });
        }
      }
    }

    return this.providers[this.currentProviderIndex];
  }

  /**
   * Generate text using the best available provider
   */
  async generateText(prompt, options = {}) {
    const provider = this.getNextProvider();
    this.requestCounts[provider.name]++;

    const maxTokens = options.maxTokens || 4000;
    const temperature = options.temperature || 0.7;

    try {
      this.logger.info(`🤖 Using ${provider.name} (${provider.cost}) [Request #${this.requestCounts[provider.name]}]`);

      if (provider.type === 'openai') {
        const response = await provider.client.chat.completions.create({
          model: provider.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature: temperature
        });
        return response.choices[0].message.content;
      } else if (provider.type === 'anthropic') {
        const response = await provider.client.messages.create({
          model: provider.model,
          max_tokens: maxTokens,
          temperature: temperature,
          messages: [{ role: 'user', content: prompt }]
        });
        return response.content[0].text;
      }
    } catch (error) {
      this.logger.error(`❌ ${provider.name} failed: ${error.message}`);

      // Try next provider on failure
      this.currentProviderIndex++;
      if (this.currentProviderIndex >= this.providers.length) {
        this.currentProviderIndex = 0;
      }

      // Retry with next provider
      this.logger.info(`🔄 Retrying with ${this.providers[this.currentProviderIndex].name}...`);
      return this.generateText(prompt, options);
    }
  }

  /**
   * Get current usage statistics
   */
  getStats() {
    return {
      providers: this.providers.map(p => ({
        name: p.name,
        cost: p.cost,
        requests: this.requestCounts[p.name],
        dailyLimit: p.dailyLimit || 'unlimited'
      })),
      currentProvider: this.providers[this.currentProviderIndex].name
    };
  }
}
