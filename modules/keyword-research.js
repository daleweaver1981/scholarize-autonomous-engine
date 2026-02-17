/**
 * Keyword Research System
 * Discovers and analyzes keywords for content optimization
 */

import Anthropic from '@anthropic-ai/sdk';
import { SEO_CONFIG, SCHOLARLY_KEYWORDS } from '../config/seo-config.js';
import { TOPICS } from '../config/content-config.js';

export default class KeywordResearch {
  constructor(options = {}) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    this.dryRun = options.dryRun || false;
    this.logger = options.logger || console;

    // Keyword database (in production, use Redis or DB)
    this.keywords = new Map();
    this.keywordHistory = [];

    // Statistics
    this.stats = {
      keywordsDiscovered: 0,
      keywordsAnalyzed: 0,
      avgSearchVolume: 0,
      avgDifficulty: 0
    };
  }

  /**
   * Research keywords for a topic
   */
  async researchKeywords(topic, options = {}) {
    try {
      this.logger.info(`Researching keywords for: ${topic}`);

      // 1. Generate seed keywords
      const seedKeywords = await this.generateSeedKeywords(topic);

      // 2. Expand keywords (variations, related, questions)
      const expandedKeywords = await this.expandKeywords(seedKeywords, topic);

      // 3. Simulate keyword metrics (in production, use real SEO API)
      const keywordsWithMetrics = this.addKeywordMetrics(expandedKeywords);

      // 4. Filter by criteria
      const qualifiedKeywords = this.filterKeywords(keywordsWithMetrics);

      // 5. Prioritize keywords
      const prioritizedKeywords = this.prioritizeKeywords(qualifiedKeywords);

      // 6. Store keywords
      for (const kw of prioritizedKeywords) {
        this.keywords.set(kw.keyword, kw);
        this.keywordHistory.push(kw.keyword);
      }

      // 7. Update statistics
      this.updateStatistics(prioritizedKeywords);

      const report = {
        topic: topic,
        timestamp: new Date().toISOString(),
        keywords: prioritizedKeywords,
        count: prioritizedKeywords.length,
        topKeywords: prioritizedKeywords.slice(0, 10),
        stats: this.calculateReportStats(prioritizedKeywords)
      };

      this.logger.info(`✅ Found ${prioritizedKeywords.length} qualified keywords`);

      return report;

    } catch (error) {
      this.logger.error('Keyword research failed:', error);
      throw error;
    }
  }

  /**
   * Generate seed keywords using AI
   */
  async generateSeedKeywords(topic) {
    try {
      const prompt = `Generate a list of 20 seed keywords for the topic: "${topic}"

Requirements:
- Include the main topic keyword
- Add common variations
- Include long-tail variations
- Mix informational and commercial intent
- Use scholarly/academic language where appropriate

Format: Return as a simple comma-separated list of keywords.`;

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const text = response.content[0].text;
      const keywords = text
        .split(/[,\n]+/)
        .map(kw => kw.trim().toLowerCase())
        .filter(kw => kw.length > 0);

      return [...new Set(keywords)]; // Remove duplicates

    } catch (error) {
      this.logger.error('Seed keyword generation failed:', error);
      // Fallback to basic keywords
      return [
        topic.toLowerCase(),
        `${topic} research`,
        `${topic} study`,
        `understanding ${topic}`,
        `what is ${topic}`
      ];
    }
  }

  /**
   * Expand keywords with variations
   */
  async expandKeywords(seedKeywords, topic) {
    const expanded = new Set(seedKeywords);

    // Add modifier variations
    for (const seed of seedKeywords.slice(0, 5)) { // Only expand top 5 to avoid explosion
      for (const modifier of SCHOLARLY_KEYWORDS.modifiers.slice(0, 10)) {
        expanded.add(`${seed} ${modifier}`);
        expanded.add(`${modifier} ${seed}`);
      }

      // Add question variations
      for (const question of SCHOLARLY_KEYWORDS.questionWords.slice(0, 5)) {
        if (!seed.includes(question)) {
          expanded.add(`${question} ${seed}`);
        }
      }
    }

    return Array.from(expanded);
  }

  /**
   * Add simulated keyword metrics
   * In production, this would call Ahrefs/SEMrush API
   */
  addKeywordMetrics(keywords) {
    return keywords.map(keyword => {
      // Simulate realistic metrics based on keyword characteristics
      const wordCount = keyword.split(' ').length;
      const hasQuestion = SCHOLARLY_KEYWORDS.questionWords.some(q =>
        keyword.includes(q)
      );

      // Long-tail keywords typically have lower volume and difficulty
      const baseVolume = wordCount === 1 ? 5000 : wordCount === 2 ? 1500 : 500;
      const baseDifficulty = wordCount === 1 ? 60 : wordCount === 2 ? 40 : 25;

      // Questions typically have higher intent and lower difficulty
      const volumeMultiplier = hasQuestion ? 1.5 : 1.0;
      const difficultyModifier = hasQuestion ? -10 : 0;

      return {
        keyword: keyword,
        searchVolume: Math.round(baseVolume * volumeMultiplier * (0.7 + Math.random() * 0.6)),
        difficulty: Math.max(5, Math.min(100, baseDifficulty + difficultyModifier + (Math.random() * 20 - 10))),
        cpc: parseFloat((0.5 + Math.random() * 2.5).toFixed(2)),
        competition: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
        intent: this.determineIntent(keyword),
        wordCount: wordCount,
        trend: Math.random() > 0.5 ? 'rising' : Math.random() > 0.5 ? 'stable' : 'declining'
      };
    });
  }

  /**
   * Determine keyword intent
   */
  determineIntent(keyword) {
    const lower = keyword.toLowerCase();

    // Transactional
    if (/buy|purchase|order|price|cost|cheap|discount|deal/.test(lower)) {
      return 'transactional';
    }

    // Commercial
    if (/best|top|review|comparison|vs|versus|alternative/.test(lower)) {
      return 'commercial';
    }

    // Navigational
    if (/login|sign in|website|official|homepage/.test(lower)) {
      return 'navigational';
    }

    // Informational (default)
    return 'informational';
  }

  /**
   * Filter keywords by quality criteria
   */
  filterKeywords(keywords) {
    const config = SEO_CONFIG.keywordResearch;

    return keywords.filter(kw => {
      return (
        kw.searchVolume >= config.minSearchVolume &&
        kw.searchVolume <= config.maxSearchVolume &&
        kw.difficulty <= config.maxKeywordDifficulty &&
        kw.cpc >= config.minCPC &&
        kw.keyword.length >= 3 &&
        kw.keyword.length <= 100
      );
    });
  }

  /**
   * Prioritize keywords by opportunity score
   */
  prioritizeKeywords(keywords) {
    // Calculate opportunity score for each keyword
    const scored = keywords.map(kw => {
      // Opportunity = (Volume / Difficulty) * CPC
      // Higher is better
      const opportunityScore = (kw.searchVolume / Math.max(kw.difficulty, 1)) * kw.cpc;

      // Bonus for informational intent (matches our content)
      const intentBonus = kw.intent === 'informational' ? 1.5 : 1.0;

      // Bonus for rising trends
      const trendBonus = kw.trend === 'rising' ? 1.3 : kw.trend === 'stable' ? 1.0 : 0.8;

      return {
        ...kw,
        opportunityScore: opportunityScore * intentBonus * trendBonus,
        priority: this.calculatePriority(kw)
      };
    });

    // Sort by opportunity score (descending)
    return scored.sort((a, b) => b.opportunityScore - a.opportunityScore);
  }

  /**
   * Calculate keyword priority (high, medium, low)
   */
  calculatePriority(kw) {
    if (kw.searchVolume > 2000 && kw.difficulty < 40) {
      return 'high';
    } else if (kw.searchVolume > 500 && kw.difficulty < 60) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Get keyword suggestions for content
   */
  async getKeywordSuggestions(topic, count = 5) {
    // If we have cached keywords for this topic, return them
    const cached = Array.from(this.keywords.values())
      .filter(kw => kw.keyword.toLowerCase().includes(topic.toLowerCase()))
      .sort((a, b) => b.opportunityScore - a.opportunityScore)
      .slice(0, count);

    if (cached.length >= count) {
      return cached;
    }

    // Otherwise, do fresh research
    const report = await this.researchKeywords(topic);
    return report.topKeywords.slice(0, count);
  }

  /**
   * Find related keywords
   */
  async findRelatedKeywords(keyword, count = 10) {
    try {
      const prompt = `For the keyword "${keyword}", suggest ${count} related keywords that:
- Are semantically related
- Cover different aspects or angles
- Include variations and synonyms
- Are suitable for scholarly/academic content

Return as a comma-separated list.`;

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const text = response.content[0].text;
      const related = text
        .split(/[,\n]+/)
        .map(kw => kw.trim().toLowerCase())
        .filter(kw => kw.length > 0)
        .slice(0, count);

      return related;

    } catch (error) {
      return [];
    }
  }

  /**
   * Analyze keyword competition
   */
  analyzeCompetition(keyword) {
    // Simulated competition analysis
    // In production, this would analyze actual SERP results

    const difficulty = this.keywords.get(keyword)?.difficulty || 50;

    return {
      keyword: keyword,
      difficulty: difficulty,
      competition: difficulty > 70 ? 'very high' :
                   difficulty > 50 ? 'high' :
                   difficulty > 30 ? 'medium' :
                   'low',
      topCompetitors: [
        { domain: 'example.com', position: 1, da: 75 },
        { domain: 'scholar.edu', position: 2, da: 85 },
        { domain: 'research.org', position: 3, da: 70 }
      ],
      avgContentLength: 1500 + Math.round(Math.random() * 1000),
      avgBacklinks: Math.round(50 + Math.random() * 200),
      recommendation: difficulty < 40 ? 'Target this keyword - good opportunity' :
                     difficulty < 60 ? 'Moderate difficulty - requires quality content' :
                     'High difficulty - need strong backlinks and authority'
    };
  }

  /**
   * Calculate report statistics
   */
  calculateReportStats(keywords) {
    if (keywords.length === 0) {
      return { avgVolume: 0, avgDifficulty: 0, avgCPC: 0 };
    }

    const total = keywords.reduce((acc, kw) => {
      acc.volume += kw.searchVolume;
      acc.difficulty += kw.difficulty;
      acc.cpc += kw.cpc;
      return acc;
    }, { volume: 0, difficulty: 0, cpc: 0 });

    return {
      avgVolume: Math.round(total.volume / keywords.length),
      avgDifficulty: Math.round(total.difficulty / keywords.length),
      avgCPC: parseFloat((total.cpc / keywords.length).toFixed(2)),
      totalVolume: total.volume,
      highPriority: keywords.filter(kw => kw.priority === 'high').length,
      mediumPriority: keywords.filter(kw => kw.priority === 'medium').length,
      lowPriority: keywords.filter(kw => kw.priority === 'low').length
    };
  }

  /**
   * Update statistics
   */
  updateStatistics(keywords) {
    this.stats.keywordsDiscovered += keywords.length;
    this.stats.keywordsAnalyzed += keywords.length;

    if (keywords.length > 0) {
      const stats = this.calculateReportStats(keywords);
      this.stats.avgSearchVolume = stats.avgVolume;
      this.stats.avgDifficulty = stats.avgDifficulty;
    }
  }

  /**
   * Get keyword statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      totalKeywords: this.keywords.size,
      recentKeywords: this.keywordHistory.slice(-20)
    };
  }

  /**
   * Get all keywords
   */
  getAllKeywords() {
    return Array.from(this.keywords.values());
  }

  /**
   * Export keywords to CSV (simulated)
   */
  exportKeywords(format = 'csv') {
    const keywords = this.getAllKeywords();

    if (format === 'csv') {
      const headers = 'Keyword,Search Volume,Difficulty,CPC,Competition,Intent,Priority,Opportunity Score\n';
      const rows = keywords.map(kw =>
        `"${kw.keyword}",${kw.searchVolume},${kw.difficulty},${kw.cpc},${kw.competition},${kw.intent},${kw.priority},${kw.opportunityScore.toFixed(2)}`
      ).join('\n');

      return headers + rows;
    }

    return JSON.stringify(keywords, null, 2);
  }
}
